import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.APP_URL?.replace(/\/$/, '') ||
    'https://ais-pre-zvjayyh5s6akoga7qanvna-138046022867.asia-southeast1.run.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
