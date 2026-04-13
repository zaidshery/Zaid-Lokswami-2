import 'server-only';

import type {
  AudiencePathConversionBreakdown,
  AudienceSectionBreakdown,
  AudienceSegmentConversionBreakdown,
  AudienceSegmentConversionTrend,
  AudienceSegmentTrend,
  AudienceChannelBreakdown,
} from '@/lib/admin/audienceAnalytics';

export type BusinessGrowthSectionRow = {
  label: string;
  pageViews: number;
  sessions: number;
  momentumDelta: number;
  conversionRate: number;
  conversionDelta: number;
};

export type BusinessGrowthChannelRow = {
  label: string;
  events: number;
  sessions: number;
  momentumDelta: number;
  conversionRate: number;
  conversionDelta: number;
};

export type BusinessGrowthWatchItem = {
  id: string;
  tone: 'good' | 'watch' | 'critical';
  title: string;
  detail: string;
};

export type BusinessGrowthOpportunityRow = {
  id: string;
  kind: 'section' | 'channel';
  label: string;
  reach: number;
  sessions: number;
  momentumDelta: number;
  conversionRate: number;
  conversionDelta: number;
  opportunityScore: number;
  detail: string;
  tone: 'good' | 'watch' | 'critical';
};

export type BusinessGrowthInsights = {
  sectionLeaders: BusinessGrowthSectionRow[];
  sectionRisks: BusinessGrowthSectionRow[];
  channelLeaders: BusinessGrowthChannelRow[];
  channelRisks: BusinessGrowthChannelRow[];
  bestPath: AudiencePathConversionBreakdown | null;
  riskPath: AudiencePathConversionBreakdown | null;
  watchlist: BusinessGrowthWatchItem[];
  opportunities: BusinessGrowthOpportunityRow[];
};

function toMap<T extends { label: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.label, row]));
}

function buildOpportunityScore(args: {
  reach: number;
  conversionRate: number;
  momentumDelta: number;
  conversionDelta: number;
}) {
  const conversionGap = Math.max(0, 12 - args.conversionRate);
  const momentumPenalty = args.momentumDelta < 0 ? Math.abs(args.momentumDelta) : 0;
  const conversionPenalty = args.conversionDelta < 0 ? Math.abs(args.conversionDelta) : 0;

  return Math.round(
    (args.reach / 10) + conversionGap * 8 + momentumPenalty * 3 + conversionPenalty * 4
  );
}

function buildOpportunityTone(args: {
  conversionRate: number;
  momentumDelta: number;
  opportunityScore: number;
}) {
  if (
    args.conversionRate <= 2 ||
    (args.momentumDelta < 0 && args.opportunityScore >= 50)
  ) {
    return 'critical' as const;
  }

  if (args.conversionRate < 8 || args.opportunityScore >= 30) {
    return 'watch' as const;
  }

  return 'good' as const;
}

