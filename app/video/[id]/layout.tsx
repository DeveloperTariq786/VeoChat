import type { Metadata } from 'next';
import { extractYouTubeId, getVideoById } from '@/server/services/serpapi';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const cleanId = extractYouTubeId(id) || id;

  let title = `Interactive Video Workspace (${cleanId})`;
  let description = `Interactive study workspace for YouTube video ${cleanId}. Chat with timestamps, generate flashcards, visual slides, and comprehension quizzes.`;
  let channel = '';
  let thumbnail = `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`;

  try {
    const video = await getVideoById(cleanId);
    if (video) {
      if (video.title) {
        title = `${video.title} — AI Study Workspace`;
      }
      if (video.channel) {
        channel = video.channel;
      }
      if (video.thumbnail) {
        thumbnail = video.thumbnail;
      }
      if (video.description && video.description.length > 20) {
        description = `Study ${video.title || cleanId}${channel ? ` by ${channel}` : ''}. Chat with timestamps, generate 3D flashcards, slide decks, quizzes, and related learning resources.`;
      }
    }
  } catch (e) {
    // Graceful fallback to default video metadata
  }

  const pageUrl = `/video/${cleanId}`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${title} | VeoChat`,
      description,
      type: 'video.other',
      url: pageUrl,
      siteName: 'VeoChat',
      images: [
        {
          url: thumbnail,
          width: 1280,
          height: 720,
          alt: `${title} Thumbnail`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | VeoChat`,
      description,
      images: [thumbnail],
    },
  };
}

export default function VideoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
