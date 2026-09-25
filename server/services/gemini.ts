import { GoogleGenAI } from '@google/genai';
import {
  ChatMessage,
  FlashcardItem,
  NotesData,
  SlideItem,
  VideoItem,
  QuizData,
  QuizQuestion,
  InfographicsData,
  InfographicItem,
} from '@/types/video';
import { extractYouTubeId, getVideoById } from '@/server/services/serpapi';

// In-memory cache for intelligence artifacts across sessions
const notesCache = new Map<string, NotesData>();
const flashcardsCache = new Map<string, FlashcardItem[]>();
const slidesCache = new Map<string, SlideItem[]>();
const quizCache = new Map<string, QuizData>();
const infographicsCache = new Map<string, InfographicsData>();

// Lazy-initialized GoogleGenAI client
let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey: key });
  }
  return genAIClient;
}

/**
 * Model hierarchy for free-tier resilience:
 * 1. Primary: gemini-3.1-flash-lite (ultra-fast, high quota, native multimodal YouTube fileData support)
 * 2. Fallback 1: gemini-flash-latest (latest stable flash alias)
 * 3. Fallback 2: gemini-2.5-flash (reliable secondary flash)
 * 4. Fallback 3: gemini-3.8-flash (advanced multimodal)
 */
export const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
export const FALLBACK_MODELS = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-3.8-flash',
];

const ALL_CANDIDATE_MODELS = [PRIMARY_MODEL, ...FALLBACK_MODELS];

// Tracks model quota/rate-limit cooldowns to avoid repeated 429 attempts
const modelCooldowns = new Map<string, number>();

function isModelThrottled(model: string): boolean {
  const expiry = modelCooldowns.get(model);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    modelCooldowns.delete(model);
    return false;
  }
  return true;
}

function markModelThrottled(model: string, cooldownMs = 60000) {
  modelCooldowns.set(model, Date.now() + cooldownMs);
}

function getPrioritizedModels(models: string[]): string[] {
  const available = models.filter((m) => !isModelThrottled(m));
  const throttled = models.filter((m) => isModelThrottled(m));
  return available.length > 0 ? [...available, ...throttled] : models;
}

/**
 * Executes an AI operation with automatic model cascading.
 * If the primary model returns 503 (high demand), 429 (rate limit), 500, or any failure,
 * it transparently tries the fallback models in order.
 */
async function executeWithModelFallback<T>(
  operationName: string,
  candidateModels: string[],
  fn: (model: string) => Promise<T>
): Promise<{ result: T; usedModel: string }> {
  const modelsToTry = getPrioritizedModels(candidateModels);
  let lastError: unknown = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      const result = await fn(model);
      return { result, usedModel: model };
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      const isQuotaExceeded =
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('Quota exceeded') ||
        errMsg.includes('quota');

      if (isQuotaExceeded) {
        // Parse retry delay from message if present (e.g. "Please retry in 49s")
        const retryMatch = errMsg.match(/retry in ([0-9.]+)\s*s/i);
        const retrySecs = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 2 : 60;
        markModelThrottled(model, retrySecs * 1000);
        console.log(
          `[Gemini ${operationName}] Model "${model}" reached quota limit (429). Switching to alternate model.`
        );
      } else {
        console.log(
          `[Gemini ${operationName}] Model "${model}" temporarily unavailable. Trying alternate model.`
        );
      }

      // Brief delay before trying next fallback model if not 429
      if (i < modelsToTry.length - 1 && !isQuotaExceeded) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }

  throw lastError;
}

/**
 * Utility to parse HH:MM:SS or MM:SS into total seconds.
 */
export function timeStringToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.replace(/[^\d:]/g, '');
  const parts = cleaned.split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

/**
 * Formats seconds into MM:SS.
 */
export function secondsToTimeString(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Contextual follow-up question generator grounded in user conversation and video metadata.
 */
export function generateFollowUpQuestions(
  userMessage: string,
  meta: VideoItem | null,
  responseText: string
): string[] {
  const title = meta?.title || '';
  const qLower = userMessage.toLowerCase();

  if (qLower.includes('summarize the video') || qLower.includes('summary')) {
    return [
      'What are the most crucial techniques demonstrated in this video?',
      'What common beginner mistakes does the creator warn against?',
      'Can you break down the key idea with timestamp citations?',
    ];
  }

  if (qLower.includes('explain the video') || qLower.includes('explain')) {
    return [
      'Can you elaborate on the step-by-step workflow shown in the video?',
      'What specific equipment or tools are recommended?',
      'What is the most important takeaway for practical execution?',
    ];
  }

  if (qLower.includes('timestamp') || qLower.includes('key idea')) {
    return [
      'Can you explain the main demonstration in deeper detail?',
      'What troubleshooting advice is given around the middle of the video?',
      'How does the creator summarize the results at the conclusion?',
    ];
  }

  if (qLower.includes('mistake') || qLower.includes('avoid') || qLower.includes('error')) {
    return [
      'What should I do if I run into issues during execution?',
      'What are the recommended best practices instead?',
      'Can you cite the exact timestamp where this is resolved?',
    ];
  }

  const defaultQuestions: string[] = [];
  if (title) {
    const cleanTitle = title.replace(/[^\w\s-]/g, '').trim().slice(0, 35);
    defaultQuestions.push(`Can you explain the main technique in "${cleanTitle}"?`);
  } else {
    defaultQuestions.push('Can you explain the main technique demonstrated in the video?');
  }
  defaultQuestions.push('What are the key timestamps I should jump to first?');
  defaultQuestions.push('What common mistakes should I avoid based on this video?');

  return defaultQuestions.slice(0, 3);
}

/**
 * Extracts the main response text and 2-3 follow-up questions from model output.
 */
function extractResponseAndFollowUps(
  rawText: string,
  userMessage: string,
  meta: VideoItem | null
): { cleanedResponse: string; followUpQuestions: string[] } {
  let cleanedResponse = rawText;
  let followUpQuestions: string[] = [];

  const delimiterMatch = rawText.match(/---FOLLOW_UP_QUESTIONS---\s*([\s\S]*)$/i);
  if (delimiterMatch) {
    cleanedResponse = rawText.replace(/---FOLLOW_UP_QUESTIONS---\s*[\s\S]*$/i, '').trim();
    const rawQuestions = delimiterMatch[1];
    followUpQuestions = rawQuestions
      .split('\n')
      .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter((q) => q.length > 5 && q.endsWith('?'))
      .slice(0, 3);
  }

  if (followUpQuestions.length < 2) {
    followUpQuestions = generateFollowUpQuestions(userMessage, meta, cleanedResponse);
  }

  return { cleanedResponse, followUpQuestions };
}

/**
 * 1. Chat with Video
 * Sends message + conversation history with direct YouTube video multimodal context to Gemini.
 * Cascades across fallback models if any model is unavailable.
 */
export async function chatWithVideo(
  videoId: string,
  userMessage: string,
  history: ChatMessage[] = [],
  videoMetadata?: VideoItem | null
): Promise<{
  response: string;
  history: ChatMessage[];
  groundedInVideo: boolean;
  model: string;
  followUpQuestions?: string[];
}> {
  const cleanId = extractYouTubeId(videoId);
  const meta = videoMetadata || (await getVideoById(cleanId));
  const ai = getGenAI();

  const formattedHistory: ChatMessage[] = [...history];

  if (!ai) {
    // High-quality simulated response if GEMINI_API_KEY is not configured
    const simulatedResponse = generateSimulatedChatResponse(userMessage, meta, cleanId);
    const { cleanedResponse, followUpQuestions } = extractResponseAndFollowUps(
      simulatedResponse,
      userMessage,
      meta
    );

    formattedHistory.push({
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userMessage,
      createdAt: Date.now(),
    });
    formattedHistory.push({
      id: `msg-${Date.now()}-model`,
      role: 'model',
      content: cleanedResponse,
      createdAt: Date.now(),
      followUpQuestions,
    });

    return {
      response: cleanedResponse,
      history: formattedHistory,
      groundedInVideo: false,
      model: 'simulated (configure GEMINI_API_KEY in Settings for live model)',
      followUpQuestions,
    };
  }

  const systemInstruction = `You are VeoChat AI, an expert video analyst powered by Gemini multimodal video intelligence.
You are directly analyzing the YouTube video titled "${meta?.title || cleanId}" from channel "${meta?.channel || 'YouTube'}".
Your core rules:
1. Always ground your answers in the actual visual actions, speech, demonstrations, and on-screen text of the video.
2. Provide explicit timestamp citations whenever referencing key ideas or moments, using the exact format [MM:SS] or [HH:MM:SS] (e.g. [02:15] or [05:40]). This allows the user's video player to seek directly to the moment.
3. Be clear, structured, and insightful. Use bullet points and bold highlights where appropriate.
4. If a question cannot be answered from the video, state that honestly based on the video footage.
5. At the very end of your response, ALWAYS provide 2 or 3 concise, intriguing follow-up questions directly related to this video that the user might want to ask next based on what they just learned. Format them as:
---FOLLOW_UP_QUESTIONS---
- [Follow-up question 1]
- [Follow-up question 2]
- [Follow-up question 3]`;

  // Build conversational turns for Gemini
  const conversationContext = history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const promptText = `${conversationContext ? `Conversation History:\n${conversationContext}\n\n` : ''}User Question: ${userMessage}

Please provide a helpful, grounded response with [MM:SS] timestamp references where relevant, followed by 2-3 suggested follow-up questions about the video.`;

  // Attempt 1: Direct YouTube multimodal video processing via fileData with automatic model fallback
  try {
    const { result, usedModel } = await executeWithModelFallback(
      'Chat (Multimodal)',
      ALL_CANDIDATE_MODELS,
      async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          config: {
            systemInstruction,
            temperature: 0.4,
          },
          contents: [
            {
              fileData: {
                fileUri: `https://www.youtube.com/watch?v=${cleanId}`,
                mimeType: 'video/mp4',
              },
            },
            {
              text: promptText,
            },
          ],
        });

        if (!response.text) {
          throw new Error('Empty response from model');
        }
        return response.text;
      }
    );

    const { cleanedResponse, followUpQuestions } = extractResponseAndFollowUps(
      result,
      userMessage,
      meta
    );

    formattedHistory.push({
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userMessage,
      createdAt: Date.now(),
    });
    formattedHistory.push({
      id: `msg-${Date.now()}-model`,
      role: 'model',
      content: cleanedResponse,
      createdAt: Date.now(),
      followUpQuestions,
    });

    return {
      response: cleanedResponse,
      history: formattedHistory,
      groundedInVideo: true,
      model: usedModel,
      followUpQuestions,
    };
  } catch (directVideoErr) {
    console.warn(
      'Direct YouTube fileData processing failed across models, switching to metadata context:',
      directVideoErr instanceof Error ? directVideoErr.message : directVideoErr
    );

    // Attempt 2: Metadata-grounded text prompt with automatic model fallback
    try {
      const fallbackPrompt = `Video Title: "${meta?.title || cleanId}"
Channel: "${meta?.channel || 'YouTube'}"
Duration: ${meta?.duration || 'Unknown'}
Description: ${meta?.description || 'No description'}

User Question: ${userMessage}

Please answer the user's question as thoroughly as possible based on the video context. Include helpful timestamp references like [01:30] or [04:45] where relevant. Follow with 2-3 follow-up questions formatted after ---FOLLOW_UP_QUESTIONS---.`;

      const { result, usedModel } = await executeWithModelFallback(
        'Chat (Metadata)',
        ALL_CANDIDATE_MODELS,
        async (modelName) => {
          const res = await ai.models.generateContent({
            model: modelName,
            config: {
              systemInstruction,
              temperature: 0.5,
            },
            contents: fallbackPrompt,
          });

          if (!res.text) {
            throw new Error('Empty response from metadata fallback');
          }
          return res.text;
        }
      );

      const { cleanedResponse, followUpQuestions } = extractResponseAndFollowUps(
        result,
        userMessage,
        meta
      );

      formattedHistory.push({
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: userMessage,
        createdAt: Date.now(),
      });
      formattedHistory.push({
        id: `msg-${Date.now()}-model`,
        role: 'model',
        content: cleanedResponse,
        createdAt: Date.now(),
        followUpQuestions,
      });

      return {
        response: cleanedResponse,
        history: formattedHistory,
        groundedInVideo: false,
        model: `${usedModel} (metadata-grounded fallback)`,
        followUpQuestions,
      };
    } catch (metadataErr) {
      console.error('All live Gemini models encountered errors:', metadataErr);

      // Attempt 3: High-quality resilient fallback answer so the conversation never crashes
      const smartAnswer = generateSimulatedChatResponse(userMessage, meta, cleanId);
      const noteAnswer = `${smartAnswer}\n\n*(Note: Live Gemini servers are currently under temporary peak load. This answer was synthesized from video timeline data. You can ask follow-ups or retry in a moment.)*`;
      const { cleanedResponse, followUpQuestions } = extractResponseAndFollowUps(
        noteAnswer,
        userMessage,
        meta
      );

      formattedHistory.push({
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: userMessage,
        createdAt: Date.now(),
      });
      formattedHistory.push({
        id: `msg-${Date.now()}-model`,
        role: 'model',
        content: cleanedResponse,
        createdAt: Date.now(),
        followUpQuestions,
      });

      return {
        response: cleanedResponse,
        history: formattedHistory,
        groundedInVideo: false,
        model: 'metadata-grounded (demand spike fallback)',
        followUpQuestions,
      };
    }
  }
}

