import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import 'katex/dist/katex.min.css';
import './globals.css';

import { Providers } from '@/components/Providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VeoChat — Ask Anything About Any YouTube Video',
  description: 'Interactive video workspace. Chat with YouTube videos, generate notes, flashcards, visual summary slides, and comprehension quizzes with timestamp grounding.',
  icons: {
    icon: '/logo.jpeg',
    shortcut: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
  openGraph: {
    title: 'VeoChat — Ask Anything About Any YouTube Video',
    description: 'Interactive video workspace. Chat with YouTube videos, generate notes, flashcards, visual summary slides, and comprehension quizzes with timestamp grounding.',
    type: 'website',
    images: [
      {
        url: '/logo.jpeg',
        width: 1056,
        height: 992,
        alt: 'VeoChat Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VeoChat — Ask Anything About Any YouTube Video',
    description: 'Interactive video workspace. Chat with YouTube videos, generate notes, flashcards, visual summary slides, and comprehension quizzes with timestamp grounding.',
    images: ['/logo.jpeg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${inter.className}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('askthevideo-theme');
                  if (stored === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else if (stored === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen font-sans bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 antialiased transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


