import { describe, expect, it } from 'vitest';
import {
  buildLeadershipReportMarkdown,
  type LeadershipReport,
} from '@/lib/admin/leadershipReports';
import { buildLeadershipReportEmailPreview } from '@/lib/notifications/leadershipReportEmail';

function createReport(): LeadershipReport {
  return {
    id: 'daily_briefing',
    label: 'Daily Briefing',
    description: 'Leadership summary.',
    cadenceLabel: 'Daily',
    range: 'today',
    compare: 'previous',
    generatedAt: '2026-04-08T10:00:00.000Z',
    windowLabel: 'Today',
    comparisonLabel: 'Previous day',
    headline: '2 ready decisions and 1 blocked edition need attention.',
    summary: 'The desk is moving, but one issue still needs intervention.',
    metrics: [
      {
        label: 'Ready Decisions',
        value: 2,
        detail: 'Items ready for release.',
        tone: 'good',
      },
    ],
    wins: ['No inbox escalations are waiting.'],
    risks: ['1 blocked edition still needs QA attention.'],
    growthHighlights: [
      {
        title: 'Section leader: Politics',
        detail: '+18 momentum and 14.0% conversion.',
        tone: 'good',
      },
      {
        title: 'Weak path: Direct -> Home',
        detail: '0.0% overall conversion across 24 sessions.',
        tone: 'critical',
      },
    ],
    growthOpportunities: [
      {
        title: 'Section opportunity: Home',
        detail: '90 page views with 0.0% conversion and -20 momentum. Opportunity score 61.',
        score: 61,
        tone: 'critical',
      },
    ],
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

describe('leadership report growth snapshot', () => {
  it('includes growth snapshot in markdown output', () => {
    const markdown = buildLeadershipReportMarkdown(createReport());

    expect(markdown).toContain('## Growth Snapshot');
    expect(markdown).toContain('Section leader: Politics');
    expect(markdown).toContain('Weak path: Direct -> Home');
    expect(markdown).toContain('## Growth Opportunities');
    expect(markdown).toContain('Section opportunity: Home');
  });

  it('includes growth snapshot in email preview', () => {
    const preview = buildLeadershipReportEmailPreview(createReport());

    expect(preview.text).toContain('Growth Snapshot');
    expect(preview.text).toContain('Section leader: Politics');
    expect(preview.text).toContain('Growth Opportunities');
    expect(preview.text).toContain('Section opportunity: Home');
    expect(preview.html).toContain('Growth Snapshot');
    expect(preview.html).toContain('Weak path: Direct -> Home');
    expect(preview.html).toContain('Growth Opportunities');
    expect(preview.html).toContain('Section opportunity: Home');
  });
});