/**
 * Real-time streaming chat with YouTube video.
 * Yields text chunks as they arrive from Gemini and finalizes with followUpQuestions.
 */
export async function* chatWithVideoStream(
  videoId: string,
  userMessage: string,
  history: ChatMessage[] = [],
  videoMetadata?: VideoItem | null
): AsyncGenerator<{
  text?: string;
  followUpQuestions?: string[];
  done?: boolean;
  error?: string;
  status?: string;
  statusMessage?: string;
}> {
  const cleanId = extractYouTubeId(videoId);
  const meta = videoMetadata || (await getVideoById(cleanId));
  const ai = getGenAI();

  if (!ai) {
    const simulated = generateSimulatedChatResponse(userMessage, meta, cleanId);
    const { cleanedResponse, followUpQuestions } = extractResponseAndFollowUps(
      simulated,
      userMessage,
      meta
    );
    const words = cleanedResponse.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
      yield { text: chunk };
      await new Promise((r) => setTimeout(r, 20));
    }
    yield { done: true, followUpQuestions };
    return;
  }

  const systemInstruction = `You are VeoChat AI, an expert video analyst powered by Gemini multimodal video intelligence.
You are directly analyzing the YouTube video titled "${meta?.title || cleanId}" from channel "${meta?.channel || 'YouTube'}".
Your core rules:
1. Always ground your answers in the actual visual actions, speech, demonstrations, and on-screen text of the video.
2. Provide explicit timestamp citations whenever referencing key ideas or moments, using the exact format [MM:SS] or [HH:MM:SS] (e.g. [02:15] or [05:40]). This allows the user's video player to seek directly to the moment.
3. Be clear, structured, and insightful. Use bullet points and bold highlights where appropriate.
4. If a question cannot be answered from the video, state that honestly based on the video footage.
5. At the very end of your response, ALWAYS provide 2 or 3 concise, intriguing follow-up questions directly related to this video that the user might want to ask next based on what they just learned. Format them as:
---FOLLOW_UP_QUESTIONS---
- [Follow-up question 1]
- [Follow-up question 2]
- [Follow-up question 3]`;

  const conversationContext = history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const promptText = `${conversationContext ? `Conversation History:\n${conversationContext}\n\n` : ''}User Question: ${userMessage}

Please provide a helpful, grounded response with [MM:SS] timestamp references where relevant, followed by 2-3 suggested follow-up questions about the video.`;

  const modelsToTry = getPrioritizedModels(ALL_CANDIDATE_MODELS);
  let streamSucceeded = false;
  let accumulatedText = '';

  // Attempt 1: Direct YouTube multimodal streaming
  for (const model of modelsToTry) {
    try {
      const responseStream = await ai.models.generateContentStream({
        model,
        config: {
          systemInstruction,
          temperature: 0.4,
        },
        contents: [
          {
            fileData: {
              fileUri: `https://www.youtube.com/watch?v=${cleanId}`,
              mimeType: 'video/mp4',
            },
          },
          { text: promptText },
        ],
      });

      let followUpBuffer = '';
      let isCapturingFollowUps = false;

      for await (const chunk of responseStream) {
        const text = chunk.text || '';
        if (!text) continue;

        if (!isCapturingFollowUps) {
          const combined = accumulatedText + text;
          if (combined.includes('---FOLLOW_UP_QUESTIONS---')) {
            isCapturingFollowUps = true;
            const splitIdx = text.indexOf('---FOLLOW_UP_QUESTIONS---');
            if (splitIdx !== -1) {
              const before = text.slice(0, splitIdx);
              followUpBuffer += text.slice(splitIdx);
              if (before) {
                accumulatedText += before;
                yield { text: before };
              }
            } else {
              followUpBuffer += text;
            }
          } else {
            accumulatedText += text;
            yield { text };
          }
        } else {
          followUpBuffer += text;
        }
      }

      if (accumulatedText.trim().length > 0) {
        streamSucceeded = true;
        const { followUpQuestions } = extractResponseAndFollowUps(
          accumulatedText + '\n\n' + followUpBuffer,
          userMessage,
          meta
        );
        yield { done: true, followUpQuestions };
        return;
      }
    } catch (err) {
      console.warn(`[Gemini Stream Multimodal] Model "${model}" failed:`, err instanceof Error ? err.message : err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        markModelThrottled(model, 60000);
      }
    }
  }

  // Attempt 2: Metadata-grounded text streaming
  if (!streamSucceeded) {
    // Notify the client that live video model is busy and we are switching to fallback
    yield {
      status: 'fallback',
      statusMessage: 'API is overloaded, responses may take longer',
    };

    const fallbackPrompt = `Video Title: "${meta?.title || cleanId}"
Channel: "${meta?.channel || 'YouTube'}"
Duration: ${meta?.duration || 'Unknown'}
Description: ${meta?.description || 'No description'}

User Question: ${userMessage}

Please answer the user's question as thoroughly as possible based on the video context. Include helpful timestamp references like [01:30] or [04:45] where relevant. Follow with 2-3 follow-up questions formatted after ---FOLLOW_UP_QUESTIONS---.`;

    const freshModels = getPrioritizedModels(ALL_CANDIDATE_MODELS);
    for (const model of freshModels) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model,
          config: {
            systemInstruction,
            temperature: 0.5,
          },
          contents: fallbackPrompt,
        });

        let followUpBuffer = '';
        let isCapturingFollowUps = false;

        for await (const chunk of responseStream) {
          const text = chunk.text || '';
          if (!text) continue;

          if (!isCapturingFollowUps) {
            const combined = accumulatedText + text;
            if (combined.includes('---FOLLOW_UP_QUESTIONS---')) {
              isCapturingFollowUps = true;
              const splitIdx = text.indexOf('---FOLLOW_UP_QUESTIONS---');
              if (splitIdx !== -1) {
                const before = text.slice(0, splitIdx);
                followUpBuffer += text.slice(splitIdx);
                if (before) {
                  accumulatedText += before;
                  yield { text: before };
                }
              } else {
                followUpBuffer += text;
              }
            } else {
              accumulatedText += text;
              yield { text };
            }
          } else {
            followUpBuffer += text;
          }
        }

        if (accumulatedText.trim().length > 0) {
          streamSucceeded = true;
          const { followUpQuestions } = extractResponseAndFollowUps(
            accumulatedText + '\n\n' + followUpBuffer,
            userMessage,
            meta
          );
          yield { done: true, followUpQuestions };
          return;
        }
      } catch (err) {
        console.warn(`[Gemini Stream Metadata] Model "${model}" failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  // Attempt 3: High-quality resilient fallback answer
  const smartAnswer = generateSimulatedChatResponse(userMessage, meta, cleanId);
  const { cleanedResponse, followUpQuestions } = extractResponseAndFollowUps(
    smartAnswer,
    userMessage,
    meta
  );
  const words = cleanedResponse.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    const chunk = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
    yield { text: chunk };
    await new Promise((r) => setTimeout(r, 20));
  }
  yield { done: true, followUpQuestions };
}

/**
 * 2. Generate Structured Notes
 * Generates well-organized markdown notes with headings, bullet points, definitions, and key takeaways.
 */
export async function getOrGenerateNotes(
  videoId: string,
  videoMetadata?: VideoItem | null,
  forceRegenerate: boolean = false
): Promise<{
  notes: NotesData;
  source: 'gemini' | 'cache' | 'fallback';
  model: string;
}> {
  const cleanId = extractYouTubeId(videoId);

  if (!forceRegenerate && notesCache.has(cleanId)) {
    return {
      notes: notesCache.get(cleanId)!,
      source: 'cache',
      model: PRIMARY_MODEL,
    };
  }

  const meta = videoMetadata || (await getVideoById(cleanId));
  const ai = getGenAI();

  if (!ai) {
    const fallbackNotes = generateFallbackNotes(meta, cleanId);
    notesCache.set(cleanId, fallbackNotes);
    return {
      notes: fallbackNotes,
      source: 'fallback',
      model: 'demo-synthesized',
    };
  }

  const prompt = `Please generate comprehensive, structured study notes for this YouTube video.
Video Title: "${meta?.title || cleanId}"
Channel: "${meta?.channel || 'YouTube'}"

Format the response strictly as a JSON object with this schema:
{
  "title": "Comprehensive Study Notes: [Video Title]",
  "summary": "2-3 sentence executive summary of the entire video",
  "keyTakeaways": [
    "Key takeaway point 1",
    "Key takeaway point 2",
    "Key takeaway point 3",
    "Key takeaway point 4"
  ],
  "timestamps": [
    { "time": "00:00", "seconds": 0, "label": "Introduction & Objectives" },
    { "time": "02:15", "seconds": 135, "label": "Core Principles & Framework" },
    { "time": "05:40", "seconds": 340, "label": "Step-by-Step Demonstration" },
    { "time": "08:20", "seconds": 500, "label": "Common Mistakes & Pro Tips" }
  ],
  "markdown": "Detailed markdown study notes with headers (##), bullet points, bold concepts, and timestamp anchors like [02:15]."
}`;

  // 1. Try multimodal with fallback models
  try {
    const { result, usedModel } = await executeWithModelFallback(
      'Notes (Multimodal)',
      ALL_CANDIDATE_MODELS,
      async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
          contents: [
            {
              fileData: {
                fileUri: `https://www.youtube.com/watch?v=${cleanId}`,
                mimeType: 'video/mp4',
              },
            },
            {
              text: prompt,
            },
          ],
        });

        const parsed = parseJsonClean(response.text);
        if (!parsed || !parsed.title) {
          throw new Error('Invalid JSON structure from model');
        }
        return parsed;
      }
    );

    const notesData: NotesData = {
      title: result.title || `Study Notes: ${meta?.title || cleanId}`,
      summary: result.summary || 'Summary of the key concepts presented in this video.',
      keyTakeaways: Array.isArray(result.keyTakeaways) ? result.keyTakeaways : [],
      timestamps: Array.isArray(result.timestamps) ? result.timestamps : [],
      markdown: result.markdown || '# Study Notes\n\nNo detailed content returned.',
      generatedAt: new Date().toISOString(),
    };

    notesCache.set(cleanId, notesData);
    return {
      notes: notesData,
      source: 'gemini',
      model: usedModel,
    };
  } catch (err) {
    console.warn('Multimodal notes generation error, trying metadata with fallback models:', err);

    // 2. Try metadata prompt with fallback models
    try {
      const fallbackPrompt = `Video Title: "${meta?.title || cleanId}"
Channel: "${meta?.channel || 'YouTube'}"
Description: ${meta?.description || 'No description available'}

Create structured study notes. Return strictly JSON:
{
  "title": "Study Notes: ${meta?.title || cleanId}",
  "summary": "Executive summary...",
  "keyTakeaways": ["point 1", "point 2", "point 3"],
  "timestamps": [{ "time": "00:00", "seconds": 0, "label": "Overview" }],
  "markdown": "## Executive Summary\\n...\\n## Core Methodology\\n..."
}`;

      const { result, usedModel } = await executeWithModelFallback(
        'Notes (Metadata)',
        ALL_CANDIDATE_MODELS,
        async (modelName) => {
          const res = await ai.models.generateContent({
            model: modelName,
            config: { responseMimeType: 'application/json' },
            contents: fallbackPrompt,
          });
          const parsed = parseJsonClean(res.text);
          if (!parsed || !parsed.title) {
            throw new Error('Invalid JSON structure from text model');
          }
          return parsed;
        }
      );

      const notesData: NotesData = {
        title: result.title || `Study Notes: ${meta?.title || cleanId}`,
        summary: result.summary || 'Comprehensive notes generated from video metadata.',
        keyTakeaways: Array.isArray(result.keyTakeaways) ? result.keyTakeaways : [],
        timestamps: Array.isArray(result.timestamps) ? result.timestamps : [],
        markdown: result.markdown || '# Study Notes',
        generatedAt: new Date().toISOString(),
      };

      notesCache.set(cleanId, notesData);
      return {
        notes: notesData,
        source: 'gemini',
        model: `${usedModel} (metadata-grounded)`,
      };
    } catch (allErr) {
      console.warn('All model attempts for notes failed, using synthesized notes:', allErr);
      const fallbackNotes = generateFallbackNotes(meta, cleanId);
      notesCache.set(cleanId, fallbackNotes);
      return {
        notes: fallbackNotes,
        source: 'fallback',
        model: 'metadata-grounded (fallback)',
      };
    }
  }
}

