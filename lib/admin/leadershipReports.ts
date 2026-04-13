import {
  getAnalyticsCenterData,
  type AnalyticsCenterData,
  type AnalyticsCompareMode,
  type AnalyticsDateRange,
} from '@/lib/admin/analyticsCenter';
import { buildBusinessGrowthInsights } from '@/lib/admin/businessGrowthInsights';
import formatNumber from '@/lib/utils/formatNumber';

export type LeadershipReportPresetId =
  | 'daily_briefing'
  | 'weekly_briefing'
  | 'monthly_briefing'
  | 'growth_briefing';

export type LeadershipReportMetric = {
  label: string;
  value: number;
  detail: string;
  tone: 'good' | 'watch' | 'critical' | 'neutral';
};

export type LeadershipReportAction = {
  label: string;
  href: string;
  tone: 'primary' | 'warning' | 'neutral';
};

export type LeadershipReportGrowthHighlight = {
  title: string;
  detail: string;
  tone: 'good' | 'watch' | 'critical';
};

export type LeadershipReportGrowthOpportunity = {
  title: string;
  detail: string;
  score: number;
  tone: 'good' | 'watch' | 'critical';
};

export type LeadershipReport = {
  id: LeadershipReportPresetId;
  label: string;
  description: string;
  cadenceLabel: string;
  range: AnalyticsDateRange;
  compare: AnalyticsCompareMode;
  generatedAt: string;
  windowLabel: string;
  comparisonLabel: string | null;
  headline: string;
  summary: string;
  metrics: LeadershipReportMetric[];
  wins: string[];
  risks: string[];
  growthHighlights?: LeadershipReportGrowthHighlight[];
  growthOpportunities?: LeadershipReportGrowthOpportunity[];
  actions: LeadershipReportAction[];
  viewHref: string;
  downloadHref: string;
};

export type LeadershipReportPresetConfig = {
  id: LeadershipReportPresetId;
  label: string;
  description: string;
  cadenceLabel: string;
  range: AnalyticsDateRange;
  compare: AnalyticsCompareMode;
};

export const LEADERSHIP_REPORT_PRESETS: LeadershipReportPresetConfig[] = [
  {
    id: 'daily_briefing',
    label: 'Daily Briefing',
    description: 'A short leadership read on today’s release pressure, blockers, and watchlist.',
    cadenceLabel: 'Daily',
    range: 'today',
    compare: 'previous',
  },
  {
    id: 'weekly_briefing',
    label: 'Weekly Briefing',
    description: 'A newsroom-wide weekly summary of workflow health, quality risk, and team coverage.',
    cadenceLabel: 'Weekly',
    range: '7d',
    compare: 'previous',
  },
  {
    id: 'monthly_briefing',
    label: 'Monthly Briefing',
    description: 'A broader monthly management summary across audience, workflow, editions, and team operations.',
    cadenceLabel: 'Monthly',
    range: '30d',
    compare: 'previous',
  },
  {
    id: 'growth_briefing',
    label: 'Growth Briefing',
    description: 'A growth-focused leadership digest for section momentum, channel wins, and audience-path risks.',
    cadenceLabel: 'Weekly Growth',
    range: '30d',
    compare: 'previous',
  },
];

export function getLeadershipReportPresetConfig(preset: LeadershipReportPresetId) {
  return LEADERSHIP_REPORT_PRESETS.find((candidate) => candidate.id === preset) || LEADERSHIP_REPORT_PRESETS[0];
}

export function buildLeadershipReportViewHref(config: LeadershipReportPresetConfig) {
  if (config.id === 'growth_briefing') {
    return `/admin/analytics?${new URLSearchParams({
      tab: 'growth',
      focus: 'all',
      content: 'all',
      range: config.range,
      compare: config.compare,
    }).toString()}`;
  }

  return `/admin/analytics?${new URLSearchParams({
    tab: 'overview',
    focus: 'all',
    content: 'all',
    range: config.range,
    compare: config.compare,
  }).toString()}`;
}

