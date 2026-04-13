import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAdminSessionMock = vi.fn();
const listAllStoredArticlesMock = vi.fn();
const createStoredArticleMock = vi.fn();
const updateStoredArticleMock = vi.fn();
const connectDBMock = vi.fn();
const ensureBreakingTtsForArticleMock = vi.fn();
const recordArticleActivityMock = vi.fn();

vi.mock('@/lib/auth/admin', () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock('@/lib/storage/articlesFile', () => ({
  createStoredArticle: createStoredArticleMock,
  getStoredArticleById: vi.fn(),
  listAllStoredArticles: listAllStoredArticlesMock,
  updateStoredArticle: updateStoredArticleMock,
}));

vi.mock('@/lib/db/mongoose', () => ({
  default: connectDBMock,
}));

vi.mock('@/lib/models/Article', () => ({
  default: {
    find: vi.fn(),
  },
}));

vi.mock('@/lib/server/breakingTts', () => ({
  ensureBreakingTtsForArticle: ensureBreakingTtsForArticleMock,
}));

vi.mock('@/lib/server/articleActivity', () => ({
  buildArticleActivityMessage: vi.fn(() => 'Article activity recorded.'),
  recordArticleActivity: recordArticleActivityMock,
}));

describe('/api/admin/articles route', () => {
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
    expect(listAllStoredArticlesMock).not.toHaveBeenCalled();
  });

  it('returns file-store data for authorized admins when MongoDB is not configured', async () => {
    getAdminSessionMock.mockResolvedValue({
      id: 'admin-1',
      email: 'desk@example.com',
      name: 'Desk',
      role: 'admin',
    });
    listAllStoredArticlesMock.mockResolvedValue([
      {
        _id: 'article-1',
        title: 'First article',
        category: 'General',
        author: 'Desk',
        updatedAt: '2026-04-13T09:00:00.000Z',
        publishedAt: '2026-04-13T09:00:00.000Z',
        workflow: {
          status: 'published',
          createdBy: { id: 'admin-1', name: 'Desk', email: 'desk@example.com', role: 'admin' },
        },
      },
    ]);

    const { GET } = await import('@/app/api/admin/articles/route');
    const response = await GET(
      new Request('http://localhost/api/admin/articles?limit=all') as unknown as NextRequest
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listAllStoredArticlesMock).toHaveBeenCalledTimes(1);
    expect(connectDBMock).not.toHaveBeenCalled();
    expect(payload).toEqual({
      success: true,
      data: [
        expect.objectContaining({
          _id: 'article-1',
          title: 'First article',
        }),
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 1,
        pages: 1,
      },
    });
  });

  it('prevents reporters from publishing articles directly through the API', async () => {
    getAdminSessionMock.mockResolvedValue({
      id: 'reporter-1',
      email: 'reporter@example.com',
      name: 'Reporter',
      role: 'reporter',
    });

    const { POST } = await import('@/app/api/admin/articles/route');
    const response = await POST(
      new Request('http://localhost/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'publish' }),
      }) as unknown as NextRequest
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      success: false,
      error: 'You do not have permission to publish articles directly.',
    });
    expect(createStoredArticleMock).not.toHaveBeenCalled();
    expect(recordArticleActivityMock).not.toHaveBeenCalled();
    expect(ensureBreakingTtsForArticleMock).not.toHaveBeenCalled();
  });
});
