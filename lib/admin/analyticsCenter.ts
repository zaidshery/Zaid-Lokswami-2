import connectDB from '@/lib/db/mongoose';
import {
  getAudienceAnalyticsSummary,
  type AudienceAnalyticsSummary,
} from '@/lib/admin/audienceAnalytics';
import {
  getReviewQueueOverview,
  type ReviewQueueOverview,
  type WorkflowArticleCard,
} from '@/lib/admin/articleWorkflowOverview';
import { getAdminDashboardData, type AdminDashboardData } from '@/lib/admin/dashboard';
import {
  getEpaperInsights,
  type EpaperBlockedEdition,
  type EpaperInsights,
  type EpaperLowQualityPage,
} from '@/lib/admin/epaperInsights';
import { getSystemHealthSummary, type SystemHealthSummary } from '@/lib/admin/systemHealth';
import { getTeamHealthSummary, type TeamHealthSummary } from '@/lib/admin/teamHealth';
import Story from '@/lib/models/Story';
import { listAllStoredStories } from '@/lib/storage/storiesFile';

export type AnalyticsDateRange = 'today' | '7d' | '30d' | '90d';
export type AnalyticsCompareMode = 'off' | 'previous';

export type AnalyticsContentInventory = {
  articles: number;
  stories: number;
  videos: number;
  epapers: number;
  total: number;
};

export type AnalyticsQueueMetrics = {
  activeEditionCount: number;
  readyEditionCount: number;
  queuePressure: number;
  readyDecisions: number;
  reviewVolume: number;
  queueByType: {
    article: number;
    story: number;
    video: number;
    epaper: number;
  };
};

export type AnalyticsWindow = {
  range: AnalyticsDateRange;
  compare: AnalyticsCompareMode;
  start: string;
  end: string;
  label: string;
  compareLabel: string;
  previousStart: string | null;
  previousEnd: string | null;
};

export type AnalyticsPeriodSnapshot = {
  reviewItems: WorkflowArticleCard[];
  readyDecisionItems: WorkflowArticleCard[];
  activeReviewItems: WorkflowArticleCard[];
  lowQualityPages: EpaperLowQualityPage[];
  blockedEditions: EpaperBlockedEdition[];
  recentSignInMembers: TeamHealthSummary['members'];
  queueMetrics: AnalyticsQueueMetrics;
};

export type AnalyticsComparisonSummary = {
  previousPeriod: AnalyticsPeriodSnapshot | null;
  deltas: {
    queuePressure: number;
    readyDecisions: number;
    blockedEditions: number;
    qualityAlerts: number;
    recentSignIns: number;
    reviewVolume: number;
  } | null;
};

export type AnalyticsCenterData = {
  dashboard: AdminDashboardData;
  reviewQueue: ReviewQueueOverview;
  epaperInsights: EpaperInsights;
  audienceAnalytics: AudienceAnalyticsSummary;
  systemHealth: SystemHealthSummary;
  teamHealth: TeamHealthSummary;
  contentInventory: AnalyticsContentInventory;
  timeWindow: AnalyticsWindow;
  currentPeriod: AnalyticsPeriodSnapshot;
  comparison: AnalyticsComparisonSummary;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDateRangeWindow(range: AnalyticsDateRange) {
  const now = new Date();

  if (range === 'today') {
    const start = startOfDay(now);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - 1);
    return {
      start,
      end: now,
      previousStart,
      previousEnd: start,
      label: 'Today',
      compareLabel: 'Previous day',
    };
  }

  const durationDays = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - durationDays);
  const previousEnd = new Date(start);
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - durationDays);

  return {
    start,
    end: now,
    previousStart,
    previousEnd,
    label: `Last ${durationDays} days`,
    compareLabel: `Previous ${durationDays} days`,
  };
}