export function buildLeadershipReportDownloadHref(config: LeadershipReportPresetConfig) {
  return `/api/admin/analytics/briefing?${new URLSearchParams({
    preset: config.id,
  }).toString()}`;
}

function createMetricTone(value: number, strategy: 'higher_good' | 'lower_good' | 'presence_warn') {
  if (strategy === 'higher_good') {
    return value > 0 ? 'good' : 'neutral';
  }

  if (strategy === 'lower_good') {
    return value > 0 ? 'critical' : 'good';
  }

  return value > 0 ? 'watch' : 'good';
}

function buildMetrics(analytics: AnalyticsCenterData): LeadershipReportMetric[] {
  return [
    {
      label: 'Ready Decisions',
      value: analytics.currentPeriod.queueMetrics.readyDecisions,
      detail: 'Items already cleared for publish, release, or leadership action.',
      tone: createMetricTone(analytics.currentPeriod.queueMetrics.readyDecisions, 'higher_good'),
    },
    {
      label: 'Queue Pressure',
      value: analytics.currentPeriod.queueMetrics.queuePressure,
      detail: 'Editorial and edition work still active in the current reporting window.',
      tone: createMetricTone(analytics.currentPeriod.queueMetrics.queuePressure, 'presence_warn'),
    },
    {
      label: 'Blocked Editions',
      value: analytics.currentPeriod.blockedEditions.length,
      detail: 'E-paper editions still blocked by QA, hotspot, OCR, or page-coverage issues.',
      tone: createMetricTone(analytics.currentPeriod.blockedEditions.length, 'lower_good'),
    },
    {
      label: 'Page Views',
      value: analytics.audienceAnalytics.current.metrics.pageViews,
      detail: 'Tracked public-site page views in the selected reporting window.',
      tone: createMetricTone(analytics.audienceAnalytics.current.metrics.pageViews, 'higher_good'),
    },
    {
      label: 'Inbox Escalations',
      value: analytics.dashboard.inbox.new,
      detail: 'Reader or operational messages still waiting for desk attention.',
      tone: createMetricTone(analytics.dashboard.inbox.new, 'lower_good'),
    },
    {
      label: 'Active Team Coverage',
      value: analytics.teamHealth.totals.active,
      detail: 'Admin-side accounts currently marked active in the system.',
      tone: createMetricTone(analytics.teamHealth.totals.active, 'higher_good'),
    },
  ];
}

function buildHeadline(analytics: AnalyticsCenterData) {
  const ready = analytics.currentPeriod.queueMetrics.readyDecisions;
  const blocked = analytics.currentPeriod.blockedEditions.length;
  const qualityAlerts = analytics.currentPeriod.lowQualityPages.length;
  const pageViews = analytics.audienceAnalytics.current.metrics.pageViews;

  return `${formatNumber(ready)} ready decision(s), ${formatNumber(blocked)} blocked edition(s), ${formatNumber(qualityAlerts)} quality alert(s), and ${formatNumber(pageViews)} tracked page view(s) were recorded in ${analytics.timeWindow.label.toLowerCase()}.`;
}

function buildSummary(analytics: AnalyticsCenterData) {
  const activeCoverage = analytics.teamHealth.totals.active;
  const ready = analytics.currentPeriod.queueMetrics.readyDecisions;
  const queuePressure = analytics.currentPeriod.queueMetrics.queuePressure;
  const comparison = analytics.comparison.deltas;

  const comparisonLine = comparison
    ? ` Compared with ${analytics.timeWindow.compareLabel.toLowerCase()}, review volume moved ${comparison.reviewVolume >= 0 ? 'up' : 'down'} by ${formatNumber(Math.abs(comparison.reviewVolume))}, while blocked editions moved ${comparison.blockedEditions >= 0 ? 'up' : 'down'} by ${formatNumber(Math.abs(comparison.blockedEditions))}.`
    : '';

  return `Lokswami leadership is currently managing ${formatNumber(queuePressure)} active newsroom item(s), ${formatNumber(ready)} release-ready item(s), and ${formatNumber(activeCoverage)} active admin-side team member(s) in ${analytics.timeWindow.label.toLowerCase()}.${comparisonLine}`;
}