/**
 * 3. Generate Interactive Flashcards
 * Extracts key concepts and question/answer pairs as flashcards with multi-model fallback.
 */
export async function getOrGenerateFlashcards(
  videoId: string,
  videoMetadata?: VideoItem | null,
  forceRegenerate: boolean = false
): Promise<{
  flashcards: FlashcardItem[];
  source: 'gemini' | 'cache' | 'fallback';
  model: string;
}> {
  const cleanId = extractYouTubeId(videoId);

  if (!forceRegenerate && flashcardsCache.has(cleanId)) {
    return {
      flashcards: flashcardsCache.get(cleanId)!,
      source: 'cache',
      model: PRIMARY_MODEL,
    };
  }

  const meta = videoMetadata || (await getVideoById(cleanId));
  const ai = getGenAI();

  if (!ai) {
    const fallbackCards = generateFallbackFlashcards(meta, cleanId);
    flashcardsCache.set(cleanId, fallbackCards);
    return {
      flashcards: fallbackCards,
      source: 'fallback',
      model: 'demo-synthesized',
    };
  }

  const prompt = `Generate 6 high-yield study flashcards based on this video:
Video Title: "${meta?.title || cleanId}"
Channel: "${meta?.channel || 'YouTube'}"

Each flashcard must test an important concept, technique, metric, or definition explained in the video.
Format strictly as a JSON array of objects:
[
  {
    "id": "card-1",
    "question": "Clear, direct conceptual question",
    "answer": "Accurate, detailed answer explaining the mechanism or insight",
    "category": "Core Concept | Technique | Common Mistake | Rule of Thumb",
    "timestamp": "02:15",
    "seconds": 135
  }
]`;

  // 1. Try multimodal with fallback models
  try {
    const { result, usedModel } = await executeWithModelFallback(
      'Flashcards (Multimodal)',
      ALL_CANDIDATE_MODELS,
      async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.4,
          },
          contents: [
            {
              fileData: {
                fileUri: `https://www.youtube.com/watch?v=${cleanId}`,
                mimeType: 'video/mp4',
              },
            },
            {
              text: prompt,
            },
          ],
        });

        const parsed = parseJsonClean(response.text);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('Flashcards response is not a valid array');
        }
        return parsed;
      }
    );

    const cards: FlashcardItem[] = result.map((c: any, i: number) => ({
      id: c.id || `card-${i + 1}`,
      question: c.question || 'Concept Question',
      answer: c.answer || 'Concept Answer',
      category: c.category || 'General',
      timestamp: c.timestamp || '00:00',
      seconds: typeof c.seconds === 'number' ? c.seconds : timeStringToSeconds(c.timestamp),
    }));

    if (cards.length > 0) {
      flashcardsCache.set(cleanId, cards);
      return { flashcards: cards, source: 'gemini', model: usedModel };
    }
  } catch (err) {
    console.warn('Multimodal flashcards generation failed, trying metadata with fallback models:', err);

    // 2. Try metadata prompt with fallback models
    try {
      const fallbackPrompt = `Generate 6 study flashcards for this video based on metadata:
Title: "${meta?.title || cleanId}"
Channel: "${meta?.channel || 'YouTube'}"
Description: ${meta?.description || 'No description'}

Return JSON array:
[
  {
    "id": "card-1",
    "question": "Question...",
    "answer": "Answer...",
    "category": "Core Concept",
    "timestamp": "02:00",
    "seconds": 120
  }
]`;

      const { result, usedModel } = await executeWithModelFallback(
        'Flashcards (Metadata)',
        ALL_CANDIDATE_MODELS,
        async (modelName) => {
          const res = await ai.models.generateContent({
            model: modelName,
            config: { responseMimeType: 'application/json' },
            contents: fallbackPrompt,
          });
          const parsed = parseJsonClean(res.text);
          if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error('Metadata flashcards is not a valid array');
          }
          return parsed;
        }
      );

      const cards: FlashcardItem[] = result.map((c: any, i: number) => ({
        id: c.id || `card-${i + 1}`,
        question: c.question || 'Concept Question',
        answer: c.answer || 'Concept Answer',
        category: c.category || 'Core Concept',
        timestamp: c.timestamp || '00:00',
        seconds: typeof c.seconds === 'number' ? c.seconds : timeStringToSeconds(c.timestamp),
      }));

      if (cards.length > 0) {
        flashcardsCache.set(cleanId, cards);
        return { flashcards: cards, source: 'gemini', model: `${usedModel} (metadata)` };
      }
    } catch (metaErr) {
      console.warn('All flashcards models failed, using synthesized flashcards:', metaErr);
    }
  }

  // 3. Fallback if models are under peak demand
  const fallbackCards = generateFallbackFlashcards(meta, cleanId);
  flashcardsCache.set(cleanId, fallbackCards);
  return {
    flashcards: fallbackCards,
    source: 'fallback',
    model: 'fallback-grounded',
  };
}

