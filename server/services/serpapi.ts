import { GoogleGenAI } from '@google/genai';
import { VideoItem } from '@/types/video';
import {
  MAX_VIDEO_DURATION_SECONDS,
  parseDurationToSeconds,
  isWithinAllowedDuration,
} from '@/lib/videoDuration';

export {
  MAX_VIDEO_DURATION_SECONDS,
  parseDurationToSeconds,
  isWithinAllowedDuration,
};

// In-memory cache for video details discovered across searches
const videoCache = new Map<string, VideoItem>();

/**
 * Checks if a string is a genuine video description rather than YouTube's default meta fallback or placeholder
 */
export function isValidVideoDescription(desc?: string): boolean {
  if (!desc) return false;
  const trimmed = desc.trim();
  if (trimmed.length < 5) return false;
  const lower = trimmed.toLowerCase();

  // YouTube's platform boilerplate slogans & placeholder messages
  if (
    lower.includes('enjoy the videos and music that you love') ||
    lower.includes('enjoy the videos and music you love') ||
    lower.includes('upload original content and share it all') ||
    lower.includes('friends, family and the world on youtube') ||
    lower.includes('in phase 2') ||
    lower.includes('embedded youtube video') ||
    lower.includes('ask veochat ai questions') ||
    lower === 'youtube'
  ) {
    return false;
  }

  return true;
}

function cleanHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"');
}

/**
 * Extracts the real video description and metadata from YouTube watch HTML
 */
function extractFromYouTubeWatchHtml(html: string): {
  description: string;
  views?: string;
  duration?: string;
  publishedAt?: string;
} {
  let description = '';
  let views = '';
  let duration = '';
  let publishedAt = '';

  // 1. Try extracting shortDescription from videoDetails in ytInitialPlayerResponse
  try {
    const shortDescMatch = html.match(/"shortDescription"\s*:\s*"((?:\\.|[^"\\])*)"/);
    if (shortDescMatch && shortDescMatch[1]) {
      try {
        const decoded = JSON.parse(`"${shortDescMatch[1]}"`);
        if (isValidVideoDescription(decoded)) {
          description = decoded.trim();
        }
      } catch {
        const cleaned = cleanHtmlEntities(shortDescMatch[1]);
        if (isValidVideoDescription(cleaned)) {
          description = cleaned.trim();
        }
      }
    }
  } catch {
    // Continue
  }

  // 2. Try JSON-LD script blocks (<script type="application/ld+json">)
  if (!description) {
    try {
      const jsonLdMatches = html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
      for (const match of jsonLdMatches) {
        if (match[1]) {
          try {
            const parsed = JSON.parse(match[1]);
            const d = parsed?.description || (Array.isArray(parsed) ? parsed[0]?.description : undefined);
            if (d && isValidVideoDescription(d)) {
              description = d.trim();
              if (parsed.uploadDate) publishedAt = parsed.uploadDate;
              if (parsed.duration) duration = parsed.duration;
              break;
            }
          } catch {
            // Ignore JSON parse error
          }
        }
      }
    } catch {
      // Continue
    }
  }

  // 3. Try parsing itemprop="description"
  if (!description) {
    const itempropMatch = html.match(/<meta\s+itemprop="description"\s+content="([^"]*)"/i);
    if (itempropMatch && itempropMatch[1]) {
      const cleaned = cleanHtmlEntities(itempropMatch[1]);
      if (isValidVideoDescription(cleaned)) {
        description = cleaned.trim();
      }
    }
  }

  // 4. Try parsing meta name="description" or property="og:description" ONLY if not generic YouTube boilerplate
  if (!description) {
    const metaMatch =
      html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) ||
      html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
    if (metaMatch && metaMatch[1]) {
      const cleaned = cleanHtmlEntities(metaMatch[1]);
      if (isValidVideoDescription(cleaned)) {
        description = cleaned.trim();
      }
    }
  }

  // Extract view count if present
  const viewCountMatch = html.match(/"viewCount"\s*:\s*"(\d+)"/) || html.match(/"viewCount":"(\d+)"/);
  if (viewCountMatch && viewCountMatch[1]) {
    const count = parseInt(viewCountMatch[1], 10);
    if (!isNaN(count) && count > 0) {
      views = formatViews(count);
    }
  }

  return { description, views, duration, publishedAt };
}