function buildWins(analytics: AnalyticsCenterData) {
  const wins: string[] = [];

  if (analytics.currentPeriod.queueMetrics.readyDecisions > 0) {
    wins.push(
      `${formatNumber(analytics.currentPeriod.queueMetrics.readyDecisions)} item(s) are already cleared for publish or release action.`
    );
  }

  if (analytics.currentPeriod.blockedEditions.length === 0) {
    wins.push('No blocked e-paper editions are active in the selected reporting window.');
  }

  if (analytics.dashboard.inbox.new === 0) {
    wins.push('No new inbox escalations are waiting for leadership follow-up right now.');
  }

  if (analytics.teamHealth.totals.recentLogins7d > 0) {
    wins.push(
      `${formatNumber(analytics.teamHealth.totals.recentLogins7d)} admin team member(s) signed in recently, showing active desk coverage.`
    );
  }

  if (analytics.comparison.deltas && analytics.comparison.deltas.qualityAlerts < 0) {
    wins.push(
      `Quality alerts improved by ${formatNumber(Math.abs(analytics.comparison.deltas.qualityAlerts))} compared with the previous window.`
    );
  }

  return wins.slice(0, 3);
}

function buildRisks(analytics: AnalyticsCenterData) {
  const risks: string[] = [];

  if (analytics.currentPeriod.blockedEditions.length > 0) {
    risks.push(
      `${formatNumber(analytics.currentPeriod.blockedEditions.length)} blocked edition(s) still need QA or production attention.`
    );
  }

  if (analytics.currentPeriod.lowQualityPages.length > 0) {
    risks.push(
      `${formatNumber(analytics.currentPeriod.lowQualityPages.length)} low-quality page alert(s) remain active in the current window.`
    );
  }

  if (analytics.dashboard.inbox.new > 0) {
    risks.push(
      `${formatNumber(analytics.dashboard.inbox.new)} inbox escalation(s) are still waiting for response.`
    );
  }

  risks.push(...analytics.teamHealth.alerts.slice(0, 1));
  risks.push(...analytics.systemHealth.risks.slice(0, 2));

  return risks.filter(Boolean).slice(0, 4);
}

function buildActions(analytics: AnalyticsCenterData): LeadershipReportAction[] {
  const actions: LeadershipReportAction[] = [];

  if (analytics.currentPeriod.queueMetrics.readyDecisions > 0) {
    actions.push({
      label: 'Review Ready Decisions',
      href: '/admin/analytics?tab=newsroom_ops&focus=ready&content=all&range=7d&compare=previous',
      tone: 'primary',
    });
  }

  if (analytics.currentPeriod.blockedEditions.length > 0) {
    actions.push({
      label: 'Resolve Edition Blockers',
      href: '/admin/analytics?tab=epaper_ops&focus=quality&content=epaper&range=30d&compare=previous',
      tone: 'warning',
    });
  }

  if (analytics.teamHealth.alerts.length > 0) {
    actions.push({
      label: 'Review Team Coverage',
      href: '/admin/team',
      tone: 'neutral',
    });
  }

  if (analytics.systemHealth.risks.length > 0) {
    actions.push({
      label: 'Open System Health',
      href: '/admin/analytics?tab=system_health&range=30d&compare=off',
      tone: 'warning',
    });
  }

  if (!actions.length) {
    actions.push({
      label: 'Open Leadership Overview',
      href: '/admin/analytics?tab=overview&focus=all&content=all&range=30d&compare=previous',
      tone: 'primary',
    });
  }

  return actions.slice(0, 3);
}

