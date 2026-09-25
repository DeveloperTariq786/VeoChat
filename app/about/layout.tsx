import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About VeoChat',
  description:
    'Learn about VeoChat — the interactive AI video workspace that transforms YouTube lectures and tutorials into timestamp-grounded chat, flashcard decks, summary slides, and comprehension quizzes.',
  openGraph: {
    title: 'About VeoChat — Interactive AI YouTube Workspace',
    description:
      'Learn about VeoChat — the interactive AI video workspace that transforms YouTube lectures and tutorials into timestamp-grounded chat, flashcard decks, summary slides, and comprehension quizzes.',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