/**
 * Synthesizes a grounded, informative video description using Gemini if HTML scraping is unavailable
 */
async function generateAIVideoDescription(
  videoId: string,
  title: string,
  channel: string
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return `Educational video guide exploring "${title}" presented by ${channel}.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        {
          fileData: {
            fileUri: `https://www.youtube.com/watch?v=${videoId}`,
            mimeType: 'video/mp4',
          },
          processing: 'agentic',
        } as any,
        {
          text: `Provide a concise 2-sentence informative description summarizing what this video ("${title}" by ${channel}) is about and its main concepts. Do not include quotes, markdown bolding, or generic filler like "Enjoy the videos". Return only the direct overview text.`,
        },
      ],
    });

    const text = response.text?.trim();
    if (text && isValidVideoDescription(text)) {
      return text;
    }
  } catch {
    // If multimodal fileData fails, use fast text generation
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const res = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Provide a concise 2-sentence overview describing what viewers learn in the video titled "${title}" by ${channel}. Focus directly on the educational or practical substance. Avoid quotes or generic filler.`,
      });
      const t = res.text?.trim();
      if (t && isValidVideoDescription(t)) {
        return t;
      }
    } catch {
      // Fall through to topic synthesis
    }
  }

  return `In-depth exploration of "${title}" presented by ${channel}.`;
}

/**
 * Extract YouTube 11-character video ID from a YouTube link, embed URL, or raw ID.
 */
export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : trimmed;
}

/**
 * Clean and format view count strings or numbers.
 */
function formatViews(views: unknown): string {
  if (typeof views === 'number') {
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
    return `${views} views`;
  }
  if (typeof views === 'string' && views.trim().length > 0) {
    if (views.toLowerCase().includes('view')) return views;
    return `${views} views`;
  }
  return 'Views unavailable';
}

/**
 * Curated fallback sample catalog for demonstration when no SERPAPI_KEY is configured in .env.
 * Ensures the applet is immediately interactive, responsive, and testable.
 */
const SAMPLE_VIDEOS: VideoItem[] = [
  {
    id: 'an5X4FmsbXo',
    title: 'The Ultimate Guide to Making Cold Brew Coffee at Home',
    thumbnail: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=640&auto=format&fit=crop&q=80',
    channel: 'James Hoffmann Enthusiast',
    channelUrl: 'https://www.youtube.com/@JamesHoffmann',
    views: '1.8M views',
    duration: '14:22',
    link: 'https://www.youtube.com/watch?v=an5X4FmsbXo',
    description: 'Learn the exact coffee-to-water ratio, grind size, brew time, and filtration techniques for velvety smooth cold brew coffee with zero bitterness.',
    publishedAt: '2 months ago',
  },
  {
    id: 'lG0Ys-2d4MA',
    title: 'How Cold Brew Actually Works: Coffee Chemistry Explained',
    thumbnail: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=640&auto=format&fit=crop&q=80',
    channel: 'Coffee Science Lab',
    views: '840K views',
    duration: '9:45',
    link: 'https://www.youtube.com/watch?v=lG0Ys-2d4MA',
    description: 'Why is cold brew sweeter and less acidic than iced coffee? We analyze extraction rates at 4°C vs 93°C under a refractometer.',
    publishedAt: '5 months ago',
  },
  {
    id: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    channel: 'Rick Astley',
    channelUrl: 'https://www.youtube.com/@RickAstleyYT',
    views: '1.5B views',
    duration: '3:33',
    link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'The official video for Never Gonna Give You Up by Rick Astley. Restored in 4K resolution.',
    publishedAt: '14 years ago',
  },
  {
    id: 'SqcY0GlETPk',
    title: 'React 19 & Next.js 15 Quickstart - Essential Concepts Explained',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=640&auto=format&fit=crop&q=80',
    channel: 'Web Dev Mastery',
    views: '520K views',
    duration: '18:14',
    link: 'https://www.youtube.com/watch?v=SqcY0GlETPk',
    description: 'Deep dive into server actions, App Router paradigms, modern caching strategies, and edge rendering.',
    publishedAt: '3 weeks ago',
  },
  {
    id: 'jfKfPfyJRdk',
    title: 'Lofi Focus Session — Chill Beats to Relax & Study',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=640&auto=format&fit=crop&q=80',
    channel: 'Lofi Girl',
    channelUrl: 'https://www.youtube.com/@LofiGirl',
    views: '68M views',
    duration: '15:30',
    link: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    description: 'Peaceful lofi hip hop beats to study, chill, focus, code, or relax to.',
    publishedAt: '2 weeks ago',
  },
  {
    id: 'aircAruvnKk',
    title: 'Neural Networks from Scratch - 3Blue1Brown Chapter 1',
    thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=640&auto=format&fit=crop&q=80',
    channel: '3Blue1Brown',
    channelUrl: 'https://www.youtube.com/@3blue1brown',
    views: '16M views',
    duration: '19:13',
    link: 'https://www.youtube.com/watch?v=aircAruvnKk',
    description: 'What are the building blocks of deep learning? An intuitive visual exploration of multi-layer perceptrons and weights.',
    publishedAt: '4 years ago',
  },
];

// Seed initial sample videos into cache
SAMPLE_VIDEOS.forEach((v) => videoCache.set(v.id, v));

/**
 * Searches YouTube videos via SerpAPI (engine=youtube).
 * Falls back to demo results if no SERPAPI_KEY is configured.
 */
export async function searchYouTube(query: string): Promise<{
  videos: VideoItem[];
  source: 'serpapi' | 'demo';
  message?: string;
}> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error('Search query is required.');
  }

  const apiKey = process.env.SERPAPI_KEY?.trim();

  // If SerpAPI key is available, execute real request to SerpAPI
  if (apiKey && apiKey.length > 0) {
    try {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'youtube');
      url.searchParams.set('search_query', trimmedQuery);
      url.searchParams.set('api_key', apiKey);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('SerpAPI rate limit reached. Please try again in a few moments.');
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid SerpAPI key or unauthorized request. Please verify your SERPAPI_KEY in settings.');
        }
        const errText = await response.text();
        throw new Error(`SerpAPI error (${response.status}): ${errText.slice(0, 150)}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`SerpAPI returned an error: ${data.error}`);
      }

      const rawResults = data.video_results || [];
      const parsedVideos: VideoItem[] = [];

      for (const item of rawResults) {
        const rawLink = item.link || '';
        const videoId = extractYouTubeId(item.id || rawLink);
        if (!videoId) continue;

        const duration = item.length || item.duration || 'Video';

        // Internally limit search to videos that have a length of 20 minutes or below (<= 1200 seconds)
        if (!isWithinAllowedDuration(duration)) {
          continue;
        }

        // Determine thumbnail
        let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        if (typeof item.thumbnail === 'string' && item.thumbnail.startsWith('http')) {
          thumbnail = item.thumbnail;
        } else if (item.thumbnail?.static) {
          thumbnail = item.thumbnail.static;
        } else if (item.thumbnail?.rich) {
          thumbnail = item.thumbnail.rich;
        }

        // Determine channel name
        let channel = 'YouTube Creator';
        let channelUrl = '';
        if (typeof item.channel === 'string') {
          channel = item.channel;
        } else if (item.channel?.name) {
          channel = item.channel.name;
          channelUrl = item.channel.link || '';
        }

        const video: VideoItem = {
          id: videoId,
          title: item.title || 'Untitled Video',
          thumbnail,
          channel,
          channelUrl,
          views: formatViews(item.views || item.views_original),
          duration,
          link: item.link || `https://www.youtube.com/watch?v=${videoId}`,
          description: item.description || (item.snippets ? item.snippets.join(' ') : ''),
          publishedAt: item.published_date || '',
        };

        // Cache video for instant lookup on /video/:id
        videoCache.set(videoId, video);
        parsedVideos.push(video);
      }

      return {
        videos: parsedVideos,
        source: 'serpapi',
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[SerpAPI] Live query failed (${errorMsg}), falling back to simulated results.`);
      // If live search fails due to key/rate limit, fall through to demo mode with informative warning
      const filteredFallback = filterFallbackVideos(trimmedQuery);
      return {
        videos: filteredFallback,
        source: 'demo',
        message: `SerpAPI Notice: ${errorMsg}. Showing preview results.`,
      };
    }
  }

  // When SERPAPI_KEY is not configured, supply relevant demo results
  const filteredVideos = filterFallbackVideos(trimmedQuery);
  return {
    videos: filteredVideos,
    source: 'demo',
    message: 'Demo Mode: SERPAPI_KEY is not configured in .env. To get live YouTube search results, add your SERPAPI_KEY in settings.',
  };
}

/**
 * Filter or dynamically synthesize fallback videos for any user query to allow full UX testing.
 * Strictly enforces that all returned fallback videos are <= 20 minutes.
 */
function filterFallbackVideos(query: string): VideoItem[] {
  const q = query.toLowerCase();
  const matched = SAMPLE_VIDEOS.filter(
    (v) =>
      isWithinAllowedDuration(v.duration) &&
      (v.title.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q) ||
        v.channel.toLowerCase().includes(q))
  );

  if (matched.length >= 2) {
    return matched;
  }

  // Generate dynamic contextual video items matching the query so the user gets realistic results for ANY query (all <= 20 mins)
  const queryWords = query.trim().split(/\s+/).slice(0, 4).join(' ');
  const dynamicResults: VideoItem[] = [
    {
      id: 'L_LUpnjgPso',
      title: `${query}: Complete Breakdown & Beginner Guide`,
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=640&auto=format&fit=crop&q=80',
      channel: 'Tech & Knowledge Hub',
      views: '412K views',
      duration: '18:30',
      link: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
      description: `Comprehensive explanation covering all fundamentals of ${queryWords}. Includes timestamped chapters and practical tips.`,
      publishedAt: '1 month ago',
    },
    {
      id: 'kJQP7kiw5Fk',
      title: `Top 5 Tips for Mastering ${queryWords}`,
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=640&auto=format&fit=crop&q=80',
      channel: 'Deep Dive Studio',
      views: '189K views',
      duration: '11:15',
      link: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      description: `Step-by-step masterclass covering real-world methods, common mistakes to avoid, and expert workflows.`,
      publishedAt: '3 weeks ago',
    },
    {
      id: 'fJ9rUzIMcZQ',
      title: `The Science & Art of ${queryWords} Explained in 10 Minutes`,
      thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=640&auto=format&fit=crop&q=80',
      channel: 'Insightful Minds',
      views: '950K views',
      duration: '10:04',
      link: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
      description: `Visual walkthrough breaking down complex ideas into simple, intuitive concepts anyone can understand.`,
      publishedAt: '6 months ago',
    },
    ...matched,
    ...SAMPLE_VIDEOS.filter((v) => isWithinAllowedDuration(v.duration)).slice(0, 3),
  ];

  // Cache them all and return only those <= 20 minutes
  const allowedResults = dynamicResults.filter((v) => isWithinAllowedDuration(v.duration));
  allowedResults.forEach((v) => videoCache.set(v.id, v));
  return allowedResults;
}

/**
 * Retrieves metadata for a single video by its YouTube ID.
 * Reuses the cached search result or queries YouTube's official oEmbed endpoint.
 */
export async function getVideoById(id: string): Promise<VideoItem | null> {
  const cleanId = extractYouTubeId(id);
  if (!cleanId) return null;

  // 1. Check in-memory cache (only use cached item if description is valid)
  if (videoCache.has(cleanId)) {
    const cached = videoCache.get(cleanId)!;
    if (isValidVideoDescription(cached.description)) {
      return cached;
    }
  }

  // 2. Fetch from official YouTube oEmbed endpoint (free, no auth required)
  try {
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${cleanId}&format=json`;
    const response = await fetch(oEmbedUrl);
    if (response.ok) {
      const data = await response.json();
      const title = data.title || 'YouTube Video';
      const channel = data.author_name || 'YouTube Creator';
      const channelUrl = data.author_url || `https://www.youtube.com/watch?v=${cleanId}`;
      const thumbnail = data.thumbnail_url || `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;

      let description = '';
      let views = '';
      let duration = '';
      let publishedAt = '';

      try {
        const watchRes = await fetch(`https://www.youtube.com/watch?v=${cleanId}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
        if (watchRes.ok) {
          const html = await watchRes.text();
          const parsed = extractFromYouTubeWatchHtml(html);
          if (parsed.description && isValidVideoDescription(parsed.description)) {
            description = parsed.description;
          }
          if (parsed.views) views = parsed.views;
          if (parsed.duration) duration = parsed.duration;
          if (parsed.publishedAt) publishedAt = parsed.publishedAt;
        }
      } catch (e) {
        // Silently continue if HTML fetch fails
      }

      // If description was empty or rejected as YouTube platform slogan, generate grounded AI overview
      if (!isValidVideoDescription(description)) {
        description = await generateAIVideoDescription(cleanId, title, channel);
      }

      const video: VideoItem = {
        id: cleanId,
        title,
        thumbnail,
        channel,
        channelUrl,
        views,
        duration,
        link: `https://www.youtube.com/watch?v=${cleanId}`,
        description,
        publishedAt,
      };
      videoCache.set(cleanId, video);
      return video;
    }
  } catch (err) {
    console.warn(`[YouTube oEmbed] Failed to retrieve metadata for ID: ${cleanId}`, err);
  }

  // 3. Fallback generic representation with direct player embed
  const fallbackDesc = await generateAIVideoDescription(
    cleanId,
    `Video (${cleanId})`,
    'YouTube Creator'
  );

  const fallbackVideo: VideoItem = {
    id: cleanId,
    title: `YouTube Video (${cleanId})`,
    thumbnail: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
    channel: 'YouTube Creator',
    channelUrl: `https://www.youtube.com/watch?v=${cleanId}`,
    views: '',
    duration: '',
    link: `https://www.youtube.com/watch?v=${cleanId}`,
    description: fallbackDesc,
  };
  videoCache.set(cleanId, fallbackVideo);
  return fallbackVideo;
}