export function buildBusinessGrowthInsights(args: {
  sectionBreakdown: AudienceSectionBreakdown[];
  sectionTrends: AudienceSegmentTrend[];
  sectionConversionBreakdown: AudienceSegmentConversionBreakdown[];
  sectionConversionTrends: AudienceSegmentConversionTrend[];
  channelBreakdown: AudienceChannelBreakdown[];
  channelTrends: AudienceSegmentTrend[];
  channelConversionBreakdown: AudienceSegmentConversionBreakdown[];
  channelConversionTrends: AudienceSegmentConversionTrend[];
  pathConversionLeaders: AudiencePathConversionBreakdown[];
  pathConversionLaggards: AudiencePathConversionBreakdown[];
}): BusinessGrowthInsights {
  const sectionBreakdownMap = new Map(
    args.sectionBreakdown.map((row) => [row.section, row])
  );
  const sectionTrendMap = toMap(args.sectionTrends);
  const sectionConversionMap = toMap(args.sectionConversionBreakdown);
  const sectionConversionTrendMap = toMap(args.sectionConversionTrends);
  const channelBreakdownMap = new Map(
    args.channelBreakdown.map((row) => [row.channel, row])
  );
  const channelTrendMap = toMap(args.channelTrends);
  const channelConversionMap = toMap(args.channelConversionBreakdown);
  const channelConversionTrendMap = toMap(args.channelConversionTrends);

  const sectionLabels = new Set<string>([
    ...sectionBreakdownMap.keys(),
    ...sectionTrendMap.keys(),
    ...sectionConversionMap.keys(),
    ...sectionConversionTrendMap.keys(),
  ]);

  const channelLabels = new Set<string>([
    ...channelBreakdownMap.keys(),
    ...channelTrendMap.keys(),
    ...channelConversionMap.keys(),
    ...channelConversionTrendMap.keys(),
  ]);

  const sectionRows = Array.from(sectionLabels).map((label) => {
    const breakdown = sectionBreakdownMap.get(label);
    const trend = sectionTrendMap.get(label);
    const conversion = sectionConversionMap.get(label);
    const conversionTrend = sectionConversionTrendMap.get(label);

    return {
      label,
      pageViews: breakdown?.pageViews || trend?.currentEvents || 0,
      sessions: breakdown?.sessions || trend?.currentSessions || 0,
      momentumDelta: trend?.deltaEvents || 0,
      conversionRate:
        conversion?.overallConversionRate ??
        conversionTrend?.currentConversionRate ??
        0,
      conversionDelta: conversionTrend?.deltaConversionRate || 0,
    } satisfies BusinessGrowthSectionRow;
  });

  const channelRows = Array.from(channelLabels).map((label) => {
    const breakdown = channelBreakdownMap.get(label);
    const trend = channelTrendMap.get(label);
    const conversion = channelConversionMap.get(label);
    const conversionTrend = channelConversionTrendMap.get(label);

    return {
      label,
      events: breakdown?.events || trend?.currentEvents || 0,
      sessions: breakdown?.sessions || trend?.currentSessions || 0,
      momentumDelta: trend?.deltaEvents || 0,
      conversionRate:
        conversion?.overallConversionRate ??
        conversionTrend?.currentConversionRate ??
        0,
      conversionDelta: conversionTrend?.deltaConversionRate || 0,
    } satisfies BusinessGrowthChannelRow;
  });

  const sectionLeaders = [...sectionRows]
    .sort((left, right) => {
      if (right.momentumDelta !== left.momentumDelta) {
        return right.momentumDelta - left.momentumDelta;
      }
      if (right.conversionRate !== left.conversionRate) {
        return right.conversionRate - left.conversionRate;
      }
      return right.pageViews - left.pageViews;
    })
    .slice(0, 5);

  const sectionRisks = [...sectionRows]
    .sort((left, right) => {
      if (left.momentumDelta !== right.momentumDelta) {
        return left.momentumDelta - right.momentumDelta;
      }
      if (left.conversionRate !== right.conversionRate) {
        return left.conversionRate - right.conversionRate;
      }
      return right.pageViews - left.pageViews;
    })
    .slice(0, 5);

  const channelLeaders = [...channelRows]
    .sort((left, right) => {
      if (right.momentumDelta !== left.momentumDelta) {
        return right.momentumDelta - left.momentumDelta;
      }
      if (right.conversionRate !== left.conversionRate) {
        return right.conversionRate - left.conversionRate;
      }
      return right.events - left.events;
    })
    .slice(0, 5);

  const channelRisks = [...channelRows]
    .sort((left, right) => {
      if (left.momentumDelta !== right.momentumDelta) {
        return left.momentumDelta - right.momentumDelta;
      }
      if (left.conversionRate !== right.conversionRate) {
        return left.conversionRate - right.conversionRate;
      }
      return right.events - left.events;
    })
    .slice(0, 5);

  const bestPath = args.pathConversionLeaders[0] || null;
  const riskPath = args.pathConversionLaggards[0] || null;

  const watchlist: BusinessGrowthWatchItem[] = [];

  if (bestPath) {
    watchlist.push({
      id: 'best-path',
      tone: 'good',
      title: `Best path: ${bestPath.label}`,
      detail: `${bestPath.overallConversionRate.toFixed(1)}% overall conversion across ${bestPath.sessions} session(s).`,
    });
  }

  if (riskPath) {
    watchlist.push({
      id: 'risk-path',
      tone: riskPath.overallConversionRate <= 0 ? 'critical' : 'watch',
      title: `Weak path: ${riskPath.label}`,
      detail: `${riskPath.overallConversionRate.toFixed(1)}% overall conversion across ${riskPath.sessions} session(s).`,
    });
  }

  const weakestSection = sectionRisks[0];
  if (weakestSection && (weakestSection.momentumDelta < 0 || weakestSection.conversionRate < 5)) {
    watchlist.push({
      id: 'weak-section',
      tone:
        weakestSection.momentumDelta < -5 || weakestSection.conversionRate <= 0
          ? 'critical'
          : 'watch',
      title: `Section at risk: ${weakestSection.label}`,
      detail: `${weakestSection.momentumDelta >= 0 ? '+' : ''}${weakestSection.momentumDelta} momentum delta with ${weakestSection.conversionRate.toFixed(1)}% conversion.`,
    });
  }

  const weakestChannel = channelRisks[0];
  if (weakestChannel && (weakestChannel.momentumDelta < 0 || weakestChannel.conversionRate < 5)) {
    watchlist.push({
      id: 'weak-channel',
      tone:
        weakestChannel.momentumDelta < -5 || weakestChannel.conversionRate <= 0
          ? 'critical'
          : 'watch',
      title: `Channel underperforming: ${weakestChannel.label}`,
      detail: `${weakestChannel.momentumDelta >= 0 ? '+' : ''}${weakestChannel.momentumDelta} momentum delta with ${weakestChannel.conversionRate.toFixed(1)}% conversion.`,
    });
  }

  const opportunities: BusinessGrowthOpportunityRow[] = [
    ...sectionRows.map((row) => {
      const opportunityScore = buildOpportunityScore({
        reach: row.pageViews,
        conversionRate: row.conversionRate,
        momentumDelta: row.momentumDelta,
        conversionDelta: row.conversionDelta,
      });

      return {
        id: `section-${row.label}`,
        kind: 'section',
        label: row.label,
        reach: row.pageViews,
        sessions: row.sessions,
        momentumDelta: row.momentumDelta,
        conversionRate: row.conversionRate,
        conversionDelta: row.conversionDelta,
        opportunityScore,
        detail: `${row.pageViews} page views with ${row.conversionRate.toFixed(1)}% conversion and ${row.momentumDelta >= 0 ? '+' : ''}${row.momentumDelta} momentum.`,
        tone: buildOpportunityTone({
          conversionRate: row.conversionRate,
          momentumDelta: row.momentumDelta,
          opportunityScore,
        }),
      } satisfies BusinessGrowthOpportunityRow;
    }),
    ...channelRows.map((row) => {
      const opportunityScore = buildOpportunityScore({
        reach: row.events,
        conversionRate: row.conversionRate,
        momentumDelta: row.momentumDelta,
        conversionDelta: row.conversionDelta,
      });

      return {
        id: `channel-${row.label}`,
        kind: 'channel',
        label: row.label,
        reach: row.events,
        sessions: row.sessions,
        momentumDelta: row.momentumDelta,
        conversionRate: row.conversionRate,
        conversionDelta: row.conversionDelta,
        opportunityScore,
        detail: `${row.events} events with ${row.conversionRate.toFixed(1)}% conversion and ${row.momentumDelta >= 0 ? '+' : ''}${row.momentumDelta} momentum.`,
        tone: buildOpportunityTone({
          conversionRate: row.conversionRate,
          momentumDelta: row.momentumDelta,
          opportunityScore,
        }),
      } satisfies BusinessGrowthOpportunityRow;
    }),
  ]
    .sort((left, right) => {
      if (right.opportunityScore !== left.opportunityScore) {
        return right.opportunityScore - left.opportunityScore;
      }
      return right.reach - left.reach;
    })
    .slice(0, 6);

  return {
    sectionLeaders,
    sectionRisks,
    channelLeaders,
    channelRisks,
    bestPath,
    riskPath,
    watchlist: watchlist.slice(0, 4),
    opportunities,
  };
}
