import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAdminSessionMock = vi.fn();
const getLeadershipReportCriticalAlertStateMock = vi.fn();
const saveLeadershipReportCriticalAlertStateMock = vi.fn();

vi.mock('@/lib/auth/admin', () => ({
  getAdminSession: getAdminSessionMock,
}));

vi.mock('@/lib/storage/leadershipReportCriticalAlertStateFile', () => ({
  getLeadershipReportCriticalAlertState: getLeadershipReportCriticalAlertStateMock,
  saveLeadershipReportCriticalAlertState: saveLeadershipReportCriticalAlertStateMock,
}));

describe('/api/admin/analytics/alert-notifications/mute PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLeadershipReportCriticalAlertStateMock.mockResolvedValue({
      key: 'critical_performance_alerts',
      activeAlertIds: ['failure-volume-rising'],
      lastAlertSignature: 'failure-volume-rising:detail',
      lastNotifiedAt: '2026-04-06T12:00:00.000Z',
      mutedUntil: null,
      mutedByEmail: null,
      mutedReason: null,
      updatedAt: '2026-04-06T12:00:00.000Z',
    });
  });

  it('returns 401 when no admin session exists', async () => {
    getAdminSessionMock.mockResolvedValue(null);

    const { PATCH } = await import(
      '@/app/api/admin/analytics/alert-notifications/mute/route'
    );
    const response = await PATCH(
      new Request('http://localhost/api/admin/analytics/alert-notifications/mute', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'mute', hours: 8 }),
      }) as NextRequest
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('mutes alerts for an authorized leadership super admin', async () => {
    getAdminSessionMock.mockResolvedValue({
      id: 'super-1',
      email: 'owner@lokswami.com',
      role: 'super_admin',
    });
    saveLeadershipReportCriticalAlertStateMock.mockResolvedValue({
      key: 'critical_performance_alerts',
      activeAlertIds: ['failure-volume-rising'],
      lastAlertSignature: '',
      lastNotifiedAt: '2026-04-06T12:00:00.000Z',
      mutedUntil: '2026-04-06T20:00:00.000Z',
      mutedByEmail: 'owner@lokswami.com',
      mutedReason: 'Muted for 8 hours.',
      updatedAt: '2026-04-06T12:30:00.000Z',
    });

    const { PATCH } = await import(
      '@/app/api/admin/analytics/alert-notifications/mute/route'
    );
    const response = await PATCH(
      new Request('http://localhost/api/admin/analytics/alert-notifications/mute', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'mute', hours: 8 }),
      }) as NextRequest
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(saveLeadershipReportCriticalAlertStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeAlertIds: ['failure-volume-rising'],
        lastAlertSignature: '',
        mutedByEmail: 'owner@lokswami.com',
        mutedReason: 'Muted for 8 hours.',
      })
    );
    expect(payload).toEqual({
      success: true,
      data: expect.objectContaining({
        mutedByEmail: 'owner@lokswami.com',
      }),
    });
  });

  it('unmutes alerts for an authorized leadership admin', async () => {
    getAdminSessionMock.mockResolvedValue({
      id: 'super-1',
      email: 'owner@lokswami.com',
      role: 'super_admin',
    });
    saveLeadershipReportCriticalAlertStateMock.mockResolvedValue({
      key: 'critical_performance_alerts',
      activeAlertIds: ['failure-volume-rising'],
      lastAlertSignature: '',
      lastNotifiedAt: '2026-04-06T12:00:00.000Z',
      mutedUntil: null,
      mutedByEmail: null,
      mutedReason: null,
      updatedAt: '2026-04-06T12:45:00.000Z',
    });

    const { PATCH } = await import(
      '@/app/api/admin/analytics/alert-notifications/mute/route'
    );
    const response = await PATCH(
      new Request('http://localhost/api/admin/analytics/alert-notifications/mute', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'unmute' }),
      }) as NextRequest
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(saveLeadershipReportCriticalAlertStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mutedUntil: null,
        mutedByEmail: null,
        mutedReason: null,
      })
    );
    expect(payload).toEqual({
      success: true,
      data: expect.objectContaining({
        mutedUntil: null,
      }),
    });
  });
});