function buildGrowthHighlights(analytics: AnalyticsCenterData): LeadershipReportGrowthHighlight[] {
  const growthInsights = buildBusinessGrowthInsights({
    sectionBreakdown: analytics.audienceAnalytics.current.sectionBreakdown,
    sectionTrends: analytics.audienceAnalytics.current.sectionTrends,
    sectionConversionBreakdown: analytics.audienceAnalytics.current.sectionConversionBreakdown,
    sectionConversionTrends: analytics.audienceAnalytics.current.sectionConversionTrends,
    channelBreakdown: analytics.audienceAnalytics.current.channelBreakdown,
    channelTrends: analytics.audienceAnalytics.current.channelTrends,
    channelConversionBreakdown: analytics.audienceAnalytics.current.channelConversionBreakdown,
    channelConversionTrends: analytics.audienceAnalytics.current.channelConversionTrends,
    pathConversionLeaders: analytics.audienceAnalytics.current.pathConversionLeaders,
    pathConversionLaggards: analytics.audienceAnalytics.current.pathConversionLaggards,
  });

  const highlights: LeadershipReportGrowthHighlight[] = [];
  const sectionLeader = growthInsights.sectionLeaders[0];
  const channelLeader = growthInsights.channelLeaders[0];

  if (sectionLeader) {
    highlights.push({
      title: `Section leader: ${sectionLeader.label}`,
      detail: `${sectionLeader.momentumDelta >= 0 ? '+' : ''}${sectionLeader.momentumDelta} momentum and ${sectionLeader.conversionRate.toFixed(1)}% conversion.`,
      tone: 'good',
    });
  }

  if (channelLeader) {
    highlights.push({
      title: `Channel win: ${channelLeader.label}`,
      detail: `${channelLeader.momentumDelta >= 0 ? '+' : ''}${channelLeader.momentumDelta} momentum and ${channelLeader.conversionRate.toFixed(1)}% conversion.`,
      tone: 'good',
    });
  }

  if (growthInsights.watchlist.length) {
    highlights.push(
      ...growthInsights.watchlist.slice(0, 2).map((item) => ({
        title: item.title,
        detail: item.detail,
        tone: item.tone,
      }))
    );
  }

  return highlights.slice(0, 4);
}

function buildGrowthOpportunities(
  analytics: AnalyticsCenterData
): LeadershipReportGrowthOpportunity[] {
  const growthInsights = buildBusinessGrowthInsights({
    sectionBreakdown: analytics.audienceAnalytics.current.sectionBreakdown,
    sectionTrends: analytics.audienceAnalytics.current.sectionTrends,
    sectionConversionBreakdown: analytics.audienceAnalytics.current.sectionConversionBreakdown,
    sectionConversionTrends: analytics.audienceAnalytics.current.sectionConversionTrends,
    channelBreakdown: analytics.audienceAnalytics.current.channelBreakdown,
    channelTrends: analytics.audienceAnalytics.current.channelTrends,
    channelConversionBreakdown: analytics.audienceAnalytics.current.channelConversionBreakdown,
    channelConversionTrends: analytics.audienceAnalytics.current.channelConversionTrends,
    pathConversionLeaders: analytics.audienceAnalytics.current.pathConversionLeaders,
    pathConversionLaggards: analytics.audienceAnalytics.current.pathConversionLaggards,
  });

  return growthInsights.opportunities.slice(0, 4).map((item) => ({
    title: `${item.kind === 'section' ? 'Section' : 'Channel'} opportunity: ${item.label}`,
    detail: `${item.detail} Opportunity score ${item.opportunityScore}.`,
    score: item.opportunityScore,
    tone: item.tone,
  }));
}

