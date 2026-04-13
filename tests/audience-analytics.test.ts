import { describe, expect, it } from 'vitest';
import {
  buildAudienceCampaignLandingBreakdown,
  buildAudienceConversionSegmentBreakdown,
  buildAudiencePathConversionBreakdown,
  buildAudienceConversionTrends,
  buildAudienceSegmentTrends,
  classifyAudienceCampaignMeta,
  classifyAudienceChannel,
  classifyAudienceCountry,
  classifyAudienceDeviceCategory,
  classifyAudienceLanguage,
  classifyAudienceTimeZone,
} from '@/lib/admin/audienceAnalytics';

describe('classifyAudienceDeviceCategory', () => {
  it('prefers explicit metadata device category when available', () => {
    expect(
      classifyAudienceDeviceCategory({
        userAgent: '',
        metadata: { deviceCategory: 'mobile' },
      })
    ).toBe('mobile');
  });

  it('falls back to user agent when metadata is missing', () => {
    expect(
      classifyAudienceDeviceCategory({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        metadata: {},
      })
    ).toBe('mobile');
  });
});

describe('classifyAudienceChannel', () => {
  it('returns known referrer categories directly', () => {
    expect(
      classifyAudienceChannel({
        metadata: { referrerCategory: 'search' },
      })
    ).toBe('search');
  });

  it('falls back to direct when no referrer category exists', () => {
    expect(
      classifyAudienceChannel({
        metadata: {},
      })
    ).toBe('direct');
  });
});

describe('classifyAudienceCampaignMeta', () => {
  it('normalizes UTM campaign metadata into a readable campaign label', () => {
    expect(
      classifyAudienceCampaignMeta({
        metadata: {
          utmCampaign: 'summer_push',
          utmSource: 'google',
          utmMedium: 'cpc',
        },
      })
    ).toEqual(
      expect.objectContaining({
        campaign: 'Summer Push',
        source: 'Google',
        medium: 'Cpc',
        label: 'Summer Push (Google / Cpc)',
      })
    );
  });

  it('falls back to no campaign when no UTM metadata exists', () => {
    expect(
      classifyAudienceCampaignMeta({
        metadata: {},
      })
    ).toEqual(
      expect.objectContaining({
        campaign: 'No Campaign',
        source: 'Unknown',
        medium: 'Unknown',
        label: 'No Campaign',
      })
    );
  });
});

describe('regional audience classifiers', () => {
  it('formats browser time zone when present', () => {
    expect(
      classifyAudienceTimeZone({
        metadata: { browserTimeZone: 'Asia/Calcutta' },
      })
    ).toBe('Asia / Calcutta');
  });

  it('normalizes browser language when present', () => {
    expect(
      classifyAudienceLanguage({
        metadata: { browserLanguage: 'en-IN' },
      })
    ).toBe('en-in');
  });

  it('returns country code when present', () => {
    expect(
      classifyAudienceCountry({
        metadata: { countryCode: 'IN' },
      })
    ).toBe('IN');
  });
});

describe('buildAudienceSegmentTrends', () => {
  it('computes deltas across current and previous rows', () => {
    expect(
      buildAudienceSegmentTrends(
        [
          { label: 'Home', events: 20, sessions: 10 },
          { label: 'Article', events: 8, sessions: 5 },
        ],
        [
          { label: 'Home', events: 12, sessions: 7 },
          { label: 'Article', events: 10, sessions: 6 },
        ]
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Home',
          deltaEvents: 8,
          deltaSessions: 3,
        }),
        expect.objectContaining({
          label: 'Article',
          deltaEvents: -2,
          deltaSessions: -1,
        }),
      ])
    );
  });
});

