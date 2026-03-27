import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const listArticlesForSitemapMock = vi.fn();
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

vi.mock('@/lib/content/serverArticles', () => ({
  listArticlesForSitemap: listArticlesForSitemapMock,
}));

describe('metadata routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://lokswami.com/';
  });

  afterEach(() => {
    if (typeof originalSiteUrl === 'undefined') {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      return;
    }
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it('builds robots metadata from the normalized production site URL', async () => {
    const { default: robots } = await import('@/app/robots');
    const payload = robots();

    expect(payload).toEqual({
      rules: [
        {
          userAgent: '*',
          allow: '/',
        },
      ],
      sitemap: 'https://lokswami.com/sitemap.xml',
      host: 'https://lokswami.com',
    });
  });

  it('builds sitemap entries for static routes and articles on the configured site URL', async () => {
    listArticlesForSitemapMock.mockResolvedValue([
      {
        id: 'story/one',
        updatedAt: '2026-03-27T05:00:00.000Z',
      },
    ]);

    const { default: sitemap } = await import('@/app/sitemap');
    const entries = await sitemap();

    expect(listArticlesForSitemapMock).toHaveBeenCalledWith(500);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: 'https://lokswami.com/',
          changeFrequency: 'daily',
          priority: 0.7,
        }),
        expect.objectContaining({
          url: 'https://lokswami.com/main',
          changeFrequency: 'hourly',
          priority: 1,
        }),
        expect.objectContaining({
          url: 'https://lokswami.com/main/article/story%2Fone',
          changeFrequency: 'weekly',
          priority: 0.8,
          lastModified: new Date('2026-03-27T05:00:00.000Z'),
        }),
      ])
    );
  });
});