function buildLeadershipReport(
  config: LeadershipReportPresetConfig,
  analytics: AnalyticsCenterData
): LeadershipReport {
  const growthHighlights = buildGrowthHighlights(analytics);
  const growthOpportunities =
    config.id === 'growth_briefing' ? buildGrowthOpportunities(analytics) : [];
  const actions =
    config.id === 'growth_briefing'
      ? [
          {
            label: 'Open Growth Watch',
            href: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
            tone: 'primary' as const,
          },
          {
            label: 'Open Audience Trends',
            href: '/admin/analytics?tab=audience&focus=all&content=all&range=30d&compare=previous',
            tone: 'neutral' as const,
          },
        ]
      : buildActions(analytics);

  const headline =
    config.id === 'growth_briefing'
      ? growthHighlights.length
        ? `${growthHighlights[0].title}. ${growthHighlights[1]?.title || 'Growth watch is active across audience and content segments.'}`
        : buildHeadline(analytics)
      : buildHeadline(analytics);

  const summary =
    config.id === 'growth_briefing'
      ? `Lokswami growth leadership is reviewing section momentum, channel performance, and audience-path conversion across ${analytics.timeWindow.label.toLowerCase()}. Compare-period data is being used to surface the strongest winners and the segments at risk.`
      : buildSummary(analytics);

  return {
    id: config.id,
    label: config.label,
    description: config.description,
    cadenceLabel: config.cadenceLabel,
    range: config.range,
    compare: config.compare,
    generatedAt: new Date().toISOString(),
    windowLabel: analytics.timeWindow.label,
    comparisonLabel:
      analytics.timeWindow.compareLabel && config.compare === 'previous'
        ? analytics.timeWindow.compareLabel
        : null,
    headline,
    summary,
    metrics: buildMetrics(analytics),
    wins: buildWins(analytics),
    risks: buildRisks(analytics),
    growthHighlights,
    growthOpportunities,
    actions,
    viewHref: buildLeadershipReportViewHref(config),
    downloadHref: buildLeadershipReportDownloadHref(config),
  };
}

function toneLabel(tone: LeadershipReportMetric['tone']) {
  switch (tone) {
    case 'good':
      return 'Good';
    case 'watch':
      return 'Watch';
    case 'critical':
      return 'Critical';
    case 'neutral':
    default:
      return 'Neutral';
  }
}

export function buildLeadershipReportMarkdown(report: LeadershipReport) {
  const lines = [
    `# ${report.label}`,
    '',
    `Generated: ${report.generatedAt}`,
    `Reporting Window: ${report.windowLabel}`,
    `Comparison: ${report.comparisonLabel || 'Off'}`,
    '',
    '## Executive Summary',
    report.summary,
    '',
    report.headline,
    '',
    '## Key Metrics',
    ...report.metrics.map(
      (metric) =>
        `- ${metric.label}: ${formatNumber(metric.value)} (${toneLabel(metric.tone)}) - ${metric.detail}`
    ),
    '',
    '## Positive Signals',
    ...(report.wins.length ? report.wins.map((win) => `- ${win}`) : ['- No standout positive signals were recorded in this window.']),
    '',
    '## Leadership Risks',
    ...(report.risks.length ? report.risks.map((risk) => `- ${risk}`) : ['- No major leadership risks are active right now.']),
    '',
    '## Growth Snapshot',
    ...(report.growthHighlights?.length
      ? report.growthHighlights.map(
          (item) => `- ${item.title} (${item.tone}) - ${item.detail}`
        )
      : ['- No growth snapshot signals were generated for this window.']),
    '',
    '## Growth Opportunities',
    ...(report.growthOpportunities?.length
      ? report.growthOpportunities.map(
          (item) => `- ${item.title} (${item.tone}, score ${item.score}) - ${item.detail}`
        )
      : ['- No growth opportunities were generated for this window.']),
    '',
    '## Recommended Actions',
    ...report.actions.map((action) => `- ${action.label}: ${action.href}`),
    '',
  ];

  return lines.join('\n');
}

export async function getLeadershipReportPreset(preset: LeadershipReportPresetId) {
  const config = getLeadershipReportPresetConfig(preset);
  const analytics = await getAnalyticsCenterData({
    range: config.range,
    compare: config.compare,
  });

  return buildLeadershipReport(config, analytics);
}

export async function getLeadershipReportPresetCollection() {
  return Promise.all(
    LEADERSHIP_REPORT_PRESETS.map(async (config) => {
      const analytics = await getAnalyticsCenterData({
        range: config.range,
        compare: config.compare,
      });

      return buildLeadershipReport(config, analytics);
    })
  );
}
