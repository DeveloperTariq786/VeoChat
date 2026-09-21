import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const DEFAULT_SUGGESTIONS = [
  'Transformer architecture explained',
  'Next.js 15 complete course',
  'How to make cold brew coffee',
  'System design interview guide',
  'Deep learning with PyTorch',
  'Learn Rust in 1 hour',
];

interface WatchedVideoInput {
  title: string;
  channel?: string;
}

interface SuggestionRequestBody {
  queries?: string[];
  watchedVideos?: WatchedVideoInput[];
}

function generateHeuristicSuggestions(
  queries: string[],
  watchedVideos: WatchedVideoInput[]
): string[] {
  const allTexts: string[] = [
    ...queries,
    ...watchedVideos.map((v) => v.title || ''),
  ]
    .map((t) => t.trim())
    .filter(Boolean);

  if (allTexts.length === 0) {
    return DEFAULT_SUGGESTIONS;
  }

  // Common topic recognition patterns
  const patterns: { regex: RegExp; suggestions: string[] }[] = [
    {
      regex: /\brust\b/i,
      suggestions: [
        'Rust memory safety and borrow checker',
        'Building async CLI tools in Rust',
        'Rust vs Go performance comparison',
        'Rust web development with Axum',
        'Rust data structures and algorithms',
        'Learn Rust in 1 hour',
      ],
    },
    {
      regex: /\b(next\.?js|react|reactjs)\b/i,
      suggestions: [
        'Next.js 15 App Router deep dive',
        'React 19 Server Actions practical guide',
        'Full stack Next.js with Tailwind & Auth',
        'Next.js performance and caching masterclass',
        'Building SaaS with Next.js 15',
        'Next.js 15 complete course',
      ],
    },
    {
      regex: /\b(python|django|fastapi)\b/i,
      suggestions: [
        'Python FastAPI production tutorial',
        'Python concurrency and asyncio explained',
        'Advanced Python design patterns',
        'Automating tasks with Python scripts',
        'Python data analysis with Pandas',
        'Python full stack web app tutorial',
      ],
    },
    {
      regex: /\b(machine learning|deep learning|pytorch|tensorflow|ai|llm|transformer)\b/i,
      suggestions: [
        'Fine-tuning open source LLMs guide',
        'Transformer attention mechanism from scratch',
        'PyTorch deep learning practical project',
        'RAG architecture with LangChain and vector DB',
        'Computer vision with PyTorch',
        'Transformer architecture explained',
      ],
    },
    {
      regex: /\b(docker|kubernetes|k8s|devops|ci\/cd|cloud)\b/i,
      suggestions: [
        'Docker containerization best practices',
        'Kubernetes cluster setup for beginners',
        'CI/CD pipeline with GitHub Actions',
        'Deploying microservices to the cloud',
        'Terraform infrastructure as code tutorial',
        'DevOps roadmap for 2025',
      ],
    },
    {
      regex: /\b(system design|architecture|distributed systems)\b/i,
      suggestions: [
        'System design interview guide',
        'Designing high-scale caching with Redis',
        'Database sharding and replication explained',
        'Microservices vs monolith architecture',
        'Event-driven architecture with Kafka',
        'Load balancer algorithms comparison',
      ],
    },
    {
      regex: /\b(typescript|javascript|js|ts|node\.?js)\b/i,
      suggestions: [
        'TypeScript advanced generics and types',
        'Node.js microservices architecture',
        'Modern JavaScript event loop explained',
        'Full stack TypeScript application tutorial',
        'Clean code architecture in TypeScript',
        'Async JavaScript promises and async await',
      ],
    },
  ];

  // Check matching patterns
  const matchedSuggestions: string[] = [];
  for (const item of patterns) {
    if (allTexts.some((txt) => item.regex.test(txt))) {
      matchedSuggestions.push(...item.suggestions);
    }
  }

  if (matchedSuggestions.length >= 6) {
    return Array.from(new Set(matchedSuggestions)).slice(0, 6);
  }

  // Fallback heuristic derived from the most recent queries
  const dynamicSuggestions: string[] = [...matchedSuggestions];
  const primaryQuery = queries[0] || watchedVideos[0]?.title || '';
  const cleanQuery = primaryQuery
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .slice(0, 4)
    .join(' ');

  if (cleanQuery) {
    const templates = [
      `${cleanQuery} complete roadmap`,
      `${cleanQuery} best practices and tips`,
      `Building a real project with ${cleanQuery}`,
      `${cleanQuery} common mistakes to avoid`,
      `${cleanQuery} architecture explained`,
      `${cleanQuery} practical tutorial`,
    ];
    for (const t of templates) {
      if (!dynamicSuggestions.includes(t)) {
        dynamicSuggestions.push(t);
      }
    }
  }

  // Pad with default suggestions if needed
  for (const def of DEFAULT_SUGGESTIONS) {
    if (dynamicSuggestions.length < 6 && !dynamicSuggestions.includes(def)) {
      dynamicSuggestions.push(def);
    }
  }

  return dynamicSuggestions.slice(0, 6);
}