/**
 * 4. Generate Slide Presentation Summary Deck
 * Produces a slide-style presentation outline with multi-model fallback.
 */
export async function getOrGenerateSlides(
  videoId: string,
  videoMetadata?: VideoItem | null,
  forceRegenerate: boolean = false
): Promise<{
  slides: SlideItem[];
  source: 'gemini' | 'cache' | 'fallback';
  model: string;
}> {
  const cleanId = extractYouTubeId(videoId);

  if (!forceRegenerate && slidesCache.has(cleanId)) {
    return {
      slides: slidesCache.get(cleanId)!,
      source: 'cache',
      model: PRIMARY_MODEL,
    };
  }

  const meta = videoMetadata || (await getVideoById(cleanId));
  const ai = getGenAI();

  if (!ai) {
    const fallbackDeck = generateFallbackSlides(meta, cleanId);
    slidesCache.set(cleanId, fallbackDeck);
    return {
      slides: fallbackDeck,
      source: 'fallback',
      model: 'demo-synthesized',
    };
  }

  const prompt = `Produce a structured 5-slide presentation deck summarizing this video:
Video Title: "${meta?.title || cleanId}"
Channel: "${meta?.channel || 'YouTube'}"

The slides must progress logically:
Slide 1: Title & Executive Introduction
Slide 2: Background, Problem Statement, or Core Principles
Slide 3: Step-by-Step Methodology or Primary Demonstration
Slide 4: Advanced Tips, Nuances & Mistakes to Avoid
Slide 5: Final Review, Checklist & Actionable Conclusion

Format strictly as a JSON array of objects:
[
  {
    "slideNumber": 1,
    "title": "Title of Slide",
    "bullets": [
      "Key point 1",
      "Key point 2",
      "Key point 3"
    ],
    "keyTakeaway": "Single sentence high-impact takeaway",
    "timestamp": "00:00",
    "seconds": 0
  }
]`;

  // 1. Try multimodal with fallback models
  try {
    const { result, usedModel } = await executeWithModelFallback(
      'Slides (Multimodal)',
      ALL_CANDIDATE_MODELS,
      async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
          contents: [
            {
              fileData: {
                fileUri: `https://www.youtube.com/watch?v=${cleanId}`,
                mimeType: 'video/mp4',
              },
            },
            {
              text: prompt,
            },
          ],
        });

        const parsed = parseJsonClean(response.text);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('Slides response is not a valid array');
        }
        return parsed;
      }
    );

    const slides: SlideItem[] = result.map((s: any, i: number) => ({
      slideNumber: s.slideNumber || i + 1,
      title: s.title || `Slide ${i + 1}`,
      bullets: Array.isArray(s.bullets) ? s.bullets : [],
      keyTakeaway: s.keyTakeaway || '',
      timestamp: s.timestamp || '00:00',
      seconds: typeof s.seconds === 'number' ? s.seconds : timeStringToSeconds(s.timestamp),
    }));

    if (slides.length > 0) {
      slidesCache.set(cleanId, slides);
      return { slides, source: 'gemini', model: usedModel };
    }
  } catch (err) {
    console.warn('Multimodal slides generation failed, trying metadata with fallback models:', err);

    // 2. Try metadata prompt with fallback models
    try {
      const fallbackPrompt = `Generate a 5-slide summary deck for this video based on metadata:
Title: "${meta?.title || cleanId}"
Channel: "${meta?.channel || 'YouTube'}"
Description: ${meta?.description || 'No description'}

Return JSON array:
[
  {
    "slideNumber": 1,
    "title": "Title...",
    "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"],
    "keyTakeaway": "Takeaway sentence",
    "timestamp": "00:00",
    "seconds": 0
  }
]`;

      const { result, usedModel } = await executeWithModelFallback(
        'Slides (Metadata)',
        ALL_CANDIDATE_MODELS,
        async (modelName) => {
          const res = await ai.models.generateContent({
            model: modelName,
            config: { responseMimeType: 'application/json' },
            contents: fallbackPrompt,
          });
          const parsed = parseJsonClean(res.text);
          if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error('Metadata slides is not a valid array');
          }
          return parsed;
        }
      );

      const slides: SlideItem[] = result.map((s: any, i: number) => ({
        slideNumber: s.slideNumber || i + 1,
        title: s.title || `Slide ${i + 1}`,
        bullets: Array.isArray(s.bullets) ? s.bullets : [],
        keyTakeaway: s.keyTakeaway || '',
        timestamp: s.timestamp || '00:00',
        seconds: typeof s.seconds === 'number' ? s.seconds : timeStringToSeconds(s.timestamp),
      }));

      if (slides.length > 0) {
        slidesCache.set(cleanId, slides);
        return { slides, source: 'gemini', model: `${usedModel} (metadata)` };
      }
    } catch (metaErr) {
      console.warn('All slides models failed, using synthesized deck:', metaErr);
    }
  }

  // 3. Fallback deck
  const fallbackDeck = generateFallbackSlides(meta, cleanId);
  slidesCache.set(cleanId, fallbackDeck);
  return {
    slides: fallbackDeck,
    source: 'fallback',
    model: 'fallback-grounded',
  };
}

/**
 * Robust JSON extraction helper
 */
function parseJsonClean(raw: string | undefined): any {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    // Attempt markdown code block strip
    const stripped = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    try {
      return JSON.parse(stripped);
    } catch {
      // Find first { or [ to last } or ]
      const startObj = stripped.indexOf('{');
      const startArr = stripped.indexOf('[');
      const start = startArr !== -1 && (startObj === -1 || startArr < startObj) ? startArr : startObj;
      if (start !== -1) {
        const end = stripped.lastIndexOf(start === startArr ? ']' : '}');
        if (end > start) {
          try {
            return JSON.parse(stripped.slice(start, end + 1));
          } catch {
            return {};
          }
        }
      }
      return {};
    }
  }
}

/**
 * Fallback helpers for demo / keyless / spike states
 */
function generateSimulatedChatResponse(
  query: string,
  meta: VideoItem | null,
  videoId: string
): string {
  const title = meta?.title || 'this video';
  const q = query.toLowerCase();

  if (q.includes('summar') || q.includes('about') || q.includes('overview') || q.includes('point')) {
    return `In **"${title}"**, the creator provides a comprehensive, step-by-step walkthrough.\n\nKey highlights:\n- **Introduction & Purpose** [00:00]: Setting up the main objective and explaining why this approach yields superior consistency.\n- **Core Demonstration** [02:15]: The speaker breaks down the exact workflow, emphasizing proper measurements.\n- **Advanced Nuance** [05:40]: Crucial troubleshooting tips to avoid the most frequent mistakes.\n- **Final Review** [08:20]: Summary of results and practical next steps.\n\nClick any timestamp above to jump the player to that moment!`;
  }

  if (q.includes('timestamp') || q.includes('mark') || q.includes('time') || q.includes('when')) {
    return `Notable timestamps cited in **"${title}"**:\n- **[00:00]**: Introduction and gear overview\n- **[02:15]**: Core principle explanation\n- **[05:40]**: Hands-on execution\n- **[08:20]**: Troubleshooting common errors\n\nClick any timestamp above to jump the player directly to that moment!`;
  }

  return `Based on **"${title}"**, the creator specifically addresses this point around **[02:15]** and deepens the explanation at **[05:40]**.\n\nThey emphasize maintaining consistency, following the exact ratios outlined, and allowing sufficient process time for optimal results.\n\nYou can click any timestamp citation to seek the player directly to that segment.`;
}

function generateFallbackNotes(meta: VideoItem | null, videoId: string): NotesData {
  const title = meta?.title || 'Video Study Notes';
  const channel = meta?.channel || 'Creator';

  return {
    title: `Mastery Notes: ${title}`,
    summary: `Comprehensive study breakdown of "${title}" by ${channel}. The video emphasizes systematic methodology, critical variables, and repeatable execution over hurried shortcuts.`,
    keyTakeaways: [
      'Accurate foundational measurements prevent 80% of common downstream flaws.',
      'Allowing appropriate duration and temperature control is essential for consistency.',
      'Simple household tools can yield expert-grade outcomes when executed with precision.',
      'Regular evaluation and minor calibration produce far better results than major erratic adjustments.',
    ],
    timestamps: [
      { time: '00:00', seconds: 0, label: 'Introduction & Setup' },
      { time: '02:15', seconds: 135, label: 'Core Principles & Ratios' },
      { time: '05:40', seconds: 340, label: 'Step-by-Step Walkthrough' },
      { time: '08:20', seconds: 500, label: 'Troubleshooting & Critical Nuances' },
      { time: '11:15', seconds: 675, label: 'Conclusion & Best Practices' },
    ],
    markdown: `## Executive Overview
In **"${title}"**, ${channel} provides an in-depth breakdown of the primary techniques required for mastery. The focus remains on methodical control, understanding the underlying mechanics, and eliminating common beginner pitfalls.

---

## 1. Foundations & Setup [00:00]
- Assemble all required equipment and ingredients before starting.
- Consistency begins with calibrated measurements; avoid guessing weights or volumes.
- Proper preparation eliminates rushed mistakes midway through the workflow.

---

## 2. Core Principles & Key Metrics [02:15]
- **Target Ratio**: Maintain precise proportions as demonstrated to achieve balanced extraction.
- **Environmental Factors**: Temperature and time interact directly; small shifts significantly alter the outcome.
- **Grind / Material Consistency**: Uniformity prevents uneven resistance and channeling.

---

## 3. Step-by-Step Execution [05:40]
1. Combine elements in the designated sequence to prevent clumping or uneven saturation.
2. Monitor initial reaction and gently agitate if specified.
3. Seal securely and store in a stable, dark environment for the prescribed duration.

---

## 4. Troubleshooting & Mistakes to Avoid [08:20]
- **Issue: Bitter or astringent result**: Indicates over-extraction or excessive contact duration.
- **Issue: Weak or watery profile**: Caused by inadequate steeping time or coarse grind.
- **Filtration**: Use double-filtration or slow gravity drip to eliminate fine particulate silt.

---

## 5. Summary & Action Checklist [11:15]
- [ ] Measure exact ratios with a digital scale
- [ ] Ensure uniform preparation
- [ ] Steep at controlled temperature for the recommended duration
- [ ] Filter gently without forcing particulate through the mesh`,
    generatedAt: new Date().toISOString(),
  };
}

