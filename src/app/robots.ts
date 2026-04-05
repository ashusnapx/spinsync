import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://dhobiq.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/about', '/contact', '/pricing', '/privacy', '/terms'],
      disallow: ['/dashboard/', '/api/', '/_next/', '/auth/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