describe('buildAudienceConversionSegmentBreakdown', () => {
  it('groups session-level conversions by the chosen audience segment', () => {
    const rows = buildAudienceConversionSegmentBreakdown(
      [
        {
          event: 'page_view',
          page: '/main',
          source: 'web',
          sessionId: 's1',
          userAgent: '',
          createdAt: '2026-04-01T10:00:00.000Z',
          metadata: { deviceCategory: 'mobile', section: 'home', referrerCategory: 'search' },
        },
        {
          event: 'engagement_popup_view',
          page: '/main',
          source: 'web',
          sessionId: 's1',
          userAgent: '',
          createdAt: '2026-04-01T10:01:00.000Z',
          metadata: { deviceCategory: 'mobile', section: 'home', referrerCategory: 'search' },
        },
        {
          event: 'engagement_popup_submit_success',
          page: '/main',
          source: 'web',
          sessionId: 's1',
          userAgent: '',
          createdAt: '2026-04-01T10:02:00.000Z',
          metadata: { deviceCategory: 'mobile', section: 'home', referrerCategory: 'search' },
        },
        {
          event: 'page_view',
          page: '/main/article/test',
          source: 'web',
          sessionId: 's2',
          userAgent: '',
          createdAt: '2026-04-01T11:00:00.000Z',
          metadata: { deviceCategory: 'desktop', section: 'politics', referrerCategory: 'direct' },
        },
        {
          event: 'contact_form_start',
          page: '/contact',
          source: 'web',
          sessionId: 's2',
          userAgent: '',
          createdAt: '2026-04-01T11:01:00.000Z',
          metadata: { deviceCategory: 'desktop', section: 'politics', referrerCategory: 'direct' },
        },
        {
          event: 'contact_submit_success',
          page: '/contact',
          source: 'web',
          sessionId: 's2',
          userAgent: '',
          createdAt: '2026-04-01T11:02:00.000Z',
          metadata: { deviceCategory: 'desktop', section: 'politics', referrerCategory: 'direct' },
        },
      ],
      (event) => String(event.metadata.deviceCategory || 'unknown')
    );

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'mobile',
          sessions: 1,
          conversionSessions: 1,
          overallConversionRate: 100,
          popupConversionRate: 100,
        }),
        expect.objectContaining({
          label: 'desktop',
          sessions: 1,
          conversionSessions: 1,
          overallConversionRate: 100,
          contactConversionRate: 100,
        }),
      ])
    );
  });
});

describe('buildAudienceConversionTrends', () => {
  it('compares conversion rate movement across periods', () => {
    expect(
      buildAudienceConversionTrends(
        [
          { label: 'Search', sessions: 20, conversionSessions: 8, conversionRate: 40 },
          { label: 'Direct', sessions: 10, conversionSessions: 2, conversionRate: 20 },
        ],
        [
          { label: 'Search', sessions: 18, conversionSessions: 5, conversionRate: 27.8 },
          { label: 'Direct', sessions: 12, conversionSessions: 4, conversionRate: 33.3 },
        ]
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Search',
          deltaConversionSessions: 3,
          deltaConversionRate: 12.2,
        }),
        expect.objectContaining({
          label: 'Direct',
          deltaConversionSessions: -2,
          deltaConversionRate: -13.3,
        }),
      ])
    );
  });
});

