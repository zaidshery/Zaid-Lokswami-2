import { describe, expect, it } from 'vitest';
import { buildBusinessGrowthInsights } from '@/lib/admin/businessGrowthInsights';

describe('buildBusinessGrowthInsights', () => {
  it('surfaces growth leaders, risks, and path watch signals', () => {
    const insights = buildBusinessGrowthInsights({
      sectionBreakdown: [
        { section: 'Politics', pageViews: 120, sessions: 70 },
        { section: 'Home', pageViews: 90, sessions: 60 },
      ],
      sectionTrends: [
        {
          label: 'Politics',
          currentEvents: 120,
          previousEvents: 80,
          deltaEvents: 40,
          currentSessions: 70,
          previousSessions: 48,
          deltaSessions: 22,
        },
        {
          label: 'Home',
          currentEvents: 90,
          previousEvents: 110,
          deltaEvents: -20,
          currentSessions: 60,
          previousSessions: 75,
          deltaSessions: -15,
        },
      ],
      sectionConversionBreakdown: [
        {
          label: 'Politics',
          sessions: 70,
          conversionSessions: 14,
          overallConversionRate: 20,
          popupViewSessions: 20,
          popupConversionSessions: 10,
          popupConversionRate: 50,
          contactStartSessions: 15,
          contactConversionSessions: 6,
          contactConversionRate: 40,
        },
        {
          label: 'Home',
          sessions: 60,
          conversionSessions: 0,
          overallConversionRate: 0,
          popupViewSessions: 10,
          popupConversionSessions: 0,
          popupConversionRate: 0,
          contactStartSessions: 5,
          contactConversionSessions: 0,
          contactConversionRate: 0,
        },
      ],
      sectionConversionTrends: [
        {
          label: 'Politics',
          currentSessions: 70,
          previousSessions: 50,
          currentConversionSessions: 14,
          previousConversionSessions: 8,
          deltaConversionSessions: 6,
          currentConversionRate: 20,
          previousConversionRate: 16,
          deltaConversionRate: 4,
        },
        {
          label: 'Home',
          currentSessions: 60,
          previousSessions: 70,
          currentConversionSessions: 0,
          previousConversionSessions: 4,
          deltaConversionSessions: -4,
          currentConversionRate: 0,
          previousConversionRate: 5.7,
          deltaConversionRate: -5.7,
        },
      ],
      channelBreakdown: [
        { channel: 'Search', events: 100, sessions: 55 },
        { channel: 'Direct', events: 50, sessions: 38 },
      ],
      channelTrends: [
        {
          label: 'Search',
          currentEvents: 100,
          previousEvents: 70,
          deltaEvents: 30,
          currentSessions: 55,
          previousSessions: 40,
          deltaSessions: 15,
        },
        {
          label: 'Direct',
          currentEvents: 50,
          previousEvents: 70,
          deltaEvents: -20,
          currentSessions: 38,
          previousSessions: 45,
          deltaSessions: -7,
        },
      ],
      channelConversionBreakdown: [
        {
          label: 'Search',
          sessions: 55,
          conversionSessions: 11,
          overallConversionRate: 20,
          popupViewSessions: 20,
          popupConversionSessions: 8,
          popupConversionRate: 40,
          contactStartSessions: 12,
          contactConversionSessions: 4,
          contactConversionRate: 33.3,
        },
        {
          label: 'Direct',
          sessions: 38,
          conversionSessions: 1,
          overallConversionRate: 2.6,
          popupViewSessions: 8,
          popupConversionSessions: 0,
          popupConversionRate: 0,
          contactStartSessions: 5,
          contactConversionSessions: 1,
          contactConversionRate: 20,
        },
      ],
      channelConversionTrends: [
        {
          label: 'Search',
          currentSessions: 55,
          previousSessions: 42,
          currentConversionSessions: 11,
          previousConversionSessions: 6,
          deltaConversionSessions: 5,
          currentConversionRate: 20,
          previousConversionRate: 14.3,
          deltaConversionRate: 5.7,
        },
        {
          label: 'Direct',
          currentSessions: 38,
          previousSessions: 45,
          currentConversionSessions: 1,
          previousConversionSessions: 3,
          deltaConversionSessions: -2,
          currentConversionRate: 2.6,
          previousConversionRate: 6.7,
          deltaConversionRate: -4.1,
        },
      ],
      pathConversionLeaders: [
        {
          label: 'Search -> Politics',
          channel: 'Search',
          section: 'Politics',
          device: 'Mobile',
          pageType: 'Article',
          sessions: 20,
          conversionSessions: 10,
          overallConversionRate: 50,
          popupViewSessions: 10,
          popupConversionSessions: 6,
          popupConversionRate: 60,
          contactStartSessions: 4,
          contactConversionSessions: 4,
          contactConversionRate: 100,
        },
      ],
      pathConversionLaggards: [
        {
          label: 'Direct -> Home',
          channel: 'Direct',
          section: 'Home',
          device: 'Desktop',
          pageType: 'Home',
          sessions: 24,
          conversionSessions: 0,
          overallConversionRate: 0,
          popupViewSessions: 3,
          popupConversionSessions: 0,
          popupConversionRate: 0,
          contactStartSessions: 2,
          contactConversionSessions: 0,
          contactConversionRate: 0,
        },
      ],
    });

    expect(insights.sectionLeaders[0]).toEqual(
      expect.objectContaining({ label: 'Politics', momentumDelta: 40, conversionRate: 20 })
    );
    expect(insights.sectionRisks[0]).toEqual(
      expect.objectContaining({ label: 'Home', momentumDelta: -20, conversionRate: 0 })
    );
    expect(insights.channelLeaders[0]).toEqual(
      expect.objectContaining({ label: 'Search', momentumDelta: 30, conversionRate: 20 })
    );
    expect(insights.bestPath).toEqual(
      expect.objectContaining({ label: 'Search -> Politics', overallConversionRate: 50 })
    );
    expect(insights.riskPath).toEqual(
      expect.objectContaining({ label: 'Direct -> Home', overallConversionRate: 0 })
    );
    expect(insights.opportunities[0]).toEqual(
      expect.objectContaining({ label: 'Home', kind: 'section', tone: 'critical' })
    );
    expect(insights.opportunities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Direct', kind: 'channel' }),
      ])
    );
    expect(insights.watchlist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'best-path', tone: 'good' }),
        expect.objectContaining({ id: 'risk-path', tone: 'critical' }),
      ])
    );
  });
});