function isWithinRange(value: string | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

function buildQueueMetrics(items: WorkflowArticleCard[]): AnalyticsQueueMetrics {
  const readyDecisionItems = items.filter(
    (item) =>
      item.status === 'ready_for_approval' ||
      item.status === 'approved' ||
      item.status === 'scheduled' ||
      item.status === 'ready_to_publish'
  );
  const activeReviewItems = items.filter(
    (item) =>
      item.status !== 'ready_for_approval' &&
      item.status !== 'approved' &&
      item.status !== 'scheduled' &&
      item.status !== 'ready_to_publish'
  );

  return {
    activeEditionCount: activeReviewItems.filter((item) => item.contentType === 'epaper').length,
    readyEditionCount: readyDecisionItems.filter((item) => item.contentType === 'epaper').length,
    queuePressure: activeReviewItems.length,
    readyDecisions: readyDecisionItems.length,
    reviewVolume: items.length,
    queueByType: {
      article: items.filter((item) => item.contentType === 'article').length,
      story: items.filter((item) => item.contentType === 'story').length,
      video: items.filter((item) => item.contentType === 'video').length,
      epaper: items.filter((item) => item.contentType === 'epaper').length,
    },
  };
}

function buildPeriodSnapshot(args: {
  reviewItems: WorkflowArticleCard[];
  lowQualityPages: EpaperLowQualityPage[];
  blockedEditions: EpaperBlockedEdition[];
  recentSignInMembers: TeamHealthSummary['members'];
}) {
  const queueMetrics = buildQueueMetrics(args.reviewItems);
  return {
    reviewItems: args.reviewItems,
    readyDecisionItems: args.reviewItems.filter(
      (item) =>
        item.status === 'ready_for_approval' ||
        item.status === 'approved' ||
        item.status === 'scheduled' ||
        item.status === 'ready_to_publish'
    ),
    activeReviewItems: args.reviewItems.filter(
      (item) =>
        item.status !== 'ready_for_approval' &&
        item.status !== 'approved' &&
        item.status !== 'scheduled' &&
        item.status !== 'ready_to_publish'
    ),
    lowQualityPages: args.lowQualityPages,
    blockedEditions: args.blockedEditions,
    recentSignInMembers: args.recentSignInMembers,
    queueMetrics,
  } satisfies AnalyticsPeriodSnapshot;
}

async function shouldUseFileStore() {
  if (!process.env.MONGODB_URI?.trim()) {
    return true;
  }

  try {
    await connectDB();
    return false;
  } catch (error) {
    console.error('MongoDB unavailable for analytics center, using file fallback.', error);
    return true;
  }
}

async function loadStoryCountFromFileStore() {
  return (await listAllStoredStories()).length;
}

async function loadStoryCountFromMongo() {
  await connectDB();
  return Story.countDocuments({});
}

async function getStoryInventoryCount() {
  if (await shouldUseFileStore()) {
    return loadStoryCountFromFileStore();
  }

  try {
    const [mongoCount, fileCount] = await Promise.all([
      loadStoryCountFromMongo(),
      loadStoryCountFromFileStore(),
    ]);

    return mongoCount > 0 ? mongoCount : fileCount;
  } catch (error) {
    console.error('Story inventory count failed in MongoDB, using file fallback.', error);
    return loadStoryCountFromFileStore();
  }
}

export async function getAnalyticsCenterData(options?: {
  range?: AnalyticsDateRange;
  compare?: AnalyticsCompareMode;
}): Promise<AnalyticsCenterData> {
  const range = options?.range || '30d';
  const compare = options?.compare || 'off';
  const window = getDateRangeWindow(range);

  const [dashboard, reviewQueue, epaperInsights, teamHealth, storyCount] = await Promise.all([
    getAdminDashboardData(),
    getReviewQueueOverview({ maxItems: null }),
    getEpaperInsights({ maxLowQualityPages: null, maxBlockedEditions: null }),
    getTeamHealthSummary(),
    getStoryInventoryCount(),
  ]);

  const currentPeriod = buildPeriodSnapshot({
    reviewItems: reviewQueue.items.filter((item) => isWithinRange(item.updatedAt, window.start, window.end)),
    lowQualityPages: epaperInsights.lowQualityPages.filter((page) =>
      isWithinRange(page.updatedAt, window.start, window.end)
    ),
    blockedEditions: epaperInsights.blockedEditions.filter((edition) =>
      isWithinRange(edition.updatedAt, window.start, window.end)
    ),
    recentSignInMembers: teamHealth.members.filter((member) =>
      isWithinRange(member.lastLoginAt, window.start, window.end)
    ),
  });

  const previousPeriod =
    compare === 'previous' && window.previousStart && window.previousEnd
      ? buildPeriodSnapshot({
          reviewItems: reviewQueue.items.filter((item) =>
            isWithinRange(item.updatedAt, window.previousStart!, window.previousEnd!)
          ),
          lowQualityPages: epaperInsights.lowQualityPages.filter((page) =>
            isWithinRange(page.updatedAt, window.previousStart!, window.previousEnd!)
          ),
          blockedEditions: epaperInsights.blockedEditions.filter((edition) =>
            isWithinRange(edition.updatedAt, window.previousStart!, window.previousEnd!)
          ),
          recentSignInMembers: teamHealth.members.filter((member) =>
            isWithinRange(member.lastLoginAt, window.previousStart!, window.previousEnd!)
          ),
        })
      : null;

  const systemHealth = await getSystemHealthSummary({
    start: window.start,
    end: window.end,
    dataSource: dashboard.source,
    blockedEditions: currentPeriod.blockedEditions.length,
    qualityAlerts: currentPeriod.lowQualityPages.length,
    queuePressure: currentPeriod.queueMetrics.queuePressure,
    inboxEscalations: dashboard.inbox.new,
    teamAlerts: teamHealth.alerts.length,
  });
  const audienceAnalytics = await getAudienceAnalyticsSummary({
    start: window.start,
    end: window.end,
    previousStart: window.previousStart,
    previousEnd: window.previousEnd,
  });

  return {
    dashboard,
    reviewQueue,
    epaperInsights,
    audienceAnalytics,
    systemHealth,
    teamHealth,
    contentInventory: {
      articles: dashboard.stats.totalArticles,
      stories: storyCount,
      videos: dashboard.stats.totalVideos,
      epapers: dashboard.stats.totalEPapers,
      total:
        dashboard.stats.totalArticles +
        storyCount +
        dashboard.stats.totalVideos +
        dashboard.stats.totalEPapers,
    },
    timeWindow: {
      range,
      compare,
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      label: window.label,
      compareLabel: window.compareLabel,
      previousStart: window.previousStart?.toISOString() || null,
      previousEnd: window.previousEnd?.toISOString() || null,
    },
    currentPeriod,
    comparison: {
      previousPeriod,
      deltas: previousPeriod
        ? {
            queuePressure:
              currentPeriod.queueMetrics.queuePressure - previousPeriod.queueMetrics.queuePressure,
            readyDecisions:
              currentPeriod.queueMetrics.readyDecisions - previousPeriod.queueMetrics.readyDecisions,
            blockedEditions:
              currentPeriod.blockedEditions.length - previousPeriod.blockedEditions.length,
            qualityAlerts:
              currentPeriod.lowQualityPages.length - previousPeriod.lowQualityPages.length,
            recentSignIns:
              currentPeriod.recentSignInMembers.length -
              previousPeriod.recentSignInMembers.length,
            reviewVolume:
              currentPeriod.queueMetrics.reviewVolume - previousPeriod.queueMetrics.reviewVolume,
          }
        : null,
    },
  };
}