describe('buildAudiencePathConversionBreakdown', () => {
  it('ranks best and weakest converting audience paths from session entry metadata', () => {
    const events = [
      {
        event: 'page_view',
        page: '/main/politics',
        source: 'web',
        sessionId: 's1',
        userAgent: '',
        createdAt: '2026-04-01T10:00:00.000Z',
        metadata: {
          deviceCategory: 'mobile',
          section: 'politics',
          pageType: 'article',
          referrerCategory: 'search',
        },
      },
      {
        event: 'contact_submit_success',
        page: '/contact',
        source: 'web',
        sessionId: 's1',
        userAgent: '',
        createdAt: '2026-04-01T10:05:00.000Z',
        metadata: {
          deviceCategory: 'mobile',
          section: 'politics',
          pageType: 'article',
          referrerCategory: 'search',
        },
      },
      {
        event: 'page_view',
        page: '/main',
        source: 'web',
        sessionId: 's2',
        userAgent: '',
        createdAt: '2026-04-01T11:00:00.000Z',
        metadata: {
          deviceCategory: 'desktop',
          section: 'home',
          pageType: 'home',
          referrerCategory: 'direct',
        },
      },
      {
        event: 'page_view',
        page: '/main/videos',
        source: 'web',
        sessionId: 's3',
        userAgent: '',
        createdAt: '2026-04-01T12:00:00.000Z',
        metadata: {
          deviceCategory: 'desktop',
          section: 'videos',
          pageType: 'video',
          referrerCategory: 'social',
        },
      },
      {
        event: 'engagement_popup_submit_success',
        page: '/main/videos',
        source: 'web',
        sessionId: 's3',
        userAgent: '',
        createdAt: '2026-04-01T12:03:00.000Z',
        metadata: {
          deviceCategory: 'desktop',
          section: 'videos',
          pageType: 'video',
          referrerCategory: 'social',
        },
      },
    ];

    const leaders = buildAudiencePathConversionBreakdown(events, 4, 'best');
    const laggards = buildAudiencePathConversionBreakdown(events, 4, 'worst');

    expect(leaders[0]).toEqual(
      expect.objectContaining({
        label: 'Search -> Politics',
        device: 'Mobile',
        pageType: 'Article',
        overallConversionRate: 100,
      })
    );

    expect(laggards[0]).toEqual(
      expect.objectContaining({
        label: 'Direct -> Home',
        device: 'Desktop',
        pageType: 'Home',
        overallConversionRate: 0,
      })
    );
  });
});

describe('buildAudienceCampaignLandingBreakdown', () => {
  it('ranks best and weakest campaign landing pages from tagged session entry data', () => {
    const events = [
      {
        event: 'page_view',
        page: '/main/politics',
        source: 'web',
        sessionId: 'c1',
        userAgent: '',
        createdAt: '2026-04-01T10:00:00.000Z',
        metadata: {
          utmCampaign: 'summer_push',
          utmSource: 'google',
          utmMedium: 'cpc',
          section: 'politics',
          pageType: 'article',
        },
      },
      {
        event: 'contact_submit_success',
        page: '/contact',
        source: 'web',
        sessionId: 'c1',
        userAgent: '',
        createdAt: '2026-04-01T10:03:00.000Z',
        metadata: {
          utmCampaign: 'summer_push',
          utmSource: 'google',
          utmMedium: 'cpc',
          section: 'politics',
          pageType: 'article',
        },
      },
      {
        event: 'page_view',
        page: '/main',
        source: 'web',
        sessionId: 'c2',
        userAgent: '',
        createdAt: '2026-04-01T11:00:00.000Z',
        metadata: {
          utmCampaign: 'summer_push',
          utmSource: 'google',
          utmMedium: 'cpc',
          section: 'home',
          pageType: 'home',
        },
      },
      {
        event: 'page_view',
        page: '/main/videos',
        source: 'web',
        sessionId: 'c3',
        userAgent: '',
        createdAt: '2026-04-01T12:00:00.000Z',
        metadata: {
          utmCampaign: 'festival_boost',
          utmSource: 'facebook',
          utmMedium: 'paid_social',
          section: 'videos',
          pageType: 'video',
        },
      },
      {
        event: 'engagement_popup_submit_success',
        page: '/main/videos',
        source: 'web',
        sessionId: 'c3',
        userAgent: '',
        createdAt: '2026-04-01T12:02:00.000Z',
        metadata: {
          utmCampaign: 'festival_boost',
          utmSource: 'facebook',
          utmMedium: 'paid_social',
          section: 'videos',
          pageType: 'video',
        },
      },
    ];

    const leaders = buildAudienceCampaignLandingBreakdown(events, 4, 'best');
    const risks = buildAudienceCampaignLandingBreakdown(events, 4, 'worst');

    expect(leaders[0]).toEqual(
      expect.objectContaining({
        label: 'Summer Push -> /main/politics',
        source: 'Google',
        medium: 'Cpc',
        overallConversionRate: 100,
      })
    );

    expect(risks[0]).toEqual(
      expect.objectContaining({
        label: 'Summer Push -> /main',
        page: '/main',
        overallConversionRate: 0,
      })
    );
  });
});
