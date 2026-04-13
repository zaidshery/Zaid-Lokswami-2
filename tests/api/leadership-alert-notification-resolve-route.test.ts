import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAdminSessionMock = vi.fn();
const resolveLeadershipReportAlertNotificationMock = vi.fn();

vi.mock('@/lib/auth/admin', () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock('@/lib/storage/leadershipReportAlertNotificationHistoryFile', () => ({
  resolveLeadershipReportAlertNotification: resolveLeadershipReportAlertNotificationMock,
}));

describe('/api/admin/analytics/alert-notifications/[id]/resolve POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no admin session exists', async () => {
    getAdminSessionMock.mockResolvedValue(null);

    const { POST } = await import(
      '@/app/api/admin/analytics/alert-notifications/[id]/resolve/route'
    );
    const response = await POST(
      new Request('http://localhost/api/admin/analytics/alert-notifications/test/resolve') as NextRequest,
      { params: Promise.resolve({ id: 'notif-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('resolves a notification for an authorized leadership super admin', async () => {
    getAdminSessionMock.mockResolvedValue({
      id: 'super-1',
      email: 'owner@lokswami.com',
      role: 'super_admin',
    });
    resolveLeadershipReportAlertNotificationMock.mockResolvedValue({
      id: 'notif-1',
      status: 'sent',
      alertCount: 2,
      alertIds: ['success-rate-decline', 'failure-volume-rising'],
      reason: 'Notified leadership about 2 critical delivery alert(s).',
      emailRecipients: ['leader@lokswami.com'],
      webhookTargets: 1,
      acknowledgedAt: '2026-04-06T12:00:00.000Z',
      acknowledgedByEmail: 'owner@lokswami.com',
      resolvedAt: '2026-04-06T12:15:00.000Z',
      resolvedByEmail: 'owner@lokswami.com',
      createdAt: '2026-04-06T11:30:00.000Z',
    });

    const { POST } = await import(
      '@/app/api/admin/analytics/alert-notifications/[id]/resolve/route'
    );
    const response = await POST(
      new Request('http://localhost/api/admin/analytics/alert-notifications/notif-1/resolve') as NextRequest,
      { params: Promise.resolve({ id: 'notif-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(resolveLeadershipReportAlertNotificationMock).toHaveBeenCalledWith(
      'notif-1',
      'owner@lokswami.com'
    );
    expect(payload).toEqual({
      success: true,
      data: expect.objectContaining({
        id: 'notif-1',
        resolvedByEmail: 'owner@lokswami.com',
      }),
    });
  });
});