/**
 * Clean a video title to extract core topic keywords for searching related content
 */
function extractCoreTopic(title?: string): string {
  if (!title) return 'educational guide';
  return title
    .replace(/[\[\(].*?[\]\)]/g, '') // remove bracketed text like [Official Video], (4K)
    .replace(/#\w+/g, '') // remove hashtags
    .replace(/\|\s*.*$/g, '') // remove "| Channel Name"
    .replace(/[-–—]\s*.*$/g, '') // remove trailing sub-clauses
    .replace(/\b(official|video|audio|lyrics|hd|4k|remastered|full episode)\b/gi, '')
    .trim() || title;
}

/**
 * Get YouTube video recommendations related to the current video.
 * Uses SerpApi engine=youtube or contextual fallback.
 */
export async function getRelatedRecommendations(
  videoId: string,
  videoMetadata?: VideoItem | null
): Promise<{
  recommendations: Array<VideoItem & { relevanceReason?: string }>;
  topic: string;
  source: 'serpapi' | 'demo';
  message?: string;
}> {
  const cleanId = extractYouTubeId(videoId);
  const metadata = videoMetadata || (cleanId ? await getVideoById(cleanId) : null);
  const rawTitle = metadata?.title || '';
  const topic = extractCoreTopic(rawTitle) || 'technology and science';

  const apiKey = process.env.SERPAPI_KEY?.trim();

  if (apiKey && apiKey.length > 0) {
    try {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'youtube');
      url.searchParams.set('search_query', `${topic} related tutorials guide`);
      url.searchParams.set('api_key', apiKey);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawResults = data.video_results || [];
        const recommendations: Array<VideoItem & { relevanceReason?: string }> = [];

        for (const item of rawResults) {
          const itemVid = extractYouTubeId(item.id || item.link || '');
          if (!itemVid || itemVid === cleanId) continue;

          const duration = item.length || item.duration || 'Video';
          if (!isWithinAllowedDuration(duration)) continue;

          let thumbnail = `https://i.ytimg.com/vi/${itemVid}/hqdefault.jpg`;
          if (typeof item.thumbnail === 'string' && item.thumbnail.startsWith('http')) {
            thumbnail = item.thumbnail;
          } else if (item.thumbnail?.static) {
            thumbnail = item.thumbnail.static;
          }

          let channel = 'YouTube Creator';
          let channelUrl = '';
          if (typeof item.channel === 'string') {
            channel = item.channel;
          } else if (item.channel?.name) {
            channel = item.channel.name;
            channelUrl = item.channel.link || '';
          }

          const recVideo: VideoItem & { relevanceReason?: string } = {
            id: itemVid,
            title: item.title || 'Related Video',
            thumbnail,
            channel,
            channelUrl,
            views: formatViews(item.views || item.views_original),
            duration,
            link: item.link || `https://www.youtube.com/watch?v=${itemVid}`,
            description: item.description || (item.snippets ? item.snippets.join(' ') : ''),
            publishedAt: item.published_date || '',
            relevanceReason: `Recommended based on "${topic}"`,
          };

          videoCache.set(itemVid, recVideo);
          recommendations.push(recVideo);

          if (recommendations.length >= 10) break;
        }

        if (recommendations.length > 0) {
          return {
            recommendations,
            topic,
            source: 'serpapi',
          };
        }
      }
    } catch (err) {
      console.warn('[SerpAPI] Related recommendations query failed, generating contextual fallback:', err);
    }
  }

  // Synthesize rich, contextual fallback recommendations for the video topic
  const fallbackVideos = generateFallbackRecommendations(cleanId, topic, metadata);
  return {
    recommendations: fallbackVideos,
    topic,
    source: 'demo',
    message: apiKey ? 'Showing contextual related recommendations' : 'Demo Mode: SERPAPI_KEY not set. Showing contextual related recommendations.',
  };
}