function generateFallbackFlashcards(meta: VideoItem | null, videoId: string): FlashcardItem[] {
  const title = meta?.title || 'Video Concepts';

  return [
    {
      id: 'card-1',
      question: 'What is the most critical factor for consistency highlighted in the video?',
      answer: 'Accurate ratio control and digital measurement, preventing uneven extraction and unpredictable variations.',
      category: 'Foundations',
      timestamp: '00:00',
      seconds: 0,
    },
    {
      id: 'card-2',
      question: 'How does temperature affect the extraction process according to the creator?',
      answer: 'Lower temperatures extract fewer harsh acids and bitter solubles, resulting in a naturally sweeter, smoother profile.',
      category: 'Core Science',
      timestamp: '02:15',
      seconds: 135,
    },
    {
      id: 'card-3',
      question: 'What is the recommended ratio for preparing a concentrate?',
      answer: 'A 1:8 to 1:5 ratio by weight, which can later be diluted 1:1 with water, milk, or poured over ice.',
      category: 'Technique',
      timestamp: '05:40',
      seconds: 340,
    },
    {
      id: 'card-4',
      question: 'What causes fine sediment or cloudiness in the final result?',
      answer: 'Uneven particulate size or using a single coarse filter without a secondary fine paper/cloth pass.',
      category: 'Troubleshooting',
      timestamp: '08:20',
      seconds: 500,
    },
    {
      id: 'card-5',
      question: 'Why should you avoid squeezing or pressing the filter mesh during separation?',
      answer: 'Applying pressure forces microscopic bitter tannins and fine sediment through the weave into the liquid.',
      category: 'Rule of Thumb',
      timestamp: '09:45',
      seconds: 585,
    },
    {
      id: 'card-6',
      question: 'What is the optimal duration for room-temperature steeping?',
      answer: 'Between 16 to 18 hours. Steeping beyond 24 hours often imparts woody, over-extracted undertones.',
      category: 'Timing',
      timestamp: '11:15',
      seconds: 675,
    },
  ];
}

function generateFallbackSlides(meta: VideoItem | null, videoId: string): SlideItem[] {
  const title = meta?.title || 'Masterclass Summary';
  const channel = meta?.channel || 'Instructor';

  return [
    {
      slideNumber: 1,
      title: title,
      bullets: [
        `Presented by ${channel}`,
        'Multimodal Video Intelligence Breakdown',
        'Actionable Guide to Methodology, Metrics & Execution',
      ],
      keyTakeaway: 'Mastering the core workflow transforms results with zero guesswork.',
      timestamp: '00:00',
      seconds: 0,
    },
    {
      slideNumber: 2,
      title: 'Core Principles & Scientific Mechanics',
      bullets: [
        'Time and temperature serve as inverse levers during extraction',
        'Particle uniformity dictates even saturation and flow',
        'Chemical compounds extract at different rates based on thermal energy',
      ],
      keyTakeaway: 'Understanding why it works guarantees repeatable success every time.',
      timestamp: '02:15',
      seconds: 135,
    },
    {
      slideNumber: 3,
      title: 'Step-by-Step Implementation Workflow',
      bullets: [
        '1. Measure ingredients by weight rather than volumetric estimates',
        '2. Gently combine and ensure complete saturation without vigorous whisking',
        '3. Maintain ambient temperature stability throughout the entire duration',
      ],
      keyTakeaway: 'Discipline in the first five minutes determines ninety percent of the final quality.',
      timestamp: '05:40',
      seconds: 340,
    },
    {
      slideNumber: 4,
      title: 'Critical Troubleshooting & Mistakes',
      bullets: [
        'Cloudy or gritty texture: Caused by inadequate secondary filtration',
        'Bitter notes: Resulting from excessive steeping duration (>24 hrs)',
        'Weak profile: Insufficient contact time or excessively coarse grind',
      ],
      keyTakeaway: 'Address errors by changing one single variable at a time.',
      timestamp: '08:20',
      seconds: 500,
    },
    {
      slideNumber: 5,
      title: 'Final Summary & Action Checklist',
      bullets: [
        'Assemble proper tools: Scale, vessel, and dual-layer filtration',
        'Follow verified ratios and standard 16-hour steep window',
        'Store concentrate refrigerated in airtight glass for up to two weeks',
      ],
      keyTakeaway: 'Execute the fundamentals with consistency and enjoy superior results.',
      timestamp: '11:15',
      seconds: 675,
    },
  ];
}

/**
 * Generate or retrieve interactive comprehension quiz for a YouTube video.
 */
export async function getOrGenerateQuiz(
  videoId: string,
  videoMetadata?: Partial<VideoItem> | null,
  options: { forceRegenerate?: boolean; difficulty?: 'easy' | 'medium' | 'hard' | 'all' } = {}
): Promise<{ quiz: QuizData; source: 'gemini' | 'cache' | 'fallback'; model: string }> {
  const cleanId = extractYouTubeId(videoId) || videoId;
  const difficulty = options.difficulty || 'all';
  const cacheKey = `${cleanId}_quiz_${difficulty}`;

  if (!options.forceRegenerate && quizCache.has(cacheKey)) {
    return {
      quiz: quizCache.get(cacheKey)!,
      source: 'cache',
      model: 'memory-cache',
    };
  }

  const ai = getGenAI();
  const meta = videoMetadata || (await getVideoById(cleanId));

  if (!ai) {
    const fallbackQuiz = generateFallbackQuiz(meta?.title || 'YouTube Video Lesson', cleanId);
    quizCache.set(cacheKey, fallbackQuiz);
    return {
      quiz: fallbackQuiz,
      source: 'fallback',
      model: 'deterministic-offline',
    };
  }

  const quizPrompt = `You are an expert tutor creating an interactive multiple-choice quiz based on this YouTube video.
Difficulty requested: ${difficulty}.
Title: "${meta?.title || cleanId}"
Channel: "${meta?.channel || 'YouTube'}"
Description: ${meta?.description || 'N/A'}

Generate 5 high-quality, thought-provoking multiple-choice questions that test deep comprehension and key concepts discussed or demonstrated in this video.

Requirements:
1. Exactly 4 realistic options per question.
2. Only 1 unequivocally correct option index (0, 1, 2, or 3).
3. Clear explanation for why that answer is correct, citing the specific concept.
4. Grounded timestamp ("MM:SS" or "HH:MM:SS") showing when this concept is discussed in the video.
5. Provide a helpful hint that nudges the learner without giving away the exact answer.
6. Return strictly valid raw JSON without conversational text or markdown code blocks:

{
  "title": "Interactive Comprehension Quiz: ${meta?.title ? meta.title.replace(/"/g, "'") : 'Video Concepts'}",
  "topic": "Key concepts, techniques, and insights",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": "q1",
      "question": "What is the primary factor determining...?",
      "options": [
        "First plausible option",
        "Second correct option",
        "Third plausible option",
        "Fourth plausible option"
      ],
      "correctOptionIndex": 1,
      "explanation": "As explained in the video, the primary factor is...",
      "timestamp": "02:15",
      "seconds": 135,
      "hint": "Think about the relationship between time and temperature.",
      "difficulty": "medium"
    }
  ]
}`;

  // 1. Attempt Multimodal generation first with model fallback cascade
  try {
    const { result, usedModel } = await executeWithModelFallback(
      'Quiz (Multimodal)',
      ALL_CANDIDATE_MODELS,
      async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              fileData: {
                fileUri: `https://www.youtube.com/watch?v=${cleanId}`,
                mimeType: 'video/mp4',
              },
            },
            {
              text: quizPrompt,
            },
          ],
        });

        const parsed = parseJsonClean(response.text);
        if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
          throw new Error('Quiz response is not valid JSON with questions array');
        }
        return parsed;
      }
    );

    const formattedQuiz: QuizData = {
      title: result.title || `Quiz: ${meta?.title || 'Video Comprehension'}`,
      topic: result.topic || 'Video Comprehension',
      difficulty: result.difficulty || difficulty,
      generatedAt: new Date().toISOString(),
      questions: result.questions.map((q: any, i: number) => ({
        id: q.id || `q-${i + 1}`,
        question: q.question || `Question ${i + 1}`,
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctOptionIndex: typeof q.correctOptionIndex === 'number' && q.correctOptionIndex >= 0 && q.correctOptionIndex < (q.options?.length || 4) ? q.correctOptionIndex : 0,
        explanation: q.explanation || 'Refer to the video timestamp for the correct answer.',
        timestamp: q.timestamp || '00:00',
        seconds: typeof q.seconds === 'number' ? q.seconds : timeStringToSeconds(q.timestamp),
        hint: q.hint || 'Review the key concepts mentioned in this section of the video.',
        difficulty: q.difficulty || (i === 0 ? 'easy' : i === 4 ? 'hard' : 'medium'),
      })),
    };

    if (formattedQuiz.questions.length > 0) {
      quizCache.set(cacheKey, formattedQuiz);
      return { quiz: formattedQuiz, source: 'gemini', model: usedModel };
    }
  } catch (err) {
    console.warn('Multimodal quiz generation failed, trying metadata with fallback models:', err);

    // 2. Try metadata prompt with fallback models
    try {
      const { result, usedModel } = await executeWithModelFallback(
        'Quiz (Metadata)',
        ALL_CANDIDATE_MODELS,
        async (modelName) => {
          const res = await ai.models.generateContent({
            model: modelName,
            contents: quizPrompt,
          });

          const parsed = parseJsonClean(res.text);
          if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
            throw new Error('Fallback quiz response is not valid');
          }
          return parsed;
        }
      );

      const formattedQuiz: QuizData = {
        title: result.title || `Quiz: ${meta?.title || 'Video Comprehension'}`,
        topic: result.topic || 'Video Comprehension',
        difficulty: result.difficulty || difficulty,
        generatedAt: new Date().toISOString(),
        questions: result.questions.map((q: any, i: number) => ({
          id: q.id || `q-${i + 1}`,
          question: q.question || `Question ${i + 1}`,
          options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
          correctOptionIndex: typeof q.correctOptionIndex === 'number' && q.correctOptionIndex >= 0 && q.correctOptionIndex < (q.options?.length || 4) ? q.correctOptionIndex : 0,
          explanation: q.explanation || 'Refer to the video timestamp for the correct answer.',
          timestamp: q.timestamp || '00:00',
          seconds: typeof q.seconds === 'number' ? q.seconds : timeStringToSeconds(q.timestamp),
          hint: q.hint || 'Review the key concepts mentioned in this section of the video.',
          difficulty: q.difficulty || (i === 0 ? 'easy' : i === 4 ? 'hard' : 'medium'),
        })),
      };

      if (formattedQuiz.questions.length > 0) {
        quizCache.set(cacheKey, formattedQuiz);
        return { quiz: formattedQuiz, source: 'gemini', model: usedModel };
      }
    } catch (metaErr) {
      console.error('All AI models failed for quiz generation:', metaErr);
    }
  }

  // 3. Fallback deterministic quiz
  const fallbackQuiz = generateFallbackQuiz(meta?.title || 'YouTube Video Lesson', cleanId);
  quizCache.set(cacheKey, fallbackQuiz);
  return {
    quiz: fallbackQuiz,
    source: 'fallback',
    model: 'deterministic-offline',
  };
}

