import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import 'katex/dist/katex.min.css';
import './globals.css';

import { Providers } from '@/components/Providers';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

const defaultTitle = 'VeoChat — Interactive AI YouTube Video Workspace';
const defaultDescription =
  'Interactive video workspace. Chat with YouTube videos, generate flashcards, visual summary slides, comprehension quizzes, and discover curated related learning materials with timestamp grounding.';

const baseUrl =
  process.env.APP_URL?.replace(/\/$/, '') ||
  'https://ais-pre-zvjayyh5s6akoga7qanvna-138046022867.asia-southeast1.run.app';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: defaultTitle,
    template: '%s | VeoChat',
  },
  description: defaultDescription,
  applicationName: 'VeoChat',
  authors: [{ name: 'VeoChat Team' }],
  creator: 'VeoChat',
  publisher: 'VeoChat',
  keywords: [
    'VeoChat',
    'YouTube AI',
    'chat with YouTube',
    'video chat AI',
    'video flashcards',
    'video slides generator',
    'YouTube quiz generator',
    'timestamp video notes',
    'interactive video learning',
    'Gemini AI video',
    'AI study deck',
    'video comprehension',
    'YouTube transcription Q&A',
    'educational AI workspace',
  ],
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/logo.jpeg', type: 'image/jpeg' },
    ],
    shortcut: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'VeoChat',
    title: defaultTitle,
    description: defaultDescription,
    locale: 'en_US',
    images: [
      {
        url: '/logo.jpeg',
        width: 1056,
        height: 992,
        alt: 'VeoChat — Interactive AI YouTube Video Workspace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    images: ['/logo.jpeg'],
    creator: '@VeoChat',
  },
  category: 'Education & Productivity',
};

const jsonLdData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${baseUrl}/#webapp`,
      name: 'VeoChat',
      url: baseUrl,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'All',
      browserRequirements: 'Requires modern web browser with JavaScript enabled',
      description: defaultDescription,
      screenshot: `${baseUrl}/logo.jpeg`,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        'Interactive AI Q&A grounded with exact video timestamps',
        'Automated spaced repetition flashcard generation',
        'Structured presentation slides and summary decks',
        'Interactive comprehension quizzes with instant feedback',
        'Contextual YouTube video recommendations',
        'Curated external documentation, articles, and learning links',
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${baseUrl}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does VeoChat analyze YouTube videos?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VeoChat extracts the video transcript and metadata, then uses Google Gemini AI models to analyze key topics, generate timestamp-grounded answers, create flashcard decks, summarize into slide decks, and build comprehension quizzes.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I jump to specific moments in the video from chat responses?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! Every response includes clickable timestamp tags (e.g., [03:45]). Clicking any timestamp automatically seeks the embedded YouTube player directly to that moment.',
          },
        },
        {
          '@type': 'Question',
          name: 'What study tools does VeoChat provide?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'VeoChat features 6 integrated workspace tools: Timestamp-Grounded Chat, 3D Flippable Flashcards, Presentation Slide Decks, Comprehension Quizzes with score tracking, Related Video Recommendations, and External Web Resources with Google Search grounding.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is VeoChat free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, VeoChat is free to explore and study with any supported YouTube video.',
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.className}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdData),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('askthevideo-theme');
                  if (stored === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}

                try {
                  var hasSession = localStorage.getItem('veochat_has_session') === '1';
                  if (!hasSession) {
                    for (var i = 0; i < localStorage.length; i++) {
                      var k = localStorage.key(i);
                      if (k && (k.indexOf('firebase:authUser') === 0 || k.indexOf('indexedDB:firebase') === 0)) {
                        hasSession = true;
                        break;
                      }
                    }
                  }
                  if (hasSession) {
                    document.documentElement.setAttribute('data-user-session', 'true');
                  } else {
                    document.documentElement.removeAttribute('data-user-session');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen font-sans bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 antialiased transition-colors duration-200">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}



