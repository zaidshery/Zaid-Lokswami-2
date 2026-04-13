import { describe, expect, it } from 'vitest';
import { buildAnalyticsCsvExport } from '@/lib/admin/analyticsExport';
import type { AnalyticsCenterData } from '@/lib/admin/analyticsCenter';

function buildAnalyticsFixture() {
  return {
    dashboard: {
      popularArticles: [
        {
          id: 'article-1',
          title: 'Politics Lead',
          category: 'Politics',
          author: 'Lokswami Desk',
          views: 320,
          publishedAt: '2026-04-08T10:00:00.000Z',
        },
      ],
    },
    timeWindow: {
      end: '2026-04-08T12:00:00.000Z',
      label: 'Last 30 days',
      compareLabel: 'Previous 30 days',
    },
    currentPeriod: {
      reviewItems: [],
    },
    audienceAnalytics: {
      current: {
        metrics: {
          events: 180,
          pageViews: 160,
          sessions: 93,
          contactStarts: 20,
          contactSuccesses: 6,
          popupViews: 28,
          popupSuccesses: 8,
        },
        topPages: [
          {
            page: '/main/politics',
            events: 80,
            sessions: 40,
            lastSeenAt: '2026-04-08T12:00:00.000Z',
          },
        ],
        sourceBreakdown: [{ source: 'web', events: 180, sessions: 93 }],
        deviceBreakdown: [{ device: 'Mobile', events: 120, sessions: 60 }],
        sectionBreakdown: [
          { section: 'Politics', pageViews: 120, sessions: 70 },
          { section: 'Home', pageViews: 90, sessions: 60 },
        ],
        timeZoneBreakdown: [{ timeZone: 'Asia / Calcutta', events: 140, sessions: 70 }],
        languageBreakdown: [{ language: 'en-in', events: 140, sessions: 70 }],
        countryBreakdown: [{ country: 'IN', events: 140, sessions: 70 }],
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
        campaignBreakdown: [
          {
            label: 'Summer Push (Google / Cpc)',
            campaign: 'Summer Push',
            source: 'Google',
            medium: 'Cpc',
            events: 44,
            sessions: 20,
          },
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
        campaignTrends: [
          {
            label: 'Summer Push (Google / Cpc)',
            currentEvents: 44,
            previousEvents: 28,
            deltaEvents: 16,
            currentSessions: 20,
            previousSessions: 14,
            deltaSessions: 6,
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
        deviceConversionBreakdown: [
          {
            label: 'Mobile',
            sessions: 60,
            conversionSessions: 12,
            overallConversionRate: 20,
            popupViewSessions: 18,
            popupConversionSessions: 7,
            popupConversionRate: 38.9,
            contactStartSessions: 10,
            contactConversionSessions: 5,
            contactConversionRate: 50,
          },
        ],
        campaignConversionBreakdown: [
          {
            label: 'Summer Push (Google / Cpc)',
            campaign: 'Summer Push',
            source: 'Google',
            medium: 'Cpc',
            sessions: 20,
            conversionSessions: 5,
            overallConversionRate: 25,
            popupViewSessions: 8,
            popupConversionSessions: 3,
            popupConversionRate: 37.5,
            contactStartSessions: 4,
            contactConversionSessions: 2,
            contactConversionRate: 50,
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
        deviceConversionTrends: [
          {
            label: 'Mobile',
            currentSessions: 60,
            previousSessions: 50,
            currentConversionSessions: 12,
            previousConversionSessions: 8,
            deltaConversionSessions: 4,
            currentConversionRate: 20,
            previousConversionRate: 16,
            deltaConversionRate: 4,
          },
        ],
        campaignConversionTrends: [
          {
            label: 'Summer Push (Google / Cpc)',
            currentSessions: 20,
            previousSessions: 14,
            currentConversionSessions: 5,
            previousConversionSessions: 2,
            deltaConversionSessions: 3,
            currentConversionRate: 25,
            previousConversionRate: 14.3,
            deltaConversionRate: 10.7,
          },
        ],
        campaignLandingLeaders: [
          {
            label: 'Summer Push -> /main/politics',
            campaign: 'Summer Push',
            page: '/main/politics',
            source: 'Google',
            medium: 'Cpc',
            section: 'Politics',
            pageType: 'Article',
            sessions: 12,
            conversionSessions: 4,
            overallConversionRate: 33.3,
            popupViewSessions: 5,
            popupConversionSessions: 2,
            popupConversionRate: 40,
            contactStartSessions: 3,
            contactConversionSessions: 2,
            contactConversionRate: 66.7,
          },
        ],
        campaignLandingRisks: [
          {
            label: 'Summer Push -> /main',
            campaign: 'Summer Push',
            page: '/main',
            source: 'Google',
            medium: 'Cpc',
            section: 'Home',
            pageType: 'Home',
            sessions: 8,
            conversionSessions: 0,
            overallConversionRate: 0,
            popupViewSessions: 2,
            popupConversionSessions: 0,
            popupConversionRate: 0,
            contactStartSessions: 1,
            contactConversionSessions: 0,
            contactConversionRate: 0,
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
        pathConversionTrends: [
          {
            label: 'Search -> Politics',
            currentSessions: 20,
            previousSessions: 14,
            currentConversionSessions: 10,
            previousConversionSessions: 6,
            deltaConversionSessions: 4,
            currentConversionRate: 50,
            previousConversionRate: 42.9,
            deltaConversionRate: 7.1,
          },
        ],
        pageTypeBreakdown: [
          {
            pageType: 'Article',
            section: 'Politics',
            events: 80,
            sessions: 40,
          },
        ],
        eventBreakdown: [{ event: 'Page View', count: 160 }],
        conversion: {
          popupViewToSubmitRate: 28.6,
          contactStartToSubmitRate: 30,
          sessionToContactRate: 6.5,
          sessionToPopupRate: 30.1,
        },
      },
    },
  } as unknown as AnalyticsCenterData;
}

describe('buildAnalyticsCsvExport', () => {
  it('includes growth scorecards in content exports', () => {
    const result = buildAnalyticsCsvExport({
      analytics: buildAnalyticsFixture(),
      tab: 'content',
      focus: 'all',
      content: 'all',
      range: '30d',
      compare: 'previous',
    });

    expect(result.fileName).toContain('lokswami-analytics-content-30d-');
    expect(result.csv).toContain('growth_section_leader');
    expect(result.csv).toContain('Politics');
    expect(result.csv).toContain('growth_channel_leader');
    expect(result.csv).toContain('growth_watch');
    expect(result.csv).toContain('growth_opportunity');
    expect(result.csv).toContain('Search -> Politics');
    expect(result.csv).toContain('Direct -> Home');
  });

  it('supports the dedicated growth export tab', () => {
    const result = buildAnalyticsCsvExport({
      analytics: buildAnalyticsFixture(),
      tab: 'growth',
      focus: 'all',
      content: 'all',
      range: '30d',
      compare: 'previous',
    });

    expect(result.fileName).toContain('lokswami-analytics-growth-30d-');
    expect(result.csv).toContain('growth_section_leader');
    expect(result.csv).toContain('growth_watch');
    expect(result.csv).toContain('growth_opportunity');
    expect(result.csv).toContain('growth_best_path');
    expect(result.csv).toContain('growth_risk_path');
  });

  it('includes campaign records in audience exports', () => {
    const result = buildAnalyticsCsvExport({
      analytics: buildAnalyticsFixture(),
      tab: 'audience',
      focus: 'all',
      content: 'all',
      range: '30d',
      compare: 'previous',
    });

    expect(result.fileName).toContain('lokswami-analytics-audience-30d-');
    expect(result.csv).toContain('audience_campaign');
    expect(result.csv).toContain('Summer Push (Google / Cpc)');
    expect(result.csv).toContain('audience_campaign_trend');
    expect(result.csv).toContain('audience_campaign_conversion');
    expect(result.csv).toContain('audience_campaign_landing_leader');
    expect(result.csv).toContain('audience_campaign_landing_risk');
  });
});
