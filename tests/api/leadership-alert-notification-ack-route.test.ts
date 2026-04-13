import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAdminSessionMock = vi.fn();
const acknowledgeLeadershipReportAlertNotificationMock = vi.fn();

vi.mock('@/lib/auth/admin', () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock('@/lib/storage/leadershipReportAlertNotificationHistoryFile', () => ({
  acknowledgeLeadershipReportAlertNotification: acknowledgeLeadershipReportAlertNotificationMock,
}));

describe('/api/admin/analytics/alert-notifications/[id]/acknowledge POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no admin session exists', async () => {
    getAdminSessionMock.mockResolvedValue(null);

    const { POST } = await import(
      '@/app/api/admin/analytics/alert-notifications/[id]/acknowledge/route'
    );
    const response = await POST(
      new Request('http://localhost/api/admin/analytics/alert-notifications/test/acknowledge') as NextRequest,
      { params: Promise.resolve({ id: 'notif-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('acknowledges a notification for an authorized leadership admin', async () => {
    getAdminSessionMock.mockResolvedValue({
      id: 'admin-1',
      email: 'boss@lokswami.com',
      role: 'admin',
    });
    acknowledgeLeadershipReportAlertNotificationMock.mockResolvedValue({
      id: 'notif-1',
      status: 'sent',
      alertCount: 2,
      alertIds: ['success-rate-decline', 'failure-volume-rising'],
      reason: 'Notified leadership about 2 critical delivery alert(s).',
      emailRecipients: ['leader@lokswami.com'],
      webhookTargets: 1,
      acknowledgedAt: '2026-04-06T12:00:00.000Z',
      acknowledgedByEmail: 'boss@lokswami.com',
      createdAt: '2026-04-06T11:30:00.000Z',
    });

    const { POST } = await import(
      '@/app/api/admin/analytics/alert-notifications/[id]/acknowledge/route'
    );
    const response = await POST(
      new Request('http://localhost/api/admin/analytics/alert-notifications/notif-1/acknowledge') as NextRequest,
      { params: Promise.resolve({ id: 'notif-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(acknowledgeLeadershipReportAlertNotificationMock).toHaveBeenCalledWith(
      'notif-1',
      'boss@lokswami.com'
    );
    expect(payload).toEqual({
      success: true,
      data: expect.objectContaining({
        id: 'notif-1',
        acknowledgedByEmail: 'boss@lokswami.com',
      }),
    });
  });
});