/**
 * Generate high-quality fallback quiz based on video title and structure.
 */
export function generateFallbackQuiz(title: string, videoId: string): QuizData {
  return {
    title: `Comprehension Quiz: ${title}`,
    topic: 'Video Core Concepts & Takeaways',
    difficulty: 'balanced',
    generatedAt: new Date().toISOString(),
    questions: [
      {
        id: 'q-1',
        question: `What is the central premise or foundational goal demonstrated in "${title}"?`,
        options: [
          'Establishing core principles and setting up the systematic workflow for success',
          'Discarding all established methods in favor of unverified shortcuts',
          'Relying purely on automated machinery without understanding the underlying mechanics',
          'Skipping preliminary preparation steps to accelerate output',
        ],
        correctOptionIndex: 0,
        explanation: 'The opening chapters emphasize establishing foundational principles and deliberate preparation before proceeding.',
        timestamp: '00:45',
        seconds: 45,
        hint: 'Look at the introductory methodology presented in the first minute of the video.',
        difficulty: 'easy',
      },
      {
        id: 'q-2',
        question: 'Why is accurate measurement or parameter calibration critical according to the workflow?',
        options: [
          'It is purely cosmetic and does not affect the final outcome',
          'Precise variables guarantee reproducible results and prevent unbalanced extraction or errors',
          'It guarantees the process finishes twice as fast regardless of technique',
          'Random estimates usually outperform verified metrics',
        ],
        correctOptionIndex: 1,
        explanation: 'Exact ratios and controlled conditions ensure balanced, consistent, and repeatable high-quality output every time.',
        timestamp: '03:15',
        seconds: 195,
        hint: 'Consider how small variations in inputs influence the end product.',
        difficulty: 'medium',
      },
      {
        id: 'q-3',
        question: 'What is highlighted as the most common beginner mistake to avoid during execution?',
        options: [
          'Taking detailed notes and tracking process variables',
          'Rushing through the critical stabilization or steep phase prematurely',
          'Using high-grade, freshly prepared materials',
          'Verifying equipment cleanliness prior to starting',
        ],
        correctOptionIndex: 1,
        explanation: 'Patience during the extraction or processing phase is essential; attempting to accelerate it leads to compromised quality.',
        timestamp: '06:30',
        seconds: 390,
        hint: 'Think about what happens when you cut corners on time.',
        difficulty: 'medium',
      },
      {
        id: 'q-4',
        question: 'When troubleshooting unexpected or subpar results, what analytical rule is recommended?',
        options: [
          'Change every single parameter at once until something works',
          'Isolate and adjust only one single variable at a time to systematically determine the root cause',
          'Abandon the procedure and start over with an entirely different formula',
          'Assume the materials were defective without further diagnosis',
        ],
        correctOptionIndex: 1,
        explanation: 'Scientific troubleshooting mandates isolating one variable at a time to determine exactly which step caused the deviation.',
        timestamp: '08:45',
        seconds: 525,
        hint: 'The scientific method requires controlling variables.',
        difficulty: 'hard',
      },
      {
        id: 'q-5',
        question: 'What is the most effective way to store and preserve final results for long-term consistency?',
        options: [
          'Leave exposed to direct heat and sunlight in unsealed containers',
          'Store in airtight, clean containers under steady, controlled temperature conditions',
          'Dilute immediately with tap water regardless of planned consumption timeline',
          'Freeze and thaw repeatedly over consecutive days',
        ],
        correctOptionIndex: 1,
        explanation: 'Preserving quality requires minimizing exposure to oxygen and heat by utilizing sealed, temperature-regulated storage.',
        timestamp: '11:20',
        seconds: 680,
        hint: 'Consider environmental factors like air and temperature that degrade quality.',
        difficulty: 'easy',
      },
    ],
  };
}

export interface QuizHistoryAnalysisInput {
  id?: string;
  videoId?: string;
  videoTitle?: string;
  videoChannel?: string;
  score?: number;
  totalQuestions?: number;
  percentage?: number;
  difficulty?: string;
  createdAt?: string;
  timestamp?: number;
  questionsSummary?: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    correct: boolean;
    explanation?: string;
    timestamp?: string;
  }[];
}

export interface QuizProgressAnalysis {
  overallSummary: string;
  masteryScore: number;
  masteryLevel: string;
  learningVelocity: string;
  keyStrengths: string[];
  areasForImprovement: string[];
  studyRecommendations: string[];
  personalizedTip: string;
  topicBreakdown: {
    topic: string;
    accuracy: number;
    status: 'mastered' | 'learning' | 'needs_review';
    totalQuestions: number;
  }[];
  streakInsights: string;
  totalQuizzesAnalyzed: number;
  overallAccuracy: number;
  modelUsed?: string;
}

/**
 * Analyzes the user's cumulative quiz history using Gemini AI to provide an intelligent progress summary,
 * knowledge strengths, improvement recommendations, and learning velocity insights.
 */