export async function handleSuggestions(req: NextRequest) {
  try {
    let body: SuggestionRequestBody = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const rawQueries = Array.isArray(body.queries) ? body.queries : [];
    const queries = rawQueries
      .filter((q): q is string => typeof q === 'string')
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .slice(0, 10);

    const rawWatched = Array.isArray(body.watchedVideos) ? body.watchedVideos : [];
    const watchedVideos: WatchedVideoInput[] = rawWatched
      .filter((v): v is WatchedVideoInput => typeof v?.title === 'string')
      .map((v) => ({
        title: v.title.trim(),
        channel: typeof v.channel === 'string' ? v.channel.trim() : undefined,
      }))
      .filter((v) => v.title.length > 0)
      .slice(0, 10);

    // If user has no previous queries or watched videos, return default popular suggestions
    if (queries.length === 0 && watchedVideos.length === 0) {
      return NextResponse.json({
        suggestions: DEFAULT_SUGGESTIONS,
        isPersonalized: false,
        source: 'default',
      });
    }

    // Attempt Gemini AI suggestions if API key is present
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are a YouTube search assistant. The user has previously searched for or watched these topics:
Recent searches: ${queries.slice(0, 5).join(', ')}
Watched videos: ${watchedVideos.slice(0, 5).map((v) => v.title).join(', ')}

Suggest 6 natural, engaging, and relevant search queries for YouTube based on their past searches and videos.
Rules:
- Directly relate each suggestion to concepts, languages, frameworks, or themes they explored (e.g. if they searched Rust, suggest next steps in Rust; if Next.js, suggest Next.js topics).
- Sound like authentic, high-value queries a developer or learner would search on YouTube.
- 3 to 7 words per query.
- Output strictly a JSON array of 6 string queries, nothing else.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text?.trim() || '';
        if (text) {
          const parsed = JSON.parse(text);
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed.every((item) => typeof item === 'string')
          ) {
            const cleanSuggestions = parsed
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0)
              .slice(0, 6);

            if (cleanSuggestions.length >= 4) {
              return NextResponse.json({
                suggestions: cleanSuggestions,
                isPersonalized: true,
                source: 'gemini',
              });
            }
          }
        }
      } catch (geminiError) {
        console.warn('Gemini suggestions fallback:', geminiError);
      }
    }

    // Heuristic fallback matching keywords and topics
    const heuristic = generateHeuristicSuggestions(queries, watchedVideos);
    return NextResponse.json({
      suggestions: heuristic,
      isPersonalized: true,
      source: 'heuristic',
    });
  } catch (error: unknown) {
    console.error('Suggestions route error:', error);
    return NextResponse.json({
      suggestions: DEFAULT_SUGGESTIONS,
      isPersonalized: false,
      source: 'fallback',
    });
  }
}
