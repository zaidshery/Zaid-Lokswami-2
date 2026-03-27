import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAdminSessionMock = vi.fn();
const listStoredArticlesMock = vi.fn();
const connectDBMock = vi.fn();

vi.mock('@/lib/auth/admin', () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock('@/lib/storage/articlesFile', () => ({
  createStoredArticle: vi.fn(),
  listStoredArticles: listStoredArticlesMock,
  updateStoredArticle: vi.fn(),
}));

vi.mock('@/lib/db/mongoose', () => ({
  default: connectDBMock,
}));

vi.mock('@/lib/models/Article', () => ({
  default: {
    countDocuments: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('@/lib/server/breakingTts', () => ({
  ensureBreakingTtsForArticle: vi.fn(),
}));

describe('/api/admin/articles GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MONGODB_URI;
  });

  it('returns 401 when no admin session exists', async () => {
    getAdminSessionMock.mockResolvedValue(null);

    const { GET } = await import('@/app/api/admin/articles/route');
    const response = await GET(
      new Request('http://localhost/api/admin/articles') as unknown as NextRequest
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      success: false,
      error: 'Unauthorized',
    });
    expect(listStoredArticlesMock).not.toHaveBeenCalled();
  });

  it('returns file-store data for authorized admins when MongoDB is not configured', async () => {
    getAdminSessionMock.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    listStoredArticlesMock.mockResolvedValue({
      data: [{ _id: 'article-1', title: 'First article' }],
      total: 1,
    });

    const { GET } = await import('@/app/api/admin/articles/route');
    const response = await GET(
      new Request('http://localhost/api/admin/articles?limit=all') as unknown as NextRequest
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listStoredArticlesMock).toHaveBeenCalledWith({
      category: null,
      limit: Number.MAX_SAFE_INTEGER,
      page: 1,
    });
    expect(connectDBMock).not.toHaveBeenCalled();
    expect(payload).toEqual({
      success: true,
      data: [{ _id: 'article-1', title: 'First article' }],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  });
});