function generateFallbackRecommendations(
  currentId: string,
  topic: string,
  metadata?: VideoItem | null
): Array<VideoItem & { relevanceReason?: string }> {
  const basePool = SAMPLE_VIDEOS.filter((v) => v.id !== currentId && isWithinAllowedDuration(v.duration));

  const contextualItems: Array<VideoItem & { relevanceReason?: string }> = [
    {
      id: 'L_LUpnjgPso',
      title: `${topic}: Deep Dive & Advanced Concepts Explained`,
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=640&auto=format&fit=crop&q=80',
      channel: metadata?.channel ? `${metadata.channel} Companion` : 'Tech & Science Academy',
      views: '620K views',
      duration: '16:45',
      link: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
      description: `Comprehensive analysis expanding upon key principles of ${topic} with practical examples.`,
      publishedAt: '2 months ago',
      relevanceReason: 'Direct topic continuation & deeper dive',
    },
    {
      id: 'kJQP7kiw5Fk',
      title: `The Architecture & Key Mechanics of ${topic}`,
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=640&auto=format&fit=crop&q=80',
      channel: 'Insight & Engineering',
      views: '340K views',
      duration: '12:20',
      link: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      description: `Exploring the underlying mechanics, methodology, and practical tradeoffs in ${topic}.`,
      publishedAt: '3 weeks ago',
      relevanceReason: 'Architectural overview of concepts',
    },
    {
      id: 'fJ9rUzIMcZQ',
      title: `Top 5 Common Mistakes in ${topic} and How to Avoid Them`,
      thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=640&auto=format&fit=crop&q=80',
      channel: 'Masterclass Network',
      views: '890K views',
      duration: '11:05',
      link: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
      description: `Real-world troubleshooting, optimizations, and best practices regarding ${topic}.`,
      publishedAt: '4 months ago',
      relevanceReason: 'Common pitfalls and best practices',
    },
    {
      id: 'lG0Ys-2d4MA',
      title: `Modern Case Studies: How Professionals Apply ${topic}`,
      thumbnail: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=640&auto=format&fit=crop&q=80',
      channel: 'Applied Knowledge Lab',
      views: '410K views',
      duration: '14:10',
      link: 'https://www.youtube.com/watch?v=lG0Ys-2d4MA',
      description: `Industry case studies and real-world breakdown of implementations around ${topic}.`,
      publishedAt: '1 month ago',
      relevanceReason: 'Practical industry applications',
    },
    ...basePool.map((v) => ({
      ...v,
      relevanceReason: 'Popular recommended companion video',
    })),
  ];

  const unique = contextualItems.filter(
    (v, idx, arr) => arr.findIndex((x) => x.id === v.id) === idx && v.id !== currentId
  );

  unique.forEach((v) => videoCache.set(v.id, v));
  return unique.slice(0, 8);
}

