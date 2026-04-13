import { describe, expect, it } from 'vitest';
import { buildLeadershipReportEmailPreview } from '@/lib/notifications/leadershipReportEmail';
import type { LeadershipReport } from '@/lib/admin/leadershipReports';

function createReport(): LeadershipReport {
  return {
    id: 'daily_briefing',
    label: 'Daily Briefing',
    description: 'Daily summary',
    cadenceLabel: 'Daily',
    range: 'today',
    compare: 'previous',
    generatedAt: '2026-04-06T06:00:00.000Z',
    windowLabel: 'Today',
    comparisonLabel: 'Previous period',
    headline: 'Daily leadership summary is ready.',
    summary: 'Lokswami leadership is tracking desk pressure and release readiness.',
    metrics: [
      {
        label: 'Ready Decisions',
        value: 4,
        detail: 'Items ready for release.',
        tone: 'good',
      },
    ],
    wins: ['Queue pressure dropped today.'],
    risks: ['One edition is still blocked.'],
    actions: [
      {
        label: 'Open Analytics',
        href: '/admin/analytics',
        tone: 'primary',
      },
    ],
    viewHref: '/admin/analytics?tab=overview',
    downloadHref: '/api/admin/analytics/briefing?preset=daily_briefing',
  };
}

describe('buildLeadershipReportEmailPreview', () => {
  it('builds a subject plus plain-text and html previews', () => {
    const preview = buildLeadershipReportEmailPreview(createReport());

    expect(preview.subject).toBe('Lokswami Daily Briefing');
    expect(preview.text).toContain('Daily leadership summary is ready.');
    expect(preview.text).toContain('Open dashboard view:');
    expect(preview.html).toContain('<h1');
    expect(preview.html).toContain('Daily Briefing');
  });
});
