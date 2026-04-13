import type {
  AnalyticsCenterData,
  AnalyticsCompareMode,
  AnalyticsDateRange,
} from '@/lib/admin/analyticsCenter';
import { buildBusinessGrowthInsights } from '@/lib/admin/businessGrowthInsights';
import type { WorkflowArticleCard } from '@/lib/admin/articleWorkflowOverview';

export type AnalyticsExportTab =
  | 'overview'
  | 'audience'
  | 'newsroom_ops'
  | 'epaper_ops'
  | 'team'
  | 'content'
  | 'growth'
  | 'system_health';

export type AnalyticsExportFocus = 'all' | 'review' | 'ready' | 'blocked' | 'quality';
export type AnalyticsExportContentFilter = 'all' | 'article' | 'story' | 'video' | 'epaper';

type AnalyticsExportRow = {
  recordType: string;
  title: string;
  primaryStatus: string;
  secondaryStatus: string;
  owner: string;
  location: string;
  detail: string;
  updatedAt: string;
  link: string;
};

function formatTitleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatContentTypeLabel(contentType: string) {
  return contentType === 'epaper' ? 'E-Paper' : formatTitleCase(contentType);
}

function isReadyWorkflowStatus(status: string) {
  return (
    status === 'ready_for_approval' ||
    status === 'approved' ||
    status === 'scheduled' ||
    status === 'ready_to_publish'
  );
}

function matchesContentFilter(
  item: WorkflowArticleCard,
  contentFilter: AnalyticsExportContentFilter
) {
  return contentFilter === 'all' || item.contentType === contentFilter;
}

function matchesNewsroomFocus(item: WorkflowArticleCard, focus: AnalyticsExportFocus) {
  if (focus === 'ready') {
    return isReadyWorkflowStatus(item.status);
  }

  if (focus === 'review') {
    return !isReadyWorkflowStatus(item.status);
  }

  return true;
}

function escapeCsvValue(value: string) {
  const normalized = String(value || '').replace(/\r?\n/g, ' ').trim();
  if (normalized.includes(',') || normalized.includes('"')) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function buildCsv(rows: AnalyticsExportRow[]) {
  const headers = [
    'recordType',
    'title',
    'primaryStatus',
    'secondaryStatus',
    'owner',
    'location',
    'detail',
    'updatedAt',
    'link',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.recordType,
        row.title,
        row.primaryStatus,
        row.secondaryStatus,
        row.owner,
        row.location,
        row.detail,
        row.updatedAt,
        row.link,
      ]
        .map(escapeCsvValue)
        .join(',')
    ),
  ];

  return lines.join('\n');
}

function buildWorkflowRow(item: WorkflowArticleCard): AnalyticsExportRow {
  return {
    recordType: 'workflow_item',
    title: item.title,
    primaryStatus: formatTitleCase(item.status),
    secondaryStatus: formatContentTypeLabel(item.contentType),
    owner: item.assignedToName || item.createdByName || '',
    location: item.category,
    detail: item.author,
    updatedAt: item.updatedAt,
    link: item.editHref,
  };
}

function buildOverviewExportRows(args: {
  analytics: AnalyticsCenterData;
  focus: AnalyticsExportFocus;
  content: AnalyticsExportContentFilter;
}) {
  return args.analytics.currentPeriod.readyDecisionItems
    .filter(
      (item) => matchesContentFilter(item, args.content) && matchesNewsroomFocus(item, args.focus)
    )
    .map(buildWorkflowRow);
}