/**
 * External web resource item structure
 */
export interface ExternalResourceItem {
  id: string;
  title: string;
  link: string;
  snippet: string;
  source?: string;
  domain?: string;
  category: 'article' | 'documentation' | 'video' | 'tutorial' | 'reference' | 'tool';
  publishedDate?: string;
  favicon?: string;
}

/**
 * Fetch external browser links, articles, documentation, and references related to the video
 * using SerpApi engine=google or curated web intelligence.
 */
export async function getExternalResources(
  videoId: string,
  videoMetadata?: VideoItem | null
): Promise<{
  resources: ExternalResourceItem[];
  topic: string;
  source: 'serpapi' | 'demo' | 'google';
  message?: string;
}> {
  const cleanId = extractYouTubeId(videoId);
  const metadata = videoMetadata || (cleanId ? await getVideoById(cleanId) : null);
  const topic = extractCoreTopic(metadata?.title) || 'technology guide';

  const apiKey = process.env.SERPAPI_KEY?.trim();

  if (apiKey && apiKey.length > 0) {
    try {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'google');
      url.searchParams.set('q', `${topic} articles guide documentation tutorial`);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('num', '10');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const organicResults = data.organic_results || [];
        const resources: ExternalResourceItem[] = [];

        for (let i = 0; i < organicResults.length; i++) {
          const item = organicResults[i];
          const link = item.link || '';
          if (!link) continue;

          let domain = '';
          try {
            domain = new URL(link).hostname.replace('www.', '');
          } catch {
            domain = item.displayed_link || 'web';
          }

          // Classify category based on domain / title
          let category: ExternalResourceItem['category'] = 'article';
          const lowerLink = link.toLowerCase();
          const lowerTitle = (item.title || '').toLowerCase();

          if (
            lowerLink.includes('github.com') ||
            lowerLink.includes('docs.') ||
            lowerLink.includes('/docs') ||
            lowerLink.includes('developer.') ||
            lowerLink.includes('api.')
          ) {
            category = 'documentation';
          } else if (
            lowerLink.includes('wikipedia.org') ||
            lowerLink.includes('encyclopedia') ||
            lowerLink.includes('w3schools')
          ) {
            category = 'reference';
          } else if (
            lowerTitle.includes('tutorial') ||
            lowerLink.includes('tutorial') ||
            lowerTitle.includes('how to') ||
            lowerLink.includes('guide')
          ) {
            category = 'tutorial';
          } else if (
            lowerLink.includes('youtube.com') ||
            lowerLink.includes('vimeo.com')
          ) {
            category = 'video';
          } else if (
            lowerLink.includes('tool') ||
            lowerLink.includes('playground') ||
            lowerLink.includes('app.')
          ) {
            category = 'tool';
          }

          resources.push({
            id: `res-${i}-${cleanId}`,
            title: item.title || 'Resource Link',
            link,
            snippet: item.snippet || item.description || `Comprehensive guide and resource covering ${topic}.`,
            source: item.source || domain,
            domain,
            category,
            publishedDate: item.date || item.published_date,
            favicon: item.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          });
        }

        if (resources.length > 0) {
          return {
            resources,
            topic,
            source: 'serpapi',
          };
        }
      }
    } catch (err) {
      console.warn('[SerpAPI] Google external resources query failed, generating contextual fallback:', err);
    }
  }

  // Fallback curated contextual resources based on video topic
  const fallbackResources = generateFallbackResources(cleanId, topic, metadata);
  return {
    resources: fallbackResources,
    topic,
    source: 'demo',
    message: apiKey ? 'Showing contextual curated web resources' : 'Demo Mode: SERPAPI_KEY not configured. Showing contextual curated web resources.',
  };
}

