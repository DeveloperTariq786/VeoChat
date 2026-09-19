import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.APP_URL?.replace(/\/$/, '') ||
    'https://ais-pre-zvjayyh5s6akoga7qanvna-138046022867.asia-southeast1.run.app';

  const lastModified = new Date();

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/#features`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/#faq`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