function buildAudienceExportRows(analytics: AnalyticsCenterData) {
  return [
    {
      recordType: 'audience_conversion',
      title: 'Popup View To Submit',
      primaryStatus: `${analytics.audienceAnalytics.current.conversion.popupViewToSubmitRate}%`,
      secondaryStatus: '',
      owner: '',
      location: '',
      detail: 'Popup conversion rate in the selected audience window',
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    },
    {
      recordType: 'audience_conversion',
      title: 'Contact Start To Submit',
      primaryStatus: `${analytics.audienceAnalytics.current.conversion.contactStartToSubmitRate}%`,
      secondaryStatus: '',
      owner: '',
      location: '',
      detail: 'Contact-form completion rate in the selected audience window',
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    },
    ...analytics.audienceAnalytics.current.topPages.map((page) => ({
      recordType: 'audience_page',
      title: page.page,
      primaryStatus: `${page.events} events`,
      secondaryStatus: `${page.sessions} sessions`,
      owner: '',
      location: '',
      detail: `Last seen ${page.lastSeenAt}`,
      updatedAt: page.lastSeenAt,
      link: page.page,
    })),
    ...analytics.audienceAnalytics.current.pageTypeBreakdown.map((pageType) => ({
      recordType: 'audience_page_type',
      title: pageType.pageType,
      primaryStatus: `${pageType.events} views`,
      secondaryStatus: `${pageType.sessions} sessions`,
      owner: '',
      location: pageType.section,
      detail: 'Tracked page-type activity',
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.sourceBreakdown.map((source) => ({
      recordType: 'audience_source',
      title: source.source,
      primaryStatus: `${source.events} events`,
      secondaryStatus: `${source.sessions} sessions`,
      owner: '',
      location: '',
      detail: 'Tracked audience source',
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.deviceBreakdown.map((device) => ({
      recordType: 'audience_device',
      title: device.device,
      primaryStatus: `${device.events} events`,
      secondaryStatus: `${device.sessions} sessions`,
      owner: '',
      location: '',
      detail: 'Tracked audience device mix',
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.channelBreakdown.map((channel) => ({
      recordType: 'audience_channel',
      title: channel.channel,
      primaryStatus: `${channel.events} events`,
      secondaryStatus: `${channel.sessions} sessions`,
      owner: '',
      location: '',
      detail: 'Tracked audience acquisition mix',
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.campaignBreakdown.map((campaign) => ({
      recordType: 'audience_campaign',
      title: campaign.label,
      primaryStatus: `${campaign.events} events`,
      secondaryStatus: `${campaign.sessions} sessions`,
      owner: '',
      location: `${campaign.source} / ${campaign.medium}`,
      detail: `Campaign ${campaign.campaign}`,
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.campaignTrends.map((campaign) => ({
      recordType: 'audience_campaign_trend',
      title: campaign.label,
      primaryStatus: `${campaign.currentEvents} current events`,
      secondaryStatus: `${campaign.previousEvents} previous events`,
      owner: '',
      location: 'Campaign Momentum',
      detail: `Delta ${campaign.deltaEvents >= 0 ? '+' : ''}${campaign.deltaEvents} events`,
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.sectionBreakdown.map((section) => ({
      recordType: 'audience_section',
      title: section.section,
      primaryStatus: `${section.pageViews} page views`,
      secondaryStatus: `${section.sessions} sessions`,
      owner: '',
      location: '',
      detail: 'Tracked section performance',
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.timeZoneBreakdown.map((timeZone) => ({
      recordType: 'audience_timezone',
      title: timeZone.timeZone,
      primaryStatus: `${timeZone.events} events`,
      secondaryStatus: `${timeZone.sessions} sessions`,
      owner: '',
      location: '',
      detail: 'Tracked regional time-zone mix',
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.languageBreakdown.map((language) => ({
      recordType: 'audience_language',
      title: language.language,
      primaryStatus: `${language.events} events`,
      secondaryStatus: `${language.sessions} sessions`,
      owner: '',
      location: '',
      detail: 'Tracked browser language mix',
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.countryBreakdown.map((country) => ({
      recordType: 'audience_country',
      title: country.country,
      primaryStatus: `${country.events} events`,
      secondaryStatus: `${country.sessions} sessions`,
      owner: '',
      location: '',
      detail: 'Tracked country signal from request metadata',
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.deviceConversionBreakdown.map((segment) => ({
      recordType: 'audience_device_conversion',
      title: segment.label,
      primaryStatus: `${segment.overallConversionRate}% overall conversion`,
      secondaryStatus: `${segment.conversionSessions}/${segment.sessions} sessions`,
      owner: '',
      location: '',
      detail: `Popup ${segment.popupConversionRate}% | Contact ${segment.contactConversionRate}%`,
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.channelConversionBreakdown.map((segment) => ({
      recordType: 'audience_channel_conversion',
      title: segment.label,
      primaryStatus: `${segment.overallConversionRate}% overall conversion`,
      secondaryStatus: `${segment.conversionSessions}/${segment.sessions} sessions`,
      owner: '',
      location: '',
      detail: `Popup ${segment.popupConversionRate}% | Contact ${segment.contactConversionRate}%`,
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.campaignConversionBreakdown.map((segment) => ({
      recordType: 'audience_campaign_conversion',
      title: segment.label,
      primaryStatus: `${segment.overallConversionRate}% overall conversion`,
      secondaryStatus: `${segment.conversionSessions}/${segment.sessions} sessions`,
      owner: '',
      location: `${segment.source} / ${segment.medium}`,
      detail: `Popup ${segment.popupConversionRate}% | Contact ${segment.contactConversionRate}%`,
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.campaignLandingLeaders.map((landing) => ({
      recordType: 'audience_campaign_landing_leader',
      title: landing.label,
      primaryStatus: `${landing.overallConversionRate}% overall conversion`,
      secondaryStatus: `${landing.conversionSessions}/${landing.sessions} sessions`,
      owner: '',
      location: landing.page,
      detail: `${landing.source} / ${landing.medium} | Popup ${landing.popupConversionRate}% | Contact ${landing.contactConversionRate}%`,
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.campaignLandingRisks.map((landing) => ({
      recordType: 'audience_campaign_landing_risk',
      title: landing.label,
      primaryStatus: `${landing.overallConversionRate}% overall conversion`,
      secondaryStatus: `${landing.conversionSessions}/${landing.sessions} sessions`,
      owner: '',
      location: landing.page,
      detail: `${landing.source} / ${landing.medium} | Popup ${landing.popupConversionRate}% | Contact ${landing.contactConversionRate}%`,
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.sectionConversionBreakdown.map((segment) => ({
      recordType: 'audience_section_conversion',
      title: segment.label,
      primaryStatus: `${segment.overallConversionRate}% overall conversion`,
      secondaryStatus: `${segment.conversionSessions}/${segment.sessions} sessions`,
      owner: '',
      location: '',
      detail: `Popup ${segment.popupConversionRate}% | Contact ${segment.contactConversionRate}%`,
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.pathConversionLeaders.map((segment) => ({
      recordType: 'audience_path_conversion_leader',
      title: segment.label,
      primaryStatus: `${segment.overallConversionRate}% overall conversion`,
      secondaryStatus: `${segment.conversionSessions}/${segment.sessions} sessions`,
      owner: '',
      location: `${segment.device} / ${segment.pageType}`,
      detail: `Popup ${segment.popupConversionRate}% | Contact ${segment.contactConversionRate}%`,
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.pathConversionLaggards.map((segment) => ({
      recordType: 'audience_path_conversion_laggard',
      title: segment.label,
      primaryStatus: `${segment.overallConversionRate}% overall conversion`,
      secondaryStatus: `${segment.conversionSessions}/${segment.sessions} sessions`,
      owner: '',
      location: `${segment.device} / ${segment.pageType}`,
      detail: `Popup ${segment.popupConversionRate}% | Contact ${segment.contactConversionRate}%`,
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
    ...analytics.audienceAnalytics.current.eventBreakdown.map((event) => ({
      recordType: 'audience_event',
      title: event.event,
      primaryStatus: `${event.count} events`,
      secondaryStatus: '',
      owner: '',
      location: '',
      detail: 'Tracked reader interaction',
      updatedAt: analytics.timeWindow.end,
      link: '/admin/analytics?tab=audience',
    })),
  ];
}

function buildNewsroomExportRows(args: {
  analytics: AnalyticsCenterData;
  focus: AnalyticsExportFocus;
  content: AnalyticsExportContentFilter;
}) {
  return args.analytics.currentPeriod.reviewItems
    .filter(
      (item) => matchesContentFilter(item, args.content) && matchesNewsroomFocus(item, args.focus)
    )
    .map(buildWorkflowRow);
}

function buildEpaperExportRows(args: {
  analytics: AnalyticsCenterData;
  focus: AnalyticsExportFocus;
}) {
  if (args.focus === 'quality') {
    return args.analytics.currentPeriod.lowQualityPages.map((page) => ({
      recordType: 'quality_alert',
      title: `${page.epaperTitle} / Page ${page.pageNumber}`,
      primaryStatus: page.qualityLabel,
      secondaryStatus: formatTitleCase(page.reviewStatus),
      owner: page.reviewedByName,
      location: page.cityName,
      detail: page.issueSummary,
      updatedAt: page.updatedAt,
      link: page.editHref,
    }));
  }

  return args.analytics.currentPeriod.blockedEditions.map((edition) => ({
    recordType: 'blocked_edition',
    title: edition.title,
    primaryStatus: formatTitleCase(edition.productionStatus),
    secondaryStatus: `${edition.blockerCount} blocker${edition.blockerCount === 1 ? '' : 's'}`,
    owner: '',
    location: edition.cityName,
    detail: edition.blockers.join(' | '),
    updatedAt: edition.updatedAt,
    link: edition.editHref,
  }));
}

function buildTeamExportRows(analytics: AnalyticsCenterData) {
  return analytics.currentPeriod.recentSignInMembers.map((member) => ({
    recordType: 'team_member',
    title: member.name,
    primaryStatus: formatTitleCase(member.role),
    secondaryStatus: member.isActive ? 'Active' : 'Inactive',
    owner: member.email,
    location: '',
    detail: member.lastLoginAt ? `Last login ${member.lastLoginAt}` : 'Never signed in',
    updatedAt: member.lastLoginAt || '',
    link: '/admin/team',
  }));
}

function buildContentExportRows(args: {
  analytics: AnalyticsCenterData;
  content: AnalyticsExportContentFilter;
}) {
  const growthInsights = buildBusinessGrowthInsights({
    sectionBreakdown: args.analytics.audienceAnalytics.current.sectionBreakdown,
    sectionTrends: args.analytics.audienceAnalytics.current.sectionTrends,
    sectionConversionBreakdown:
      args.analytics.audienceAnalytics.current.sectionConversionBreakdown,
    sectionConversionTrends:
      args.analytics.audienceAnalytics.current.sectionConversionTrends,
    channelBreakdown: args.analytics.audienceAnalytics.current.channelBreakdown,
    channelTrends: args.analytics.audienceAnalytics.current.channelTrends,
    channelConversionBreakdown:
      args.analytics.audienceAnalytics.current.channelConversionBreakdown,
    channelConversionTrends:
      args.analytics.audienceAnalytics.current.channelConversionTrends,
    pathConversionLeaders: args.analytics.audienceAnalytics.current.pathConversionLeaders,
    pathConversionLaggards: args.analytics.audienceAnalytics.current.pathConversionLaggards,
  });

  const growthRows: AnalyticsExportRow[] =
    args.content === 'all'
      ? [
          ...growthInsights.sectionLeaders.map((row) => ({
            recordType: 'growth_section_leader',
            title: row.label,
            primaryStatus: `${row.momentumDelta >= 0 ? '+' : ''}${row.momentumDelta} momentum`,
            secondaryStatus: `${row.conversionRate.toFixed(1)}% conversion`,
            owner: '',
            location: 'Section',
            detail: `${row.pageViews} page views across ${row.sessions} sessions`,
            updatedAt: args.analytics.timeWindow.end,
            link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
          })),
          ...growthInsights.sectionRisks.map((row) => ({
            recordType: 'growth_section_risk',
            title: row.label,
            primaryStatus: `${row.momentumDelta >= 0 ? '+' : ''}${row.momentumDelta} momentum`,
            secondaryStatus: `${row.conversionRate.toFixed(1)}% conversion`,
            owner: '',
            location: 'Section',
            detail: `${row.pageViews} page views across ${row.sessions} sessions`,
            updatedAt: args.analytics.timeWindow.end,
            link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
          })),
          ...growthInsights.channelLeaders.map((row) => ({
            recordType: 'growth_channel_leader',
            title: row.label,
            primaryStatus: `${row.momentumDelta >= 0 ? '+' : ''}${row.momentumDelta} momentum`,
            secondaryStatus: `${row.conversionRate.toFixed(1)}% conversion`,
            owner: '',
            location: 'Channel',
            detail: `${row.events} events across ${row.sessions} sessions`,
            updatedAt: args.analytics.timeWindow.end,
            link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
          })),
          ...growthInsights.channelRisks.map((row) => ({
            recordType: 'growth_channel_risk',
            title: row.label,
            primaryStatus: `${row.momentumDelta >= 0 ? '+' : ''}${row.momentumDelta} momentum`,
            secondaryStatus: `${row.conversionRate.toFixed(1)}% conversion`,
            owner: '',
            location: 'Channel',
            detail: `${row.events} events across ${row.sessions} sessions`,
            updatedAt: args.analytics.timeWindow.end,
            link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
          })),
          ...growthInsights.watchlist.map((item) => ({
            recordType: 'growth_watch',
            title: item.title,
            primaryStatus: formatTitleCase(item.tone),
            secondaryStatus: '',
            owner: '',
            location: 'Growth Watchlist',
            detail: item.detail,
            updatedAt: args.analytics.timeWindow.end,
            link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
          })),
          ...growthInsights.opportunities.map((item) => ({
            recordType: 'growth_opportunity',
            title: item.label,
            primaryStatus: `Score ${item.opportunityScore}`,
            secondaryStatus: `${item.conversionRate.toFixed(1)}% conversion`,
            owner: '',
            location: formatTitleCase(item.kind),
            detail: item.detail,
            updatedAt: args.analytics.timeWindow.end,
            link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
          })),
          ...(growthInsights.bestPath
            ? [
                {
                  recordType: 'growth_best_path',
                  title: growthInsights.bestPath.label,
                  primaryStatus: `${growthInsights.bestPath.overallConversionRate.toFixed(1)}% conversion`,
                  secondaryStatus: `${growthInsights.bestPath.conversionSessions}/${growthInsights.bestPath.sessions} sessions`,
                  owner: '',
                  location: `${growthInsights.bestPath.channel} / ${growthInsights.bestPath.section}`,
                  detail: `${growthInsights.bestPath.device} / ${growthInsights.bestPath.pageType}`,
                  updatedAt: args.analytics.timeWindow.end,
                  link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
                } satisfies AnalyticsExportRow,
              ]
            : []),
          ...(growthInsights.riskPath
            ? [
                {
                  recordType: 'growth_risk_path',
                  title: growthInsights.riskPath.label,
                  primaryStatus: `${growthInsights.riskPath.overallConversionRate.toFixed(1)}% conversion`,
                  secondaryStatus: `${growthInsights.riskPath.conversionSessions}/${growthInsights.riskPath.sessions} sessions`,
                  owner: '',
                  location: `${growthInsights.riskPath.channel} / ${growthInsights.riskPath.section}`,
                  detail: `${growthInsights.riskPath.device} / ${growthInsights.riskPath.pageType}`,
                  updatedAt: args.analytics.timeWindow.end,
                  link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
                } satisfies AnalyticsExportRow,
              ]
            : []),
        ]
      : [];

  if (args.content === 'all' || args.content === 'article') {
    return [
      ...args.analytics.dashboard.popularArticles.map((article) => ({
        recordType: 'popular_article',
        title: article.title,
        primaryStatus: 'Popular Article',
        secondaryStatus: article.category,
        owner: article.author,
        location: '',
        detail: `${article.views} views`,
        updatedAt:
          article.publishedAt && !Number.isNaN(new Date(String(article.publishedAt)).getTime())
            ? new Date(String(article.publishedAt)).toISOString()
            : '',
        link: `/admin/articles/${encodeURIComponent(article.id)}/edit`,
      })),
      ...growthRows,
    ];
  }

  return args.analytics.currentPeriod.reviewItems
    .filter((item) => matchesContentFilter(item, args.content))
    .map(buildWorkflowRow);
}

function buildGrowthExportRows(args: {
  analytics: AnalyticsCenterData;
}) {
  const growthInsights = buildBusinessGrowthInsights({
    sectionBreakdown: args.analytics.audienceAnalytics.current.sectionBreakdown,
    sectionTrends: args.analytics.audienceAnalytics.current.sectionTrends,
    sectionConversionBreakdown:
      args.analytics.audienceAnalytics.current.sectionConversionBreakdown,
    sectionConversionTrends:
      args.analytics.audienceAnalytics.current.sectionConversionTrends,
    channelBreakdown: args.analytics.audienceAnalytics.current.channelBreakdown,
    channelTrends: args.analytics.audienceAnalytics.current.channelTrends,
    channelConversionBreakdown:
      args.analytics.audienceAnalytics.current.channelConversionBreakdown,
    channelConversionTrends:
      args.analytics.audienceAnalytics.current.channelConversionTrends,
    pathConversionLeaders: args.analytics.audienceAnalytics.current.pathConversionLeaders,
    pathConversionLaggards: args.analytics.audienceAnalytics.current.pathConversionLaggards,
  });

  return [
    ...growthInsights.sectionLeaders.map((row) => ({
      recordType: 'growth_section_leader',
      title: row.label,
      primaryStatus: `${row.momentumDelta >= 0 ? '+' : ''}${row.momentumDelta} momentum`,
      secondaryStatus: `${row.conversionRate.toFixed(1)}% conversion`,
      owner: '',
      location: 'Section',
      detail: `${row.pageViews} page views across ${row.sessions} sessions`,
      updatedAt: args.analytics.timeWindow.end,
      link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
    })),
    ...growthInsights.sectionRisks.map((row) => ({
      recordType: 'growth_section_risk',
      title: row.label,
      primaryStatus: `${row.momentumDelta >= 0 ? '+' : ''}${row.momentumDelta} momentum`,
      secondaryStatus: `${row.conversionRate.toFixed(1)}% conversion`,
      owner: '',
      location: 'Section',
      detail: `${row.pageViews} page views across ${row.sessions} sessions`,
      updatedAt: args.analytics.timeWindow.end,
      link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
    })),
    ...growthInsights.channelLeaders.map((row) => ({
      recordType: 'growth_channel_leader',
      title: row.label,
      primaryStatus: `${row.momentumDelta >= 0 ? '+' : ''}${row.momentumDelta} momentum`,
      secondaryStatus: `${row.conversionRate.toFixed(1)}% conversion`,
      owner: '',
      location: 'Channel',
      detail: `${row.events} events across ${row.sessions} sessions`,
      updatedAt: args.analytics.timeWindow.end,
      link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
    })),
    ...growthInsights.channelRisks.map((row) => ({
      recordType: 'growth_channel_risk',
      title: row.label,
      primaryStatus: `${row.momentumDelta >= 0 ? '+' : ''}${row.momentumDelta} momentum`,
      secondaryStatus: `${row.conversionRate.toFixed(1)}% conversion`,
      owner: '',
      location: 'Channel',
      detail: `${row.events} events across ${row.sessions} sessions`,
      updatedAt: args.analytics.timeWindow.end,
      link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
    })),
    ...growthInsights.watchlist.map((item) => ({
      recordType: 'growth_watch',
      title: item.title,
      primaryStatus: formatTitleCase(item.tone),
      secondaryStatus: '',
      owner: '',
      location: 'Growth Watchlist',
      detail: item.detail,
      updatedAt: args.analytics.timeWindow.end,
      link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
    })),
    ...growthInsights.opportunities.map((item) => ({
      recordType: 'growth_opportunity',
      title: item.label,
      primaryStatus: `Score ${item.opportunityScore}`,
      secondaryStatus: `${item.conversionRate.toFixed(1)}% conversion`,
      owner: '',
      location: formatTitleCase(item.kind),
      detail: item.detail,
      updatedAt: args.analytics.timeWindow.end,
      link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
    })),
    ...(growthInsights.bestPath
      ? [
          {
            recordType: 'growth_best_path',
            title: growthInsights.bestPath.label,
            primaryStatus: `${growthInsights.bestPath.overallConversionRate.toFixed(1)}% conversion`,
            secondaryStatus: `${growthInsights.bestPath.conversionSessions}/${growthInsights.bestPath.sessions} sessions`,
            owner: '',
            location: `${growthInsights.bestPath.channel} / ${growthInsights.bestPath.section}`,
            detail: `${growthInsights.bestPath.device} / ${growthInsights.bestPath.pageType}`,
            updatedAt: args.analytics.timeWindow.end,
            link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
          } satisfies AnalyticsExportRow,
        ]
      : []),
    ...(growthInsights.riskPath
      ? [
          {
            recordType: 'growth_risk_path',
            title: growthInsights.riskPath.label,
            primaryStatus: `${growthInsights.riskPath.overallConversionRate.toFixed(1)}% conversion`,
            secondaryStatus: `${growthInsights.riskPath.conversionSessions}/${growthInsights.riskPath.sessions} sessions`,
            owner: '',
            location: `${growthInsights.riskPath.channel} / ${growthInsights.riskPath.section}`,
            detail: `${growthInsights.riskPath.device} / ${growthInsights.riskPath.pageType}`,
            updatedAt: args.analytics.timeWindow.end,
            link: '/admin/analytics?tab=growth&focus=all&content=all&range=30d&compare=previous',
          } satisfies AnalyticsExportRow,
        ]
      : []),
  ];
}

function buildSystemHealthExportRows(analytics: AnalyticsCenterData) {
  return [
    ...analytics.systemHealth.services.map((service) => ({
      recordType: 'service_status',
      title: service.label,
      primaryStatus: formatTitleCase(service.status),
      secondaryStatus: '',
      owner: '',
      location: '',
      detail: `${service.summary} ${service.detail}`.trim(),
      updatedAt: analytics.timeWindow.end,
      link: service.href || '',
    })),
    ...analytics.systemHealth.recentFailures.map((failure) => ({
      recordType: 'service_failure',
      title: failure.message,
      primaryStatus: formatTitleCase(failure.action),
      secondaryStatus: formatContentTypeLabel(failure.sourceType),
      owner: '',
      location: formatTitleCase(failure.variant),
      detail: 'Recent TTS failure event',
      updatedAt: failure.createdAt,
      link: '/admin/analytics?tab=system_health',
    })),
  ];
}

function buildMetaRow(args: {
  tab: AnalyticsExportTab;
  focus: AnalyticsExportFocus;
  content: AnalyticsExportContentFilter;
  range: AnalyticsDateRange;
  compare: AnalyticsCompareMode;
  analytics: AnalyticsCenterData;
}): AnalyticsExportRow {
  return {
    recordType: 'report_meta',
    title: `${formatTitleCase(args.tab)} Export`,
    primaryStatus: formatTitleCase(args.focus),
    secondaryStatus: args.content === 'all' ? 'All Content' : formatContentTypeLabel(args.content),
    owner: '',
    location: args.analytics.timeWindow.label,
    detail:
      args.compare === 'previous'
        ? `Compared with ${args.analytics.timeWindow.compareLabel}`
        : 'Comparison off',
    updatedAt: args.analytics.timeWindow.end,
    link: '',
  };
}

export function buildAnalyticsCsvExport(args: {
  analytics: AnalyticsCenterData;
  tab: AnalyticsExportTab;
  focus: AnalyticsExportFocus;
  content: AnalyticsExportContentFilter;
  range: AnalyticsDateRange;
  compare: AnalyticsCompareMode;
}) {
  let rows: AnalyticsExportRow[] = [];

  switch (args.tab) {
    case 'overview':
      rows = buildOverviewExportRows(args);
      break;
    case 'audience':
      rows = buildAudienceExportRows(args.analytics);
      break;
    case 'newsroom_ops':
      rows = buildNewsroomExportRows(args);
      break;
    case 'epaper_ops':
      rows = buildEpaperExportRows(args);
      break;
    case 'team':
      rows = buildTeamExportRows(args.analytics);
      break;
    case 'content':
      rows = buildContentExportRows(args);
      break;
    case 'growth':
      rows = buildGrowthExportRows(args);
      break;
    case 'system_health':
      rows = buildSystemHealthExportRows(args.analytics);
      break;
    default:
      rows = [];
  }

  const csv = buildCsv([buildMetaRow(args), ...rows]);
  const dateToken = new Date().toISOString().slice(0, 10);
  const fileName = `lokswami-analytics-${args.tab}-${args.range}-${dateToken}.csv`;

  return {
    csv,
    fileName,
    rowCount: rows.length,
  };
}