function generateFallbackResources(
  videoId: string,
  topic: string,
  metadata?: VideoItem | null
): ExternalResourceItem[] {
  const encTopic = encodeURIComponent(topic);

  return [
    {
      id: `res-1-${videoId}`,
      title: `${topic} — Comprehensive Knowledge Base & Overview`,
      link: `https://en.wikipedia.org/wiki/Special:Search?search=${encTopic}`,
      snippet: `Detailed background, history, core principles, and encyclopedic reference material regarding ${topic}.`,
      source: 'Wikipedia Encyclopedia',
      domain: 'en.wikipedia.org',
      category: 'reference',
      favicon: 'https://www.google.com/s2/favicons?domain=wikipedia.org&sz=64',
    },
    {
      id: `res-2-${videoId}`,
      title: `The Ultimate Guide to ${topic}: Best Practices & Techniques`,
      link: `https://dev.to/search?q=${encTopic}`,
      snippet: `In-depth tutorial and real-world breakdown of methodology, step-by-step implementation, and expert advice for ${topic}.`,
      source: 'Dev Community & Technical Articles',
      domain: 'dev.to',
      category: 'article',
      publishedDate: 'Recently updated',
      favicon: 'https://www.google.com/s2/favicons?domain=dev.to&sz=64',
    },
    {
      id: `res-3-${videoId}`,
      title: `Official Documentation & API / Framework Reference for ${topic}`,
      link: `https://github.com/search?q=${encTopic}&type=repositories`,
      snippet: `Open-source repositories, developer tools, starter templates, code examples, and technical specifications for ${topic}.`,
      source: 'GitHub Repositories',
      domain: 'github.com',
      category: 'documentation',
      favicon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64',
    },
    {
      id: `res-4-${videoId}`,
      title: `Mastering ${topic}: Hands-on Interactive Walkthrough`,
      link: `https://medium.com/search?q=${encTopic}`,
      snippet: `Explore curated perspectives, industry case studies, workflow optimizations, and master-level strategies on ${topic}.`,
      source: 'Medium Publications',
      domain: 'medium.com',
      category: 'tutorial',
      publishedDate: 'This month',
      favicon: 'https://www.google.com/s2/favicons?domain=medium.com&sz=64',
    },
    {
      id: `res-5-${videoId}`,
      title: `Cheat Sheet & Essential Reference Guide for ${topic}`,
      link: `https://www.google.com/search?q=${encTopic}+cheat+sheet+guide`,
      snippet: `Quick-reference summary, syntax cheat sheet, shortcuts, and key formula references for quick study and recall.`,
      source: 'Google Search Reference',
      domain: 'google.com',
      category: 'tool',
      favicon: 'https://www.google.com/s2/favicons?domain=google.com&sz=64',
    },
    {
      id: `res-6-${videoId}`,
      title: `Related YouTube Playlists & Creator Channels for ${metadata?.channel || topic}`,
      link: `https://www.youtube.com/results?search_query=${encTopic}+playlist`,
      snippet: `Curated YouTube playlists, full series, and companion video material to expand your knowledge of ${topic}.`,
      source: 'YouTube Playlists',
      domain: 'youtube.com',
      category: 'video',
      favicon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
    },
  ];
}
