import { GoogleGenAI } from '@google/genai';
import {
  InfographicItem,
  InfographicsData,
  VideoItem,
} from '@/types/video';
import { extractYouTubeId, getVideoById } from '@/server/services/serpapi';

// In-memory cache for infographics data
const infographicsCache = new Map<string, InfographicsData>();
// Cache for generated images keyed by image prompt or id
const imageCache = new Map<string, string>();

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

// Text models for analysis & custom SVG diagram code generation (abundant free tier quota)
const TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

function timeStringToSeconds(t?: string): number {
  if (!t) return 0;
  const parts = t.split(':').map((p) => parseInt(p.trim(), 10));
  if (parts.some((n) => isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function parseJsonClean(raw: string | undefined | null): any {
  if (!raw) return null;
  let text = raw.trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(text);
  } catch {
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(text.substring(firstBracket, lastBracket + 1));
      } catch {}
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch {}
    }
  }
  return null;
}

/**
 * Generates an ultra-crisp, pure graphical SVG diagram.
 * Strictly visual - no bulky bottom text or paragraph subtitles.
 */
export function generateCrispSvgInfographic(
  title: string,
  _caption: string = '',
  stepNumber: number = 1
): string {
  const themes = [
    { bg1: '#09090b', bg2: '#18181b', accent: '#ef4444', secondary: '#f87171', nodeBg: '#27272a' },
    { bg1: '#0b0f17', bg2: '#111827', accent: '#3b82f6', secondary: '#60a5fa', nodeBg: '#1f2937' },
    { bg1: '#091514', bg2: '#0d2826', accent: '#10b981', secondary: '#34d399', nodeBg: '#134e4a' },
    { bg1: '#140c1c', bg2: '#241432', accent: '#a855f7', secondary: '#c084fc', nodeBg: '#3b1d54' },
    { bg1: '#170f07', bg2: '#2a1a0c', accent: '#f97316', secondary: '#fb923c', nodeBg: '#43230e' },
  ];

  const theme = themes[(stepNumber - 1) % themes.length];
  const safeTitle = title.replace(/[<>&"']/g, '').slice(0, 40);

  // Determine diagram archetype based on stepNumber
  const diagramType = ((stepNumber - 1) % 4);

  let diagramGraphic = '';

  if (diagramType === 0) {
    // Neural / Transformer Core Dual Block Architecture (Encoder -> Attention -> Decoder)
    diagramGraphic = `
      <!-- Dual Block Architecture -->
      <g transform="translate(640, 360)">
        <!-- Input Layer -->
        <g transform="translate(-360, 0)">
          <rect x="-70" y="-120" width="140" height="240" rx="16" fill="${theme.nodeBg}" stroke="${theme.accent}" stroke-width="2" opacity="0.9" />
          <text x="0" y="-80" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">INPUT</text>
          <circle cx="0" cy="-20" r="16" fill="${theme.accent}" opacity="0.8" />
          <circle cx="0" cy="30" r="16" fill="${theme.accent}" opacity="0.8" />
          <circle cx="0" cy="80" r="16" fill="${theme.accent}" opacity="0.8" />
        </g>

        <!-- Forward Arrow 1 -->
        <path d="M -280 0 L -180 0" stroke="${theme.secondary}" stroke-width="3" stroke-dasharray="6 4" />
        <polygon points="-175,0 -190,-7 -190,7" fill="${theme.secondary}" />

        <!-- Central Attention Core -->
        <g transform="translate(0, 0)">
          <rect x="-130" y="-150" width="260" height="300" rx="20" fill="#18181b" stroke="${theme.accent}" stroke-width="3" />
          <circle cx="0" cy="0" r="85" fill="none" stroke="${theme.secondary}" stroke-width="2" stroke-dasharray="8 6" />
          <polygon points="0,-45 40,-20 40,25 0,50 -40,25 -40,-20" fill="${theme.accent}" opacity="0.9" />
          <circle cx="0" cy="0" r="18" fill="#ffffff" />
          <text x="0" y="105" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="15" font-weight="700" text-anchor="middle">ATTENTION CORE</text>
        </g>

        <!-- Forward Arrow 2 -->
        <path d="M 140 0 L 240 0" stroke="${theme.secondary}" stroke-width="3" stroke-dasharray="6 4" />
        <polygon points="245,0 230,-7 230,7" fill="${theme.secondary}" />

        <!-- Output Layer -->
        <g transform="translate(360, 0)">
          <rect x="-70" y="-120" width="140" height="240" rx="16" fill="${theme.nodeBg}" stroke="${theme.secondary}" stroke-width="2" opacity="0.9" />
          <text x="0" y="-80" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">OUTPUT</text>
          <circle cx="0" cy="-20" r="16" fill="${theme.secondary}" opacity="0.8" />
          <circle cx="0" cy="30" r="16" fill="${theme.secondary}" opacity="0.8" />
          <circle cx="0" cy="80" r="16" fill="${theme.secondary}" opacity="0.8" />
        </g>
      </g>
    `;
  } else if (diagramType === 1) {
    // Pipeline / Multi-stage flow diagram
    diagramGraphic = `
      <g transform="translate(640, 360)">
        <!-- Stage 1 -->
        <g transform="translate(-320, 0)">
          <circle cx="0" cy="0" r="75" fill="${theme.nodeBg}" stroke="${theme.accent}" stroke-width="3" />
          <rect x="-30" y="-30" width="60" height="60" rx="10" fill="${theme.accent}" opacity="0.8" />
          <text x="0" y="110" fill="#e4e4e7" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">STAGE 1</text>
        </g>

        <path d="M -235 0 L -105 0" stroke="${theme.secondary}" stroke-width="4" />
        <polygon points="-95,0 -115,-8 -115,8" fill="${theme.secondary}" />

        <!-- Stage 2 -->
        <g transform="translate(0, 0)">
          <circle cx="0" cy="0" r="85" fill="${theme.nodeBg}" stroke="${theme.accent}" stroke-width="3.5" />
          <polygon points="0,-40 35,25 -35,25" fill="${theme.secondary}" opacity="0.85" />
          <text x="0" y="125" fill="#ffffff" font-family="system-ui, sans-serif" font-size="17" font-weight="700" text-anchor="middle">PROCESSING</text>
        </g>

        <path d="M 95 0 L 225 0" stroke="${theme.secondary}" stroke-width="4" />
        <polygon points="235,0 215,-8 215,8" fill="${theme.secondary}" />

        <!-- Stage 3 -->
        <g transform="translate(320, 0)">
          <circle cx="0" cy="0" r="75" fill="${theme.nodeBg}" stroke="${theme.accent}" stroke-width="3" />
          <circle cx="0" cy="0" r="32" fill="${theme.accent}" opacity="0.85" />
          <text x="0" y="110" fill="#e4e4e7" font-family="system-ui, sans-serif" font-size="16" font-weight="700" text-anchor="middle">SYNTHESIS</text>
        </g>
      </g>
    `;
  } else if (diagramType === 2) {
    // Hierarchical Network / Tree Graph
    diagramGraphic = `
      <g transform="translate(640, 360)">
        <!-- Top Apex Node -->
        <g transform="translate(0, -140)">
          <rect x="-100" y="-45" width="200" height="90" rx="16" fill="${theme.nodeBg}" stroke="${theme.accent}" stroke-width="3" />
          <text x="0" y="10" fill="#ffffff" font-family="system-ui, sans-serif" font-size="18" font-weight="700" text-anchor="middle">CENTRAL SYSTEM</text>
        </g>

        <!-- Connecting Lines -->
        <path d="M -50 -95 L -260 80" stroke="${theme.secondary}" stroke-width="3" opacity="0.7" />
        <path d="M 0 -95 L 0 80" stroke="${theme.accent}" stroke-width="3" opacity="0.7" />
        <path d="M 50 -95 L 260 80" stroke="${theme.secondary}" stroke-width="3" opacity="0.7" />

        <!-- Child 1 -->
        <g transform="translate(-260, 130)">
          <circle cx="0" cy="0" r="55" fill="${theme.nodeBg}" stroke="${theme.accent}" stroke-width="2.5" />
          <rect x="-20" y="-20" width="40" height="40" rx="8" fill="${theme.accent}" opacity="0.8" />
        </g>

        <!-- Child 2 -->
        <g transform="translate(0, 130)">
          <circle cx="0" cy="0" r="55" fill="${theme.nodeBg}" stroke="${theme.secondary}" stroke-width="2.5" />
          <polygon points="0,-25 22,18 -22,18" fill="${theme.secondary}" opacity="0.8" />
        </g>

        <!-- Child 3 -->
        <g transform="translate(260, 130)">
          <circle cx="0" cy="0" r="55" fill="${theme.nodeBg}" stroke="${theme.accent}" stroke-width="2.5" />
          <circle cx="0" cy="0" r="22" fill="${theme.accent}" opacity="0.8" />
        </g>
      </g>
    `;
  } else {
    // Cyclic Feedback & Iteration Loop
    diagramGraphic = `
      <g transform="translate(640, 360)">
        <!-- Outer Loop Rings -->
        <circle cx="0" cy="0" r="170" fill="none" stroke="${theme.accent}" stroke-width="3" stroke-dasharray="12 8" opacity="0.6" />
        
        <!-- Nodes along circle -->
        <g transform="translate(0, -170)">
          <circle cx="0" cy="0" r="40" fill="${theme.nodeBg}" stroke="${theme.accent}" stroke-width="3" />
          <circle cx="0" cy="0" r="16" fill="${theme.accent}" />
        </g>

        <g transform="translate(170, 0)">
          <circle cx="0" cy="0" r="40" fill="${theme.nodeBg}" stroke="${theme.secondary}" stroke-width="3" />
          <rect x="-14" y="-14" width="28" height="28" rx="6" fill="${theme.secondary}" />
        </g>

        <g transform="translate(0, 170)">
          <circle cx="0" cy="0" r="40" fill="${theme.nodeBg}" stroke="${theme.accent}" stroke-width="3" />
          <polygon points="0,-18 16,12 -16,12" fill="${theme.accent}" />
        </g>

        <g transform="translate(-170, 0)">
          <circle cx="0" cy="0" r="40" fill="${theme.nodeBg}" stroke="${theme.secondary}" stroke-width="3" />
          <circle cx="0" cy="0" r="16" fill="${theme.secondary}" />
        </g>

        <!-- Central Core -->
        <circle cx="0" cy="0" r="70" fill="${theme.nodeBg}" stroke="${theme.accent}" stroke-width="3" />
        <circle cx="0" cy="0" r="30" fill="#ffffff" opacity="0.9" />
      </g>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.bg1}" />
        <stop offset="100%" stop-color="${theme.bg2}" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="24" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
      </pattern>
    </defs>

    <!-- Canvas Background -->
    <rect width="1280" height="720" fill="url(#bgGrad)" />
    <rect width="1280" height="720" fill="url(#grid)" />

    <!-- Ambient Lighting Orbs -->
    <circle cx="280" cy="220" r="180" fill="${theme.accent}" opacity="0.08" filter="url(#glow)" />
    <circle cx="1020" cy="520" r="220" fill="${theme.secondary}" opacity="0.06" filter="url(#glow)" />

    <!-- Pure Central Architectural Diagram -->
    ${diagramGraphic}

    <!-- Minimal Concept Tag (Upper Left) -->
    <g transform="translate(60, 56)">
      <rect x="0" y="0" width="${Math.max(160, safeTitle.length * 10 + 40)}" height="38" rx="19" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
      <circle cx="20" cy="19" r="5" fill="${theme.accent}" />
      <text x="36" y="24" fill="#f4f4f5" font-family="system-ui, sans-serif" font-size="14" font-weight="600">${safeTitle}</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates the infographic storyboard scenes summarizing the video.
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
  const cleanId = extractYouTubeId(videoId);

  if (!forceRegenerate && infographicsCache.has(cleanId)) {
    return {
      infographics: infographicsCache.get(cleanId)!,
      source: 'cache',
      model: TEXT_MODELS[0],
    };
  }

  const meta = videoMetadata || (await getVideoById(cleanId));
  const ai = getGenAI();

  if (!ai) {
    const fallback = generateFallbackInfographics(cleanId, meta);
    infographicsCache.set(cleanId, fallback);
    return {
      infographics: fallback,
      source: 'fallback',
      model: 'template-synthesized',
    };
  }

  const prompt = `You are a visual design director and educational illustrator.
Produce a structured sequence of 4 to 5 visual infographic scenes summarizing this video:
Video Title: "${meta?.title || cleanId}"
Channel: "${meta?.channel || 'YouTube'}"
Description: "${(meta?.description || '').slice(0, 500)}"

Each scene represents a visual slide in an interactive infographic story.
CRITICAL INSTRUCTION FOR VISUAL PROMPTS:
The visualPrompt will be passed directly to an AI image generation model (the nano banana / gemini-3.1-flash-lite-image model).
The image prompt MUST describe a clean, crisp, minimalist educational visualization.
It must explicitly specify:
- Pure graphical diagram, 3D isometric representation, or sleek vector architecture
- Elegant harmonious color accents on clean dark studio background
- NO messy text, NO misspelled alphabet labels, NO fake typography, NO pseudo-words
- Crisp visual iconography, flow arrows, nodes, and geometric structures

Format strictly as a JSON object:
{
  "title": "Short title for the infographic series",
  "overview": "1-2 sentence high-level visual summary of the whole video",
  "items": [
    {
      "stepNumber": 1,
      "title": "Title of Scene 1",
      "caption": "Clear 1-2 sentence explanation of this concept",
      "keyTakeaways": ["Key bullet 1", "Key bullet 2"],
      "timestamp": "01:15",
      "seconds": 75,
      "visualPrompt": "A clean, crisp, minimalist educational vector illustration of [...], 3D isometric diagram, glowing geometric nodes, smooth flowing connections, high contrast on dark slate background, professional modern UI concept art, absolutely no text, no words"
    }
  ]
}`;

  let lastError: unknown = null;

  for (const modelName of TEXT_MODELS) {
    try {
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
      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
        const sanitized: InfographicsData = {
          title: parsed.title || meta?.title || 'Visual Video Summary',
          overview: parsed.overview || 'Visual infographics explaining key concepts from this video.',
          items: parsed.items.map((it: any, idx: number) => ({
            id: `info-${cleanId}-${idx + 1}`,
            stepNumber: it.stepNumber || idx + 1,
            title: it.title || `Concept ${idx + 1}`,
            caption: it.caption || '',
            keyTakeaways: Array.isArray(it.keyTakeaways) ? it.keyTakeaways : [],
            timestamp: it.timestamp || '00:00',
            seconds: typeof it.seconds === 'number' ? it.seconds : timeStringToSeconds(it.timestamp),
            visualPrompt: it.visualPrompt || `Clean modern educational diagram of ${it.title || 'concept'}, sleek 3D isometric visualization, no text`,
            status: 'pending',
          })),
          generatedAt: new Date().toISOString(),
        };

        infographicsCache.set(cleanId, sanitized);
        return {
          infographics: sanitized,
          source: 'gemini',
          model: modelName,
        };
      }
    } catch (err) {
      lastError = err;
      console.warn(`Infographics scene generation with ${modelName} failed:`, err);
    }
  }

  // Fallback if multimodal video fileUri fails: try text-only metadata
  for (const modelName of TEXT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
        contents: prompt,
      });

      const parsed = parseJsonClean(response.text);
      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
        const sanitized: InfographicsData = {
          title: parsed.title || meta?.title || 'Visual Video Summary',
          overview: parsed.overview || 'Visual infographics explaining key concepts from this video.',
          items: parsed.items.map((it: any, idx: number) => ({
            id: `info-${cleanId}-${idx + 1}`,
            stepNumber: it.stepNumber || idx + 1,
            title: it.title || `Concept ${idx + 1}`,
            caption: it.caption || '',
            keyTakeaways: Array.isArray(it.keyTakeaways) ? it.keyTakeaways : [],
            timestamp: it.timestamp || '00:00',
            seconds: typeof it.seconds === 'number' ? it.seconds : timeStringToSeconds(it.timestamp),
            visualPrompt: it.visualPrompt || `Clean modern educational diagram of ${it.title || 'concept'}, sleek 3D isometric visualization, no text`,
            status: 'pending',
          })),
          generatedAt: new Date().toISOString(),
        };

        infographicsCache.set(cleanId, sanitized);
        return {
          infographics: sanitized,
          source: 'gemini',
          model: modelName,
        };
      }
    } catch (err) {
      lastError = err;
    }
  }

  console.warn('All Gemini infographic attempts failed, using fallback:', lastError);
  const fallback = generateFallbackInfographics(cleanId, meta);
  infographicsCache.set(cleanId, fallback);
  return {
    infographics: fallback,
    source: 'fallback',
    model: 'template-synthesized',
  };
}

/**
 * Generates a visual image or diagram for an infographic scene.
 * Uses multi-tier fallback:
 * 1. AI Image generation models (gemini-3.1-flash-lite-image / imagen)
 * 2. Gemini 2.5 Flash SVG diagram generation (free tier, no quota limit errors)
 * 3. Procedural vector architecture diagram generator
 */
export async function generateInfographicImage(
  prompt: string,
  title: string = 'Infographic Visualization',
  caption: string = '',
  stepNumber: number = 1
): Promise<{ imageUrl: string; source: 'ai-image' | 'gemini-svg' | 'vector-fallback'; model: string }> {
  // Check image cache
  const cacheKey = `${prompt.trim()}-${stepNumber}`;
  if (imageCache.has(cacheKey)) {
    return {
      imageUrl: imageCache.get(cacheKey)!,
      source: 'ai-image',
      model: 'cache',
    };
  }

  const ai = getGenAI();

  if (!ai) {
    const fallbackSvg = generateCrispSvgInfographic(title, caption, stepNumber);
    return {
      imageUrl: fallbackSvg,
      source: 'vector-fallback',
      model: 'svg-renderer',
    };
  }

  // Tier 1: Try AI image models (in case user has image generation quota)
  const cleanImagePrompt = `${prompt}. High quality, crisp minimalist educational diagram, 16:9 aspect ratio, clean modern vector or 3D isometric render, no blurry artifacts, strictly NO text, NO words, NO letters.`;
  const imageModelsToTry = ['gemini-3.1-flash-lite-image', 'imagen-3.0-generate-002'];

  for (const model of imageModelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [{ text: cleanImagePrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '16:9',
          },
        },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mime};base64,${part.inlineData.data}`;
            imageCache.set(cacheKey, imageUrl);
            return {
              imageUrl,
              source: 'ai-image',
              model,
            };
          }
        }
      }
    } catch {
      // 429 quota or unsupported model on free tier - seamlessly proceed to Tier 2
    }
  }

  // Tier 2: Try generating an SVG diagram with Gemini 2.5 Flash (abundant free tier quota)
  try {
    const svgPrompt = `You are a technical diagram designer.
Generate a valid, clean SVG 16:9 diagram (viewBox="0 0 1280 720") representing:
Topic: "${title}"
Details: "${caption}"

Requirements:
- Return ONLY the raw SVG code from <svg ...> to </svg>. No markdown formatting, no code fence, no text outside.
- Background: deep dark slate fill="#09090b" with a subtle grid.
- Visual elements: modern flowchart, neural network blocks, sequence pipes, or isometric components with glowing red (#ef4444) and amber/blue accents.
- NO paragraphs of text. At most 1-2 word node labels.
- Crisp lines, rounded corners, clean icons.`;

    const svgRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: svgPrompt,
      config: {
        temperature: 0.2,
      },
    });

    let rawSvg = svgRes.text?.trim() || '';
    rawSvg = rawSvg.replace(/^```xml\s*/i, '').replace(/^```svg\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    const svgStart = rawSvg.indexOf('<svg');
    const svgEnd = rawSvg.lastIndexOf('</svg>');
    if (svgStart !== -1 && svgEnd !== -1 && svgEnd > svgStart) {
      const cleanSvg = rawSvg.substring(svgStart, svgEnd + 6);
      const encoded = `data:image/svg+xml;utf8,${encodeURIComponent(cleanSvg)}`;
      imageCache.set(cacheKey, encoded);
      return {
        imageUrl: encoded,
        source: 'gemini-svg',
        model: 'gemini-2.5-flash',
      };
    }
  } catch {
    // Proceed to Tier 3 procedural diagram engine
  }

  // Tier 3: Ultra-crisp procedural vector infographic diagram
  const fallbackSvg = generateCrispSvgInfographic(title, caption, stepNumber);
  imageCache.set(cacheKey, fallbackSvg);
  return {
    imageUrl: fallbackSvg,
    source: 'vector-fallback',
    model: 'crisp-vector-engine',
  };
}

