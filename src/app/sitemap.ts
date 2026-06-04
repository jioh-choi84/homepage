import { MetadataRoute } from 'next';
import { GENRE_OPTIONS } from '@/types/artwork';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.jiohchoi.com';
  const now = new Date();

  const genreUrls = GENRE_OPTIONS.map((g) => ({
    url: `${baseUrl}/works/${g.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const staticUrls: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${baseUrl}/works`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/exhibition`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/resources`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/cv`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/press`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/press/articles`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/press/broadcasts`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  return [...staticUrls, ...genreUrls];
}