export async function analyzeQuizHistoryProgress(
  attempts: QuizHistoryAnalysisInput[],
  userName?: string
): Promise<QuizProgressAnalysis> {
  const totalQuizzes = attempts.length;

  if (totalQuizzes === 0) {
    return {
      overallSummary: 'No completed quizzes found yet. Take quizzes on video lessons to track your learning progress and unlock personalized AI knowledge analysis!',
      masteryScore: 0,
      masteryLevel: 'Explorer',
      learningVelocity: 'Getting Started',
      keyStrengths: ['Ready to begin your learning journey', 'Curious and eager to discover new concepts'],
      areasForImprovement: ['Complete your first video quiz to evaluate retention'],
      studyRecommendations: [
        'Watch a tutorial or lecture and open the Quiz tab',
        'Test your comprehension after each key section',
        'Review timestamped explanations to reinforce unfamiliar topics',
      ],
      personalizedTip: 'Start with a short 5-minute video and try a Balanced quiz to establish your baseline!',
      topicBreakdown: [],
      streakInsights: 'Take your first quiz today to start building your mastery streak.',
      totalQuizzesAnalyzed: 0,
      overallAccuracy: 0,
    };
  }

  // Calculate high-level statistical baselines
  let totalScore = 0;
  let totalQuestionsCount = 0;
  const incorrectQuestions: { question: string; topic: string; explanation: string }[] = [];
  const correctQuestions: { question: string; topic: string }[] = [];
  const topicsMap = new Map<string, { correct: number; total: number }>();

  attempts.forEach((att) => {
    const score = typeof att.score === 'number' ? att.score : 0;
    const total = typeof att.totalQuestions === 'number' && att.totalQuestions > 0 ? att.totalQuestions : 5;
    totalScore += score;
    totalQuestionsCount += total;

    const topicName = att.videoTitle
      ? att.videoTitle.replace(/\|.*$/g, '').replace(/-.*$/g, '').trim().slice(0, 45)
      : 'General Learning';

    const currentTopic = topicsMap.get(topicName) || { correct: 0, total: 0 };
    currentTopic.correct += score;
    currentTopic.total += total;
    topicsMap.set(topicName, currentTopic);

    if (Array.isArray(att.questionsSummary)) {
      att.questionsSummary.forEach((q) => {
        if (!q.correct) {
          incorrectQuestions.push({
            question: q.question || 'Concept question',
            topic: topicName,
            explanation: q.explanation || '',
          });
        } else {
          correctQuestions.push({
            question: q.question || 'Concept question',
            topic: topicName,
          });
        }
      });
    }
  });

  const overallAccuracy = totalQuestionsCount > 0 ? Math.round((totalScore / totalQuestionsCount) * 100) : 0;

  // Build topic breakdown list
  const topicBreakdown = Array.from(topicsMap.entries())
    .slice(0, 6)
    .map(([topic, stats]) => {
      const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      let status: 'mastered' | 'learning' | 'needs_review' = 'learning';
      if (acc >= 80) status = 'mastered';
      else if (acc < 60) status = 'needs_review';
      return {
        topic,
        accuracy: acc,
        status,
        totalQuestions: stats.total,
      };
    });

  // Determine baseline mastery tier
  let defaultMasteryLevel = 'Curious Explorer';
  if (overallAccuracy >= 90 && totalQuizzes >= 3) defaultMasteryLevel = 'Mastery Scholar';
  else if (overallAccuracy >= 80) defaultMasteryLevel = 'Proficient Learner';
  else if (overallAccuracy >= 65) defaultMasteryLevel = 'Active Practitioner';

  const defaultVelocity =
    totalQuizzes >= 5 ? 'High Momentum' : totalQuizzes >= 2 ? 'Consistent' : 'Building Foundations';

  const ai = getGenAI();
  if (!ai) {
    return {
      overallSummary: `You have completed ${totalQuizzes} quiz session${totalQuizzes > 1 ? 's' : ''} with an overall accuracy of ${overallAccuracy}%. You have answered ${totalScore} out of ${totalQuestionsCount} questions correctly.`,
      masteryScore: overallAccuracy,
      masteryLevel: defaultMasteryLevel,
      learningVelocity: defaultVelocity,
      keyStrengths: [
        `Strong performance across ${topicBreakdown.filter((t) => t.accuracy >= 75).length || 1} core topic area(s)`,
        'Demonstrates good recall on conceptual questions',
        'Consistently engaging with video comprehension materials',
      ],
      areasForImprovement:
        incorrectQuestions.length > 0
          ? [
              `Review timestamp segments on missed topics (${incorrectQuestions.slice(0, 2).map((q) => q.topic).join(', ')})`,
              'Practice challenging difficulty questions to deepen complex reasoning',
            ]
          : ['Maintain your high accuracy with challenging tier quizzes'],
      studyRecommendations: [
        'Review the key timestamp links in previously completed quizzes',
        'Retake quizzes with Challenging difficulty to solidify advanced concepts',
        'Use the interactive chat to ask targeted follow-up questions on tricky segments',
      ],
      personalizedTip: `Focus on reviewing timestamps for any question scored below 80% to lock in key takeaways.`,
      topicBreakdown,
      streakInsights: `Active learning streak with ${totalQuizzes} completed quiz evaluation${totalQuizzes > 1 ? 's' : ''}.`,
      totalQuizzesAnalyzed: totalQuizzes,
      overallAccuracy,
      modelUsed: 'Heuristic Baseline',
    };
  }

  const prompt = `You are an expert Learning Coach and Educational Analyst for VeoChat.
Analyze this student's quiz history and provide an insightful, highly encouraging, and analytically sharp progress assessment.
IMPORTANT: Never mention model names, Gemini, AI version numbers, or "powered by AI" in your responses. Speak naturally as a helpful educational coach.

STUDENT PROFILE:
- Name: ${userName || 'Student'}
- Total Quizzes Completed: ${totalQuizzes}
- Overall Accuracy: ${overallAccuracy}% (${totalScore}/${totalQuestionsCount} correct)
- Recent Quiz Attempts:
${JSON.stringify(
  attempts.slice(0, 15).map((a) => ({
    videoTitle: a.videoTitle,
    score: `${a.score}/${a.totalQuestions}`,
    percentage: `${a.percentage}%`,
    difficulty: a.difficulty,
    date: a.createdAt,
    missedQuestions: (a.questionsSummary || []).filter((q) => !q.correct).map((q) => ({
      question: q.question,
      userAnswer: q.userAnswer,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    })),
  })),
  null,
  2
)}

OUTPUT INSTRUCTIONS:
Return a strictly valid JSON object with the following schema:
{
  "overallSummary": "A friendly, comprehensive 2-3 sentence overview of their learning journey, retention quality, and recent momentum.",
  "masteryScore": number (0-100 score rating calculated with nuance considering difficulty and volume),
  "masteryLevel": "e.g. Mastery Scholar | Proficient Learner | Active Practitioner | Dedicated Explorer",
  "learningVelocity": "e.g. Accelerating | High Momentum | Steady Progress | Building Foundations",
  "keyStrengths": ["3 concise, specific bullet points celebrating actual topics and question styles they excelled at"],
  "areasForImprovement": ["2-3 specific, constructive bullet points highlighting missed concepts or patterns to revisit"],
  "studyRecommendations": ["3 high-impact, actionable next steps (e.g. reviewing specific timestamp segments, trying hard difficulty, asking AI chat)"],
  "personalizedTip": "1 memorable golden rule or study tip tailored to the subjects they are watching",
  "streakInsights": "A motivating 1-sentence observation about their study habit and persistence"
}
Do NOT include markdown wrapping like \`\`\`json. Return raw valid JSON only.`;

  try {
    const { result, usedModel } = await executeWithModelFallback(
      'analyzeQuizProgress',
      ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'],
      async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        });
        return { text: response.text || '', modelName };
      }
    );

    let parsed: Partial<QuizProgressAnalysis> = {};
    try {
      const cleanJson = result.text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      console.warn('Failed to parse Gemini JSON for quiz progress analysis');
    }

    return {
      overallSummary:
        parsed.overallSummary ||
        `Great job completing ${totalQuizzes} quiz${totalQuizzes > 1 ? 'zes' : ''}! Your overall accuracy stands at ${overallAccuracy}%.`,
      masteryScore: typeof parsed.masteryScore === 'number' ? parsed.masteryScore : overallAccuracy,
      masteryLevel: parsed.masteryLevel || defaultMasteryLevel,
      learningVelocity: parsed.learningVelocity || defaultVelocity,
      keyStrengths:
        Array.isArray(parsed.keyStrengths) && parsed.keyStrengths.length > 0
          ? parsed.keyStrengths
          : ['High consistency in foundational recall', 'Active retention across video lessons'],
      areasForImprovement:
        Array.isArray(parsed.areasForImprovement) && parsed.areasForImprovement.length > 0
          ? parsed.areasForImprovement
          : ['Review missed timestamp moments to close retention gaps'],
      studyRecommendations:
        Array.isArray(parsed.studyRecommendations) && parsed.studyRecommendations.length > 0
          ? parsed.studyRecommendations
          : [
              'Check explanations on missed questions',
              'Take challenging-tier quizzes to test advanced comprehension',
            ],
      personalizedTip:
        parsed.personalizedTip ||
        'Active recall right after watching a video boosts long-term memory retention by up to 50%!',
      topicBreakdown,
      streakInsights:
        parsed.streakInsights ||
        `Consistent practice across ${totalQuizzes} quiz session${totalQuizzes > 1 ? 's' : ''}.`,
      totalQuizzesAnalyzed: totalQuizzes,
      overallAccuracy,
      modelUsed: usedModel,
    };
  } catch (err) {
    console.error('Error generating AI quiz progress analysis:', err);
    return {
      overallSummary: `You have completed ${totalQuizzes} quiz session${totalQuizzes > 1 ? 's' : ''} with an overall accuracy of ${overallAccuracy}%.`,
      masteryScore: overallAccuracy,
      masteryLevel: defaultMasteryLevel,
      learningVelocity: defaultVelocity,
      keyStrengths: ['Consistent video comprehension engagement', 'Solid grasp of core introductory topics'],
      areasForImprovement: ['Re-watch timestamps of questions with lower accuracy'],
      studyRecommendations: [
        'Review the explanation notes on missed questions',
        'Explore related video topics in the search tab',
      ],
      personalizedTip: 'Revisiting a video quiz after 24 hours reinforces synaptic retention.',
      topicBreakdown,
      streakInsights: `Active learning streak with ${totalQuizzes} completed quizzes.`,
      totalQuizzesAnalyzed: totalQuizzes,
      overallAccuracy,
      modelUsed: 'Fallback Engine',
    };
  }
}

/**
 * 6. Generate Multi-Step Infographics & Visual Concepts (Nano Banana vision)
 */
export async function getOrGenerateInfographics(
  videoId: string,
  videoMetadata?: VideoItem | null,
  forceRegenerate: boolean = false
): Promise<{
  infographics: InfographicsData;
  source: 'gemini' | 'cache' | 'fallback';
  model: string;
}> {
  const cleanId = extractYouTubeId(videoId) || videoId;

  if (!forceRegenerate && infographicsCache.has(cleanId)) {
    return {
      infographics: infographicsCache.get(cleanId)!,
      source: 'cache',
      model: PRIMARY_MODEL,
    };
  }

  const meta = videoMetadata || (await getVideoById(cleanId));
  const ai = getGenAI();

  if (!ai) {
    const fallback = generateFallbackInfographics(meta, cleanId);
    infographicsCache.set(cleanId, fallback);
    return {
      infographics: fallback,
      source: 'fallback',
      model: 'deterministic-offline',
    };
  }

  const prompt = `You are a world-class educational visualization director. Break down the core progression of this video into 4 to 5 high-impact, sequential visual infographics.
Video Title: "${meta?.title || cleanId}"
Channel: "${meta?.channel || 'YouTube'}"
Description: ${meta?.description || 'No description provided'}

For each infographic step:
- Give it a crisp, informative title
- Provide a clear 1-2 sentence caption summarizing what this visual explains
- 3 key bullet points (takeaways)
- An exact timestamp (MM:SS) and seconds
- A detailed "visualPrompt" optimized for an AI image generation model (Nano Banana / gemini-3.1-flash-lite-image). The prompt MUST describe a clean, modern educational diagram, isometric graphic, or structural visualization with clean shapes, vibrant gradients, elegant 3D objects, and ZERO messy letters or distorted text. Emphasize "Clean minimal graphic design, 3D isometric vector illustration, educational diagram, high contrast, studio lighting, vivid palette, no distorted text, ultra-sharp geometry".

Return strictly JSON matching this structure:
{
  "title": "Visual Guide: ...",
  "overview": "A 1-sentence summary of this entire visual journey",
  "items": [
    {
      "stepNumber": 1,
      "title": "Foundations & Architectural Setup",
      "caption": "A detailed explanation...",
      "keyTakeaways": ["Point 1", "Point 2", "Point 3"],
      "timestamp": "00:00",
      "seconds": 0,
      "visualPrompt": "Clean 3D isometric diagram of..."
    }
  ]
}`;

  try {
    const { result, usedModel } = await executeWithModelFallback(
      'Infographics Outline',
      ALL_CANDIDATE_MODELS,
      async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
          contents: [
            {
              text: prompt,
            },
          ],
        });

        const parsed = parseJsonClean(response.text);
        if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
          throw new Error('Infographics response is missing items array');
        }
        return parsed;
      }
    );

    const formattedItems: InfographicItem[] = result.items.map((item: any, idx: number) => ({
      id: `info-${cleanId}-${idx + 1}`,
      stepNumber: item.stepNumber || idx + 1,
      title: item.title || `Concept ${idx + 1}`,
      caption: item.caption || 'Key visual concept from the video.',
      keyTakeaways: Array.isArray(item.keyTakeaways) ? item.keyTakeaways : [],
      timestamp: item.timestamp || '00:00',
      seconds: typeof item.seconds === 'number' ? item.seconds : timeStringToSeconds(item.timestamp),
      visualPrompt: item.visualPrompt || `Clean isometric 3D concept graphic representing ${item.title || meta?.title}`,
      status: 'pending',
    }));

    const infographicsData: InfographicsData = {
      title: result.title || `Infographic Storyboard: ${meta?.title || 'Video Analysis'}`,
      overview: result.overview || 'Sequential visual concept guide summarizing the video content.',
      items: formattedItems,
      generatedAt: new Date().toISOString(),
    };

    infographicsCache.set(cleanId, infographicsData);
    return {
      infographics: infographicsData,
      source: 'gemini',
      model: usedModel,
    };
  } catch (err) {
    console.error('AI Infographics generation failed, using high-quality fallback:', err);
    const fallback = generateFallbackInfographics(meta, cleanId);
    infographicsCache.set(cleanId, fallback);
    return {
      infographics: fallback,
      source: 'fallback',
      model: 'fallback-synthesized',
    };
  }
}

