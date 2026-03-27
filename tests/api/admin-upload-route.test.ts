import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAdminSessionMock = vi.fn();
const uploadBufferToCloudinaryMock = vi.fn();

vi.mock('@/lib/auth/admin', () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock('@/lib/utils/cloudinary', () => ({
  uploadBufferToCloudinary: uploadBufferToCloudinaryMock,
}));

function createRequest(formData: FormData) {
  return {
    formData: async () => formData,
  } as unknown as NextRequest;
}

function createFile(name: string, type: string, contents = 'demo') {
  return new File([contents], name, { type });
}

describe('/api/admin/upload POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for guests', async () => {
    getAdminSessionMock.mockResolvedValue(null);

    const formData = new FormData();
    formData.set('file', createFile('image.jpg', 'image/jpeg'));

    const { POST } = await import('@/app/api/admin/upload/route');
    const response = await POST(createRequest(formData));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      success: false,
      error: 'Unauthorized',
    });
    expect(uploadBufferToCloudinaryMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported image file types before upload', async () => {
    getAdminSessionMock.mockResolvedValue({ id: 'admin-1', role: 'admin' });

    const formData = new FormData();
    formData.set('file', createFile('notes.txt', 'text/plain'));

    const { POST } = await import('@/app/api/admin/upload/route');
    const response = await POST(createRequest(formData));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      success: false,
      error: 'Only JPG, JPEG, PNG, or WEBP image files are allowed',
    });
    expect(uploadBufferToCloudinaryMock).not.toHaveBeenCalled();
  });

  it('rejects oversized e-paper PDFs', async () => {
    getAdminSessionMock.mockResolvedValue({ id: 'admin-1', role: 'admin' });

    const file = createFile('edition.pdf', 'application/pdf');
    Object.defineProperty(file, 'size', {
      configurable: true,
      value: 26 * 1024 * 1024,
    });

    const formData = new FormData();
    formData.set('purpose', 'epaper-paper');
    formData.set('file', file);

    const { POST } = await import('@/app/api/admin/upload/route');
    const response = await POST(createRequest(formData));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      success: false,
      error: 'E-paper PDF size must be less than 25MB',
    });
    expect(uploadBufferToCloudinaryMock).not.toHaveBeenCalled();
  });

  it('uploads valid e-paper PDFs with the raw Cloudinary pipeline', async () => {
    getAdminSessionMock.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    uploadBufferToCloudinaryMock.mockResolvedValue({
      secureUrl: 'https://res.cloudinary.com/demo/raw/upload/v1/lokswami/epapers/papers/edition.pdf',
      publicId: 'lokswami/epapers/papers/edition',
      resourceType: 'raw',
      bytes: 1234,
    });

    const formData = new FormData();
    formData.set('purpose', 'epaper-paper');
    formData.set('file', createFile('edition.pdf', 'application/pdf', 'pdf'));

    const { POST } = await import('@/app/api/admin/upload/route');
    const response = await POST(createRequest(formData));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(uploadBufferToCloudinaryMock).toHaveBeenCalledTimes(1);

    const [buffer, options] = uploadBufferToCloudinaryMock.mock.calls[0];
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(options).toEqual({
      folder: 'lokswami/epapers/papers',
      resourceType: 'raw',
      originalFilename: 'edition.pdf',
    });

    expect(payload).toEqual({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: 'https://res.cloudinary.com/demo/raw/upload/v1/lokswami/epapers/papers/edition.pdf',
        secureUrl:
          'https://res.cloudinary.com/demo/raw/upload/v1/lokswami/epapers/papers/edition.pdf',
        publicId: 'lokswami/epapers/papers/edition',
        resourceType: 'raw',
        filename: 'edition.pdf',
        size: 1234,
        type: 'application/pdf',
      },
    });
  });
});
