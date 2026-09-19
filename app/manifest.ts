import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VeoChat — Interactive AI YouTube Video Workspace',
    short_name: 'VeoChat',
    description:
      'Interactive video workspace. Chat with YouTube videos, generate flashcards, visual summary slides, comprehension quizzes, and discover curated related learning materials with timestamp grounding.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/logo.jpeg',
        sizes: '192x192',
        type: 'image/jpeg',
      },
      {
        src: '/logo.jpeg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  };
}
