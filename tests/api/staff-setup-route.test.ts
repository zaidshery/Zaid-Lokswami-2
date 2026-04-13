import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findStaffUserBySetupTokenMock = vi.fn();
const setStaffPasswordWithTokenMock = vi.fn();

vi.mock('@/lib/auth/staffCredentials', () => ({
  findStaffUserBySetupToken: findStaffUserBySetupTokenMock,
  setStaffPasswordWithToken: setStaffPasswordWithTokenMock,
}));

describe('/api/auth/staff-setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns setup metadata for a valid admin-side token', async () => {
    findStaffUserBySetupTokenMock.mockResolvedValue({
      name: 'Copy Desk',
      email: 'copy@example.com',
      loginId: 'copy.desk',
      role: 'copy_editor',
      setupTokenExpiresAt: '2099-04-11T00:00:00.000Z',
    });

    const { GET } = await import('@/app/api/auth/staff-setup/route');
    const request = Object.assign(
      new Request('http://localhost/api/auth/staff-setup?token=valid-token', {
        method: 'GET',
      }),
      {
        nextUrl: new URL('http://localhost/api/auth/staff-setup?token=valid-token'),
      }
    ) as NextRequest;
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: {
        name: 'Copy Desk',
        email: 'copy@example.com',
        loginId: 'copy.desk',
        role: 'copy_editor',
        setupExpiresAt: '2099-04-11T00:00:00.000Z',
      },
    });
  });

  it('rejects mismatched passwords before hitting the credential helper', async () => {
    const { POST } = await import('@/app/api/auth/staff-setup/route');
    const response = await POST(
      new Request('http://localhost/api/auth/staff-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
          password: 'strong-pass-1',
          confirmPassword: 'different-pass-1',
        }),
      }) as unknown as NextRequest
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      success: false,
      error: 'Passwords do not match',
    });
    expect(setStaffPasswordWithTokenMock).not.toHaveBeenCalled();
  });

  it('returns login data after a successful password setup', async () => {
    setStaffPasswordWithTokenMock.mockResolvedValue({
      success: true,
      loginId: 'copy.desk',
      email: 'copy@example.com',
      role: 'copy_editor',
    });

    const { POST } = await import('@/app/api/auth/staff-setup/route');
    const response = await POST(
      new Request('http://localhost/api/auth/staff-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
          password: 'strong-pass-1',
          confirmPassword: 'strong-pass-1',
        }),
      }) as unknown as NextRequest
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: {
        loginId: 'copy.desk',
        email: 'copy@example.com',
        role: 'copy_editor',
      },
    });
    expect(setStaffPasswordWithTokenMock).toHaveBeenCalledWith({
      token: 'valid-token',
      password: 'strong-pass-1',
    });
  });
});
