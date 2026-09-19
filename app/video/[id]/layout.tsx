import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Study Studio (${id})`,
    description: `Interactive AI workspace for YouTube video ${id}. Chat with timestamps, generate flashcards, visual slides, and comprehension quizzes.`,
    openGraph: {
      title: `Interactive Video Workspace | VeoChat`,
      description: `Ask questions, study flashcards, review slide decks, and test your comprehension on YouTube video ${id} with timestamp citations.`,
      type: 'article',
      images: [
        {
          url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          width: 480,
          height: 360,
          alt: `YouTube Video Thumbnail for ${id}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Interactive Video Workspace | VeoChat`,
      description: `Study, chat, and test your understanding with timestamp-grounded AI tools for YouTube video ${id}.`,
      images: [`https://i.ytimg.com/vi/${id}/hqdefault.jpg`],
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