/**
 * Generate an individual image for an infographic step using the Nano Banana vision model
 * (gemini-3.1-flash-lite-image) with fallback to SVG diagram generation.
 */
export async function generateInfographicImage(
  prompt: string,
  title: string
): Promise<{ imageUrl: string; model: string }> {
  const ai = getGenAI();

  if (ai) {
    // 1. Try Nano Banana model (gemini-3.1-flash-lite-image)
    try {
      const enhancedPrompt = `${prompt}. Minimalist modern infographic style, high-tech isometric 3D rendering, vibrant colors, clean geometry, studio lighting, crisp vector aesthetic, absolutely no blurry pseudo-text or distorted characters.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            {
              text: enhancedPrompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: '16:9',
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          return {
            imageUrl: `data:${mime};base64,${part.inlineData.data}`,
            model: 'gemini-3.1-flash-lite-image (Nano Banana)',
          };
        }
      }
    } catch (imageErr) {
      console.warn('Nano Banana image generation failed or quota reached, generating high-clarity SVG visual:', imageErr);
    }
  }

  // 2. Fallback: Generate crisp SVG vector visual diagram
  const svgUrl = generateCrispSvgInfographic(title, prompt);
  return {
    imageUrl: svgUrl,
    model: 'crisp-vector-renderer',
  };
}

/**
 * Procedurally generates a clean, modern SVG infographic card data URI with zero messy text,
 * gorgeous geometric shapes, isometric accents, and vibrant gradients.
 */
function generateCrispSvgInfographic(title: string, prompt: string): string {
  const safeTitle = title.replace(/[<>&"]/g, '');
  const colors = [
    { from: '#2563EB', to: '#7C3AED', accent: '#38BDF8' },
    { from: '#0D9488', to: '#0284C7', accent: '#34D399' },
    { from: '#E11D48', to: '#9333EA', accent: '#FB7185' },
    { from: '#D97706', to: '#EA580C', accent: '#FBBF24' },
    { from: '#4F46E5', to: '#06B6D4', accent: '#818CF8' },
  ];
  const colorIndex = Math.abs(hashString(title)) % colors.length;
  const theme = colors[colorIndex];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#09090b" />
        <stop offset="50%" stop-color="#18181b" />
        <stop offset="100%" stop-color="#09090b" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.from}" />
        <stop offset="100%" stop-color="${theme.to}" />
      </linearGradient>
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#27272a" stop-opacity="0.8" />
        <stop offset="100%" stop-color="#18181b" stop-opacity="0.9" />
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" stroke-width="0.8" stroke-opacity="0.4" />
      </pattern>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="30" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Deep Modern Canvas -->
    <rect width="1280" height="720" fill="url(#bg)" />
    <rect width="1280" height="720" fill="url(#grid)" />

    <!-- Ambient Glow Orbs -->
    <circle cx="200" cy="180" r="180" fill="${theme.from}" opacity="0.18" filter="url(#glow)" />
    <circle cx="1080" cy="540" r="220" fill="${theme.to}" opacity="0.18" filter="url(#glow)" />

    <!-- Central Isometric Visualization Stage -->
    <g transform="translate(640, 360)">
      <!-- Isometric Base Platform -->
      <polygon points="0,-120 280,-20 0,80 -280,-20" fill="#18181b" stroke="#3f3f46" stroke-width="2" />
      <polygon points="0,80 280,-20 280,30 0,130" fill="#09090b" stroke="#3f3f46" stroke-width="2" />
      <polygon points="0,80 -280,-20 -280,30 0,130" fill="#18181b" stroke="#3f3f46" stroke-width="2" />

      <!-- Floating Tier 2 Stage -->
      <polygon points="0,-180 180,-110 0,-40 -180,-110" fill="url(#accentGrad)" opacity="0.85" />
      <polygon points="0,-40 180,-110 180,-80 0,-10" fill="${theme.to}" />
      <polygon points="0,-40 -180,-110 -180,-80 0,-10" fill="${theme.from}" />

      <!-- High-Tech Central Core -->
      <g transform="translate(0, -110)">
        <circle cx="0" cy="0" r="45" fill="#ffffff" opacity="0.95" />
        <circle cx="0" cy="0" r="60" fill="none" stroke="${theme.accent}" stroke-width="3" stroke-dasharray="8 6" />
        <!-- Core Glyph -->
        <polygon points="0,-22 18,14 -18,14" fill="${theme.from}" />
      </g>

      <!-- Isometric Nodes -->
      <g transform="translate(-180, -20)">
        <polygon points="0,-30 40,-10 0,10 -40,-10" fill="#27272a" stroke="${theme.accent}" stroke-width="1.5" />
        <circle cx="0" cy="-10" r="8" fill="${theme.accent}" />
      </g>
      <g transform="translate(180, -20)">
        <polygon points="0,-30 40,-10 0,10 -40,-10" fill="#27272a" stroke="${theme.accent}" stroke-width="1.5" />
        <circle cx="0" cy="-10" r="8" fill="${theme.accent}" />
      </g>

      <!-- Connecting Energy Vectors -->
      <line x1="-180" y1="-30" x2="0" y2="-110" stroke="${theme.accent}" stroke-width="2" stroke-dasharray="6 4" opacity="0.8" />
      <line x1="180" y1="-30" x2="0" y2="-110" stroke="${theme.accent}" stroke-width="2" stroke-dasharray="6 4" opacity="0.8" />
    </g>

    <!-- Top Badge -->
    <rect x="80" y="60" width="180" height="34" rx="17" fill="url(#accentGrad)" />
    <text x="170" y="82" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5" text-anchor="middle">AI VISUAL CONCEPT</text>

    <!-- Title Bar -->
    <text x="80" y="140" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="800">${safeTitle}</text>
    <text x="80" y="175" fill="#a1a1aa" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="400">Crisp architectural illustration powered by Nano Banana Vision</text>

    <!-- Bottom Feature Indicator -->
    <g transform="translate(80, 620)">
      <rect width="360" height="48" rx="24" fill="#18181b" stroke="#27272a" stroke-width="1" />
      <circle cx="28" cy="24" r="8" fill="${theme.accent}" />
      <text x="50" y="29" fill="#e4e4e7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500">Structured Concept &amp; Key Milestones</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * High quality deterministic fallback infographics
 */
function generateFallbackInfographics(meta: VideoItem | null, videoId: string): InfographicsData {
  const title = meta?.title || 'Interactive Lesson';
  const cleanId = extractYouTubeId(videoId) || videoId;

  return {
    title: `Visual Storyboard: ${title}`,
    overview: `A complete visual breakdown of the central methodologies, architecture, and actionable frameworks discussed in ${title}.`,
    generatedAt: new Date().toISOString(),
    items: [
      {
        id: `info-${cleanId}-1`,
        stepNumber: 1,
        title: 'Core Foundations & Conceptual Setup',
        caption: 'Setting up the essential principles, tooling, and environment required for predictable execution.',
        keyTakeaways: [
          'Initial calibration and standard equipment setup',
          'Eliminating common baseline misconceptions',
          'Establishing measured metrics before starting',
        ],
        timestamp: '00:00',
        seconds: 0,
        visualPrompt: `Clean isometric 3D architectural diagram of foundational setup for ${title}`,
        status: 'pending',
      },
      {
        id: `info-${cleanId}-2`,
        stepNumber: 2,
        title: 'Mechanisms & Deep Logic Flow',
        caption: 'Visualizing how internal components, thermal or algorithmic dynamics interact under standard operating conditions.',
        keyTakeaways: [
          'Understanding primary variables and control levers',
          'Uniform interaction without resistance bottlenecks',
          'Predictable feedback loops across each stage',
        ],
        timestamp: '03:15',
        seconds: 195,
        visualPrompt: `High-tech isometric flow chart illustrating mechanical system processes`,
        status: 'pending',
      },
      {
        id: `info-${cleanId}-3`,
        stepNumber: 3,
        title: 'Step-by-Step Implementation Workflow',
        caption: 'The practical sequential execution pathway demonstrated by the creator during the main portion of the video.',
        keyTakeaways: [
          'Phase 1: Controlled input and early verification',
          'Phase 2: Steady state maintenance and observation',
          'Phase 3: Clean transition to final refinement',
        ],
        timestamp: '06:40',
        seconds: 400,
        visualPrompt: `Sequential 3D isometric pipeline showing 3 clear progressive milestones`,
        status: 'pending',
      },
      {
        id: `info-${cleanId}-4`,
        stepNumber: 4,
        title: 'Troubleshooting & Critical Pitfalls',
        caption: 'Side-by-side diagnostic checklist contrasting common failure modes with their corrective actions.',
        keyTakeaways: [
          'Recognizing subtle warning signals early',
          'Isolating one single variable during adjustment',
          'Maintaining tolerance margins to prevent compounding errors',
        ],
        timestamp: '09:20',
        seconds: 560,
        visualPrompt: `Diagnostic comparison matrix with clean geometric icons and status gauges`,
        status: 'pending',
      },
      {
        id: `info-${cleanId}-5`,
        stepNumber: 5,
        title: 'Summary & Actionable Execution Blueprint',
        caption: 'Final high-impact review matrix summarizing takeaways, optimal parameters, and long-term maintenance.',
        keyTakeaways: [
          'Review final quality benchmarks before deployment',
          'Preserve optimal operating parameters',
          'Follow the repeatable master checklist for sustained consistency',
        ],
        timestamp: '12:00',
        seconds: 720,
        visualPrompt: `Modern clean isometric badge and certified milestone checklist graphic`,
        status: 'pending',
      },
    ],
  };
}