/**
 * Fallback infographic templates when offline or without API keys
 */
function generateFallbackInfographics(videoId: string, meta?: VideoItem | null): InfographicsData {
  const title = meta?.title || 'Interactive Video Concept';
  const steps = [
    {
      stepNumber: 1,
      title: 'Foundations & Architecture',
      caption: 'Understanding the core architecture, problem statement, and foundational concepts introduced.',
      keyTakeaways: [
        'Primary purpose and problem framing',
        'High-level structural breakdown',
      ],
      timestamp: '00:30',
      seconds: 30,
      visualPrompt: `Minimalist 3D isometric overview of ${title}, glowing clean nodes and foundational layer, 16:9, no text`,
    },
    {
      stepNumber: 2,
      title: 'Workflow & Process Pipeline',
      caption: 'Step-by-step execution flow illustrating how inputs transform into structured outputs.',
      keyTakeaways: [
        'Sequential pipeline progression',
        'Data flow through operational stages',
      ],
      timestamp: '02:45',
      seconds: 165,
      visualPrompt: `Clean vector flow diagram showing step-by-step process for ${title}, sleek arrows and stage nodes, no text`,
    },
    {
      stepNumber: 3,
      title: 'Core Mechanism & Demonstrations',
      caption: 'In-depth visual analysis of the central mechanism in action during demonstrations.',
      keyTakeaways: [
        'Active component interactions',
        'Real-world implementation behavior',
      ],
      timestamp: '05:10',
      seconds: 310,
      visualPrompt: `High-contrast modern technology diagram illustrating the core mechanics of ${title}, soft neon accents, no text`,
    },
    {
      stepNumber: 4,
      title: 'Key Insights & Best Practices',
      caption: 'Critical takeaways, practical trade-offs, and rules of thumb for applying the material.',
      keyTakeaways: [
        'Crucial trade-offs and optimizations',
        'Common pitfalls to avoid',
      ],
      timestamp: '08:00',
      seconds: 480,
      visualPrompt: `Clean checklist and balance scale vector illustration for ${title}, minimalist geometry, no text`,
    },
  ];

  return {
    title: `Visual Summary: ${title}`,
    overview: `A multi-stage visual summary synthesizing the key concepts, mechanisms, and takeaways from ${meta?.channel || 'the video'}.`,
    items: steps.map((s, idx) => ({
      id: `fallback-info-${videoId}-${idx + 1}`,
      stepNumber: s.stepNumber,
      title: s.title,
      caption: s.caption,
      keyTakeaways: s.keyTakeaways,
      timestamp: s.timestamp,
      seconds: s.seconds,
      visualPrompt: s.visualPrompt,
      status: 'pending',
    })),
    generatedAt: new Date().toISOString(),
  };
}
