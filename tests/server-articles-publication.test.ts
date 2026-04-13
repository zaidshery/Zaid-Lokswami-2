import { beforeEach, describe, expect, it, vi } from 'vitest';

const connectDBMock = vi.fn();
const getStoredArticleByIdMock = vi.fn();
const listAllStoredArticlesMock = vi.fn();

vi.mock('@/lib/db/mongoose', () => ({
  default: connectDBMock,
}));

vi.mock('@/lib/models/Article', () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('@/lib/storage/articlesFile', () => ({
  getStoredArticleById: getStoredArticleByIdMock,
  listAllStoredArticles: listAllStoredArticlesMock,
}));

describe('server article publication helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MONGODB_URI;
  });

  it('hides unpublished articles from metadata lookups', async () => {
    getStoredArticleByIdMock.mockResolvedValue({
      _id: 'draft-1',
      title: 'Draft article',
      summary: 'Draft summary',
      content: 'Draft content',
      image: '/draft.jpg',
      category: 'General',
      author: 'Reporter',
      publishedAt: '2026-04-13T10:00:00.000Z',
      updatedAt: '2026-04-13T10:00:00.000Z',
      seo: {
        metaTitle: '',
        metaDescription: '',
        ogImage: '',
        canonicalUrl: '',
      },
      workflow: {
        status: 'draft',
      },
    });

    const { getArticleForMetadata } = await import('@/lib/content/serverArticles');
    const article = await getArticleForMetadata('draft-1');

    expect(article).toBeNull();
  });

  it('includes only published articles in sitemap lookups', async () => {
    listAllStoredArticlesMock.mockResolvedValue([
      {
        _id: 'draft-1',
        updatedAt: '2026-04-13T10:00:00.000Z',
        publishedAt: '2026-04-13T10:00:00.000Z',
        workflow: {
          status: 'draft',
        },
      },
      {
        _id: 'published-1',
        updatedAt: '2026-04-13T09:00:00.000Z',
        publishedAt: '2026-04-13T09:00:00.000Z',
        workflow: {
          status: 'published',
        },
      },
    ]);

    const { listArticlesForSitemap } = await import('@/lib/content/serverArticles');
    const articles = await listArticlesForSitemap(500);

    expect(articles).toEqual([
      {
        id: 'published-1',
        updatedAt: '2026-04-13T09:00:00.000Z',
      },
    ]);
  });
});
