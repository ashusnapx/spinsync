import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://dhobiq.app';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/auth/'],
      disallow: ['/dashboard/', '/api/', '/_next/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
