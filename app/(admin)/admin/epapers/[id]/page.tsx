'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Volume2,
  Save,
  Trash2,
  UploadCloud,
  PencilRuler,
} from 'lucide-react';
import DateInputField from '@/components/ui/DateInputField';
import { getAuthHeader } from '@/lib/auth/clientToken';
import type {
  EPaperArticleRecord,
  EPaperPageReviewStatus,
  EPaperRecord,
} from '@/lib/types/epaper';
import { formatUiDate, formatUiDateTime } from '@/lib/utils/dateFormat';
import {
  buildEpaperEditionQualitySummary,
  getEpaperPageQualityTone,
} from '@/lib/utils/epaperQualitySignals';
import { getAllowedEpaperProductionTransitions } from '@/lib/workflow/transitions';
import type { EPaperProductionStatus } from '@/lib/workflow/types';

type EpaperResponse = {
  success: boolean;
  error?: string;
  data?: EPaperRecord & { articleCount?: number };
};

type ArticlesResponse = {
  success: boolean;
  error?: string;
  data?: EPaperArticleRecord[];
};

type TeamOptionsResponse = {
  success?: boolean;
  error?: string;
  data?: AssignableUserOption[];
};

type ProductionActivityResponse = {
  success?: boolean;
  error?: string;
  data?: ProductionActivityItem[];
};

type TtsStatus = 'pending' | 'ready' | 'failed' | 'stale';

type TtsAssetRecord = {
  _id: string;
  sourceId: string;
  sourceParentId?: string;
  variant: 'epaper_story';
  status: TtsStatus;
  audioUrl?: string;
  lastError?: string;
};

type TtsAssetsResponse = {
  success?: boolean;
  data?: {
    assets?: TtsAssetRecord[];
  };
};

type AssignableUserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type ProductionActivityItem = {
  id?: string;
  action?: string;
  message?: string;
  createdAt?: string | null;
  source?: 'audit' | 'derived';
  actor?: {
    name?: string;
    email?: string;
    role?: string | null;
  } | null;
  toStatus?: string | null;
};

const PRODUCTION_ACTION_LABELS: Partial<Record<EPaperProductionStatus, string>> = {
  pages_ready: 'Mark Pages Ready',
  ocr_review: 'Start OCR Review',
  hotspot_mapping: 'Move To Hotspot Mapping',
  qa_review: 'Move To QA Review',
  ready_to_publish: 'Mark Ready To Publish',
  published: 'Publish Edition',
  archived: 'Archive Edition',
};

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function formatProductionStatusLabel(status: string | null | undefined) {
  return String(status || 'draft_upload')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function productionTone(status: string | null | undefined) {
  switch (status) {
    case 'published':
      return 'bg-emerald-100 text-emerald-700';
    case 'ready_to_publish':
      return 'bg-blue-100 text-blue-700';
    case 'qa_review':
    case 'hotspot_mapping':
    case 'ocr_review':
    case 'pages_ready':
      return 'bg-amber-100 text-amber-700';
    case 'archived':
      return 'bg-zinc-200 text-zinc-700';
    default:
      return 'bg-zinc-100 text-zinc-700';
  }
}

function formatPageReviewStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'needs_attention':
      return 'Needs Attention';
    case 'ready':
      return 'Ready';
    case 'pending':
    default:
      return 'Pending';
  }
}

function pageReviewTone(status: string | null | undefined) {
  switch (status) {
    case 'ready':
      return 'bg-emerald-100 text-emerald-700';
    case 'needs_attention':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

export default function AdminEPaperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const epaperId = String(params.id || '');

  const [epaper, setEpaper] = useState<EPaperRecord | null>(null);
  const [articles, setArticles] = useState<EPaperArticleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);
  const [uploadingPage, setUploadingPage] = useState<number | null>(null);
  const [generatingPages, setGeneratingPages] = useState(false);
  const [runningTtsTarget, setRunningTtsTarget] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [epaperTtsByStoryId, setEpaperTtsByStoryId] = useState<Record<string, TtsAssetRecord>>({});

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [publishDate, setPublishDate] = useState('');
  const [productionStatus, setProductionStatus] =
    useState<EPaperProductionStatus>('draft_upload');
  const [productionAssigneeId, setProductionAssigneeId] = useState('');
  const [productionNote, setProductionNote] = useState('');
  const [productionActivity, setProductionActivity] = useState<ProductionActivityItem[]>([]);
  const [isUpdatingProduction, setIsUpdatingProduction] = useState(false);
  const [isLoadingProductionActivity, setIsLoadingProductionActivity] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUserOption[]>([]);
  const [isLoadingAssignableUsers, setIsLoadingAssignableUsers] = useState(false);
  const [selectedPageNumbers, setSelectedPageNumbers] = useState<number[]>([]);
  const [bulkReviewStatus, setBulkReviewStatus] = useState<EPaperPageReviewStatus>('ready');
  const [bulkReviewNote, setBulkReviewNote] = useState('');
  const [isApplyingBulkReview, setIsApplyingBulkReview] = useState(false);

  const loadEpaperTtsAssets = useCallback(async () => {
    if (!epaperId) {
      setEpaperTtsByStoryId({});
      return;
    }

    try {
      const params = new URLSearchParams({
        sourceType: 'epaperArticle',
        sourceParentId: epaperId,
        variant: 'epaper_story',
        limit: 'all',
      });
      const response = await fetch(`/api/admin/tts/assets?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = (await response.json().catch(() => ({}))) as TtsAssetsResponse;
      if (!response.ok || !data.success || !Array.isArray(data.data?.assets)) {
        return;
      }

      const nextMap: Record<string, TtsAssetRecord> = {};
      for (const asset of data.data.assets) {
        if (!nextMap[asset.sourceId]) {
          nextMap[asset.sourceId] = asset;
        }
      }
      setEpaperTtsByStoryId(nextMap);
    } catch {
      // Keep e-paper admin usable even if TTS overview fails to load.
    }
  }, [epaperId]);

  const loadAssignableUsers = useCallback(async () => {
    if (!epaperId) {
      setAssignableUsers([]);
      return;
    }

    setIsLoadingAssignableUsers(true);
    try {
      const response = await fetch('/api/admin/team/options', {
        headers: { ...getAuthHeader() },
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => ({}))) as TeamOptionsResponse;

      if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
        throw new Error(payload.error || 'Failed to load assignable team members');
      }

      setAssignableUsers(payload.data);
    } catch {
      setAssignableUsers([]);
    } finally {
      setIsLoadingAssignableUsers(false);
    }
  }, [epaperId]);

  const loadProductionActivity = useCallback(async () => {
    if (!epaperId) {
      setProductionActivity([]);
      return;
    }

    setIsLoadingProductionActivity(true);
    try {
      const response = await fetch(`/api/admin/epapers/${epaperId}/activity`, {
        headers: { ...getAuthHeader() },
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => ({}))) as ProductionActivityResponse;

      if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
        throw new Error(payload.error || 'Failed to load e-paper activity');
      }

      setProductionActivity(payload.data);
    } catch {
      setProductionActivity([]);
    } finally {
      setIsLoadingProductionActivity(false);
    }
  }, [epaperId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [epaperRes, articlesRes] = await Promise.all([
        fetch(`/api/admin/epapers/${epaperId}`, {
          headers: { ...getAuthHeader() },
        }),
        fetch(`/api/admin/epapers/${epaperId}/articles`, {
          headers: { ...getAuthHeader() },
        }),
      ]);

      const epaperPayload = (await epaperRes.json()) as EpaperResponse;
      const articlesPayload = (await articlesRes.json()) as ArticlesResponse;

      if (!epaperRes.ok || !epaperPayload.success || !epaperPayload.data) {
        throw new Error(epaperPayload.error || 'Failed to load e-paper');
      }

      setEpaper(epaperPayload.data);
      setArticles(Array.isArray(articlesPayload.data) ? articlesPayload.data : []);
      setTitle(epaperPayload.data.title || '');
      setStatus(epaperPayload.data.status || 'draft');
      setPublishDate(epaperPayload.data.publishDate || '');
      setProductionStatus(epaperPayload.data.productionStatus || 'draft_upload');
      setProductionAssigneeId(epaperPayload.data.productionAssignee?.id || '');
      await Promise.all([loadEpaperTtsAssets(), loadProductionActivity()]);
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Failed to load e-paper'));
      setEpaper(null);
      setArticles([]);
      setEpaperTtsByStoryId({});
      setProductionActivity([]);
    } finally {
      setLoading(false);
    }
  }, [epaperId, loadEpaperTtsAssets, loadProductionActivity]);

  useEffect(() => {
    if (!epaperId) return;
    void fetchData();
  }, [epaperId, fetchData]);

  useEffect(() => {
    if (!epaperId) return;
    void loadAssignableUsers();
  }, [epaperId, loadAssignableUsers]);

  useEffect(() => {
    if (!epaper) {
      setSelectedPageNumbers([]);
      return;
    }

    const validPages = new Set(
      Array.from({ length: Math.max(1, epaper.pageCount) }, (_, index) => index + 1)
    );
    setSelectedPageNumbers((current) =>
      current.filter((pageNumber) => validPages.has(pageNumber))
    );
  }, [epaper]);

  const hotspotsByPage = useMemo(() => {
    const map = new Map<number, number>();
    for (const article of articles) {
      const page = Number(article.pageNumber || 0);
      if (!page) continue;
      map.set(page, (map.get(page) || 0) + 1);
    }
    return map;
  }, [articles]);

  const ttsSummary = useMemo(() => {
    let eligible = 0;
    let ready = 0;
    let stale = 0;
    let failed = 0;

    for (const article of articles) {
      const hasReadableText = Boolean(
        String(article.contentHtml || '').trim() || String(article.excerpt || '').trim()
      );
      if (!hasReadableText) continue;

      eligible += 1;
      const asset = epaperTtsByStoryId[article._id];
      if (asset?.status === 'ready' && asset.audioUrl) {
        ready += 1;
      } else if (asset?.status === 'stale') {
        stale += 1;
      } else if (asset?.status === 'failed') {
        failed += 1;
      }
    }

    return {
      eligible,
      ready,
      stale,
      failed,
      missing: Math.max(0, eligible - ready - stale - failed),
    };
  }, [articles, epaperTtsByStoryId]);

  const ttsByPage = useMemo(() => {
    const map = new Map<number, { eligible: number; ready: number }>();
    for (const article of articles) {
      const page = Number(article.pageNumber || 0);
      if (!page) continue;

      const hasReadableText = Boolean(
        String(article.contentHtml || '').trim() || String(article.excerpt || '').trim()
      );
      const current = map.get(page) || { eligible: 0, ready: 0 };
      if (hasReadableText) {
        current.eligible += 1;
        const asset = epaperTtsByStoryId[article._id];
        if (asset?.status === 'ready' && asset.audioUrl) {
          current.ready += 1;
        }
      }
      map.set(page, current);
    }
    return map;
  }, [articles, epaperTtsByStoryId]);

  const editionQualitySummary = useMemo(() => {
    if (!epaper) {
      return buildEpaperEditionQualitySummary({
        pageCount: 1,
        pages: [],
        articles: [],
      });
    }

    return buildEpaperEditionQualitySummary({
      pageCount: epaper.pageCount,
      pages: epaper.pages,
      articles,
    });
  }, [articles, epaper]);

  const saveMeta = async () => {
    if (!epaper) return;
    setSavingMeta(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/admin/epapers/${epaper._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title: title.trim(),
          status,
          publishDate,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save metadata');
      }

      setNotice('E-paper metadata updated');
      await fetchData();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Failed to save metadata'));
    } finally {
      setSavingMeta(false);
    }
  };

  const onPageImageUpload = async (pageNumber: number, file: File | null) => {
    if (!epaper || !file) return;

    setUploadingPage(pageNumber);
    setError('');
    setNotice('');

    try {
      const body = new FormData();
      body.append('pageNumber', String(pageNumber));
      body.append('image', file);

      const response = await fetch(`/api/admin/epapers/${epaper._id}/pages`, {
        method: 'PUT',
        headers: {
          ...getAuthHeader(),
        },
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to upload page image');
      }

      setNotice(`Page ${pageNumber} image updated`);
      await fetchData();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Failed to upload page image'));
    } finally {
      setUploadingPage(null);
    }
  };

  const deletePaper = async () => {
    if (!epaper) return;
    setDeleting(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/epapers/${epaper._id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeader(),
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to delete e-paper');
      }
      router.push('/admin/epapers');
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Failed to delete e-paper'));
      setDeleting(false);
    }
  };

  const generatePageImages = async () => {
    if (!epaper) return;
    setGeneratingPages(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(
        `/api/admin/epapers/${epaper._id}/generate-page-images`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify({ pageCount: epaper.pageCount }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to generate page images');
      }

      if (payload?.warning) {
        setNotice(String(payload.warning));
      } else {
        setNotice('Page images generated successfully');
      }
      await fetchData();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Failed to generate page images'));
    } finally {
      setGeneratingPages(false);
    }
  };

  const generateStoryAudio = async (pageNumber?: number) => {
    if (!epaper) return;

    const target = pageNumber ? `page-${pageNumber}` : 'all';
    setRunningTtsTarget(target);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/admin/epapers/${epaper._id}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          ...(pageNumber ? { pageNumber } : {}),
          forceRegenerate: true,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        data?: {
          result?: {
            processed?: number;
            ready?: number;
            failed?: number;
            skipped?: number;
          };
        };
      };

      if (!response.ok || !payload.success || !payload.data?.result) {
        throw new Error(payload.error || 'Failed to generate story audio');
      }

      const result = payload.data.result;
      setNotice(
        pageNumber
          ? `Page ${pageNumber} story audio updated. ${result.ready || 0} ready, ${result.failed || 0} failed, ${result.skipped || 0} skipped.`
          : `Edition story audio updated. ${result.ready || 0} ready, ${result.failed || 0} failed, ${result.skipped || 0} skipped.`
      );
      await loadEpaperTtsAssets();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Failed to generate story audio'));
    } finally {
      setRunningTtsTarget('');
    }
  };

  const updateProductionDesk = async (nextStatus?: EPaperProductionStatus) => {
    if (!epaper) return;

    setIsUpdatingProduction(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/admin/epapers/${epaper._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          ...(nextStatus ? { productionStatus: nextStatus } : {}),
          assignedToId: productionAssigneeId,
          note: productionNote.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as EpaperResponse & {
        message?: string;
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Failed to update e-paper production');
      }

      setEpaper(payload.data);
      setProductionStatus(payload.data.productionStatus || 'draft_upload');
      setProductionAssigneeId(payload.data.productionAssignee?.id || '');
      setProductionNote('');
      setNotice(payload.message || 'E-paper production updated');
      await loadProductionActivity();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Failed to update e-paper production'));
    } finally {
      setIsUpdatingProduction(false);
    }
  };

  const toggleSelectedPage = (pageNumber: number) => {
    setSelectedPageNumbers((current) =>
      current.includes(pageNumber)
        ? current.filter((value) => value !== pageNumber)
        : [...current, pageNumber].sort((left, right) => left - right)
    );
  };

  const toggleSelectAllPages = (pageNumbers: number[]) => {
    setSelectedPageNumbers((current) =>
      current.length === pageNumbers.length ? [] : pageNumbers
    );
  };

  const applyBulkPageReview = async () => {
    if (!epaper || selectedPageNumbers.length === 0) {
      setError('Select at least one page first.');
      return;
    }

    if (bulkReviewStatus === 'needs_attention' && !bulkReviewNote.trim()) {
      setError('Add a reviewer note before marking pages as needing attention.');
      return;
    }

    setIsApplyingBulkReview(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/admin/epapers/${epaper._id}/pages`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          pages: selectedPageNumbers.map((pageNumber) => ({
            pageNumber,
            reviewStatus: bulkReviewStatus,
            reviewNote: bulkReviewNote.trim(),
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to update selected pages');
      }

      setNotice(
        `Updated ${selectedPageNumbers.length} page${
          selectedPageNumbers.length === 1 ? '' : 's'
        } to ${formatPageReviewStatusLabel(bulkReviewStatus)}.`
      );
      setBulkReviewNote('');
      setSelectedPageNumbers([]);
      await fetchData();
    } catch (err: unknown) {
      setError(toErrorMessage(err, 'Failed to update selected pages'));
    } finally {
      setIsApplyingBulkReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!epaper) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Link
          href="/admin/epapers"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to E-Papers
        </Link>
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'E-paper not found'}
        </div>
      </div>
    );
  }

  const pages = editionQualitySummary.pageSignals.map(({ pageNumber, page, quality }) => ({
    pageNumber,
    page,
    quality,
    hotspotCount: hotspotsByPage.get(pageNumber) || 0,
    tts: ttsByPage.get(pageNumber) || { eligible: 0, ready: 0 },
  }));
  const pageReviewSummary = {
    ready: editionQualitySummary.counts.readyQa,
    needsAttention: editionQualitySummary.counts.needsAttentionQa,
    pending: editionQualitySummary.counts.pendingQa,
  };
  const pageQualitySummary = {
    good: editionQualitySummary.counts.good,
    watch: editionQualitySummary.counts.watch,
    critical: editionQualitySummary.counts.critical,
    lowTextPages: editionQualitySummary.counts.lowTextPages,
  };
  const readiness = epaper.readiness;
  const automation = epaper.automation;
  const activeProductionStatus = productionStatus || epaper.productionStatus || 'draft_upload';
  const allowedProductionTransitions = getAllowedEpaperProductionTransitions(activeProductionStatus);
  const publishBlockers = Array.from(
    new Set([...(readiness?.blockers || []), ...editionQualitySummary.publishBlockers])
  );
  const hasDeskChanges =
    productionNote.trim().length > 0 ||
    productionAssigneeId !== String(epaper.productionAssignee?.id || '');
  const readinessTone =
    readiness?.status === 'ready'
      ? 'emerald'
      : readiness?.status === 'needs-review'
        ? 'amber'
        : 'red';
  const pageCoverage = readiness?.pageImageCoveragePercent ?? 0;
  const hotspotCoverage = readiness?.hotspotCoveragePercent ?? 0;
  const textCoverage = readiness?.textCoveragePercent ?? 0;
  const pageNumbers = pages.map((entry) => entry.pageNumber);
  const allPagesSelected = pageNumbers.length > 0 && selectedPageNumbers.length === pageNumbers.length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/epapers"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to E-Papers
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/ai?ttsVariant=epaper_story&ttsSourceType=epaperArticle&ttsSourceParentId=${encodeURIComponent(String(epaper._id || ''))}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100"
          >
            <Volume2 className="h-3.5 w-3.5" />
            E-paper TTS Ops
          </Link>
          <a
            href={`/api/public/epapers/${encodeURIComponent(String(epaper._id || ''))}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            Open PDF
          </a>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{epaper.title}</h1>
          <p className="mt-1 text-xs text-gray-600">
            {epaper.cityName} ({epaper.citySlug}) | {formatUiDate(epaper.publishDate, epaper.publishDate)}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            {epaper.pageCount} pages | {articles.length} mapped articles
          </p>

          {readiness ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Publish readiness
                  </p>
                  <div
                    className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                      readinessTone === 'emerald'
                        ? 'bg-emerald-100 text-emerald-700'
                        : readinessTone === 'amber'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {readiness.status === 'ready' ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                    {readiness.status === 'ready'
                      ? 'Ready to publish'
                      : readiness.status === 'needs-review'
                        ? 'Needs review'
                        : 'Not ready'}
                  </div>
                </div>

                {automation ? (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                    <p>
                      Source: <span className="font-semibold text-gray-900">{automation.sourceLabel || automation.sourceType}</span>
                    </p>
                    {automation.sourceHost ? (
                      <p className="mt-1">Host: {automation.sourceHost}</p>
                    ) : null}
                    <p className="mt-1">
                      Auto page images:{' '}
                      <span className="font-semibold text-gray-900">
                        {automation.pageImageGenerationAvailable ? 'Available' : 'Manual / blocked'}
                      </span>
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Page images</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{pageCoverage}%</p>
                  <p className="mt-1 text-xs text-gray-600">
                    {readiness.pagesWithImage}/{epaper.pageCount} pages ready
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Hotspot coverage</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{hotspotCoverage}%</p>
                  <p className="mt-1 text-xs text-gray-600">
                    {readiness.pagesWithHotspots}/{epaper.pageCount} pages mapped
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Readable text</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{textCoverage}%</p>
                  <p className="mt-1 text-xs text-gray-600">
                    {readiness.articlesWithReadableText}/{readiness.mappedArticles} stories readable
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Story TTS</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{ttsSummary.ready}</p>
                  <p className="mt-1 text-xs text-gray-600">
                    {ttsSummary.ready}/{ttsSummary.eligible} readable stories ready
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {ttsSummary.missing} missing | {ttsSummary.stale} stale | {ttsSummary.failed} failed
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Page QA Ready</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-700">{pageReviewSummary.ready}</p>
                  <p className="mt-1 text-xs text-gray-600">Pages cleared at the page-review level.</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Needs Attention</p>
                  <p className="mt-2 text-2xl font-bold text-red-700">{pageReviewSummary.needsAttention}</p>
                  <p className="mt-1 text-xs text-gray-600">Pages flagged with OCR or mapping issues.</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pending Page QA</p>
                  <p className="mt-2 text-2xl font-bold text-amber-700">{pageReviewSummary.pending}</p>
                  <p className="mt-1 text-xs text-gray-600">Pages still waiting for explicit review notes.</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Healthy Pages</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-700">{pageQualitySummary.good}</p>
                  <p className="mt-1 text-xs text-gray-600">Pages with mapped stories, readable text, and no active QA warnings.</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Watch Pages</p>
                  <p className="mt-2 text-2xl font-bold text-amber-700">{pageQualitySummary.watch}</p>
                  <p className="mt-1 text-xs text-gray-600">Pages that still need a reviewer pass or minor cleanup.</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Needs Recheck</p>
                  <p className="mt-2 text-2xl font-bold text-red-700">{pageQualitySummary.critical}</p>
                  <p className="mt-1 text-xs text-gray-600">Pages with missing mapping, weak text extraction, or hard QA issues.</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Low Text Pages</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{pageQualitySummary.lowTextPages}</p>
                  <p className="mt-1 text-xs text-gray-600">Pages where at least one mapped story still lacks readable text.</p>
                </div>
              </div>

              {publishBlockers.length > 0 ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Blockers</p>
                  <ul className="mt-2 space-y-1 text-sm text-red-700">
                    {publishBlockers.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {readiness.warnings.length > 0 ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Review notes</p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-700">
                    {readiness.warnings.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {automation?.pageImageGenerationReason ? (
                <p className="mt-3 text-xs text-gray-600">{automation.pageImageGenerationReason}</p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-semibold text-gray-600">Title</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-gray-600">Publish Date</span>
              <DateInputField
                value={publishDate}
                onChange={setPublishDate}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-gray-600">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as 'draft' | 'published')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveMeta()}
              disabled={savingMeta}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingMeta ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>

            <button
              type="button"
              onClick={() => void generatePageImages()}
              disabled={generatingPages || automation?.pageImageGenerationAvailable === false}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
              title={
                automation?.pageImageGenerationReason ||
                'Requires EPAPER_ENABLE_PAGE_IMAGE_GENERATION=1 and server converter binary'
              }
            >
              {generatingPages ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5" />
              )}
              Generate Page Images
            </button>

            <button
              type="button"
              onClick={() => void generateStoryAudio()}
              disabled={runningTtsTarget !== ''}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {runningTtsTarget === 'all' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              Generate Story Audio
            </button>

            <button
              type="button"
              onClick={() => void deletePaper()}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete E-Paper
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {epaper.thumbnailPath ? (
            <div className="relative h-52 w-full">
              <Image
                src={epaper.thumbnailPath}
                alt={epaper.title}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 320px"
              />
            </div>
          ) : (
            <div className="flex h-52 items-center justify-center text-sm text-gray-500">
              No thumbnail
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Production workflow
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${productionTone(
                    activeProductionStatus
                  )}`}
                >
                  {formatProductionStatusLabel(activeProductionStatus)}
                </span>
                {epaper.productionAssignee ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    Assigned to {epaper.productionAssignee.name}
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    Unassigned
                  </span>
                )}
                {epaper.qaCompletedAt ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    QA closed {formatUiDateTime(epaper.qaCompletedAt, formatUiDate(epaper.qaCompletedAt))}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <p>
                Next moves:{' '}
                <span className="font-semibold text-gray-900">
                  {allowedProductionTransitions.length > 0
                    ? allowedProductionTransitions.map((item) => formatProductionStatusLabel(item)).join(', ')
                    : 'Production complete'}
                </span>
              </p>
              <p className="mt-1">
                Readiness:{' '}
                <span className="font-semibold text-gray-900">
                  {readiness?.status === 'ready'
                    ? 'Clear'
                    : readiness?.status === 'needs-review'
                      ? 'Needs review'
                      : 'Blocked'}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label>
              <span className="mb-1 block text-xs font-semibold text-gray-600">Production note</span>
              <textarea
                value={productionNote}
                onChange={(event) => setProductionNote(event.target.value)}
                rows={4}
                placeholder="Capture OCR issues, missing pages, hotspot QA notes, or publish blockers."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
              />
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-gray-600">Production assignee</span>
              <select
                value={productionAssigneeId}
                onChange={(event) => setProductionAssigneeId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
                disabled={isLoadingAssignableUsers || isUpdatingProduction}
              >
                <option value="">Unassigned</option>
                {assignableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                {isLoadingAssignableUsers
                  ? 'Loading assignment options...'
                  : 'Assign a desk owner for OCR, hotspot QA, or final publish checks.'}
              </p>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void updateProductionDesk()}
              disabled={isUpdatingProduction || !hasDeskChanges}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUpdatingProduction ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5" />
              )}
              Save Desk Update
            </button>

            {allowedProductionTransitions.map((nextStatus) => {
              const isBlockedReadyToPublish =
                nextStatus === 'ready_to_publish' && publishBlockers.length > 0;

              return (
                <button
                  key={nextStatus}
                  type="button"
                  onClick={() => void updateProductionDesk(nextStatus)}
                  disabled={isUpdatingProduction || isBlockedReadyToPublish}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${
                    nextStatus === 'published'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : nextStatus === 'ready_to_publish'
                        ? 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isUpdatingProduction ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : nextStatus === 'published' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <PencilRuler className="h-3.5 w-3.5" />
                  )}
                  {PRODUCTION_ACTION_LABELS[nextStatus] || formatProductionStatusLabel(nextStatus)}
                </button>
              );
            })}
          </div>

          {publishBlockers.length ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              Ready-to-publish is locked until blocker pages are cleared. {publishBlockers[0]}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Production activity
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Edition-level assignment, stage changes, page generation, and notes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadProductionActivity()}
              disabled={isLoadingProductionActivity}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoadingProductionActivity ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {isLoadingProductionActivity ? (
              <div className="flex items-center justify-center py-10 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : productionActivity.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                No production activity yet.
              </div>
            ) : (
              productionActivity.map((item, index) => (
                <div
                  key={item.id || `${item.action || 'activity'}-${item.createdAt || index}`}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.message || formatProductionStatusLabel(item.toStatus)}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        {item.actor?.name || item.actor?.email || 'System'}
                        {item.actor?.role ? ` (${item.actor.role})` : ''}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-gray-500">
                      <p>{formatUiDateTime(item.createdAt, formatUiDate(item.createdAt, '')) || 'Unknown time'}</p>
                      <p className="mt-1 uppercase tracking-wide">{item.source || 'audit'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Bulk Page QA
            </p>
            <h2 className="mt-2 text-lg font-semibold text-gray-900">
              Update selected pages together
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Use this when multiple pages are already reviewed or need to be flagged for recheck together.
            </p>
          </div>

          <button
            type="button"
            onClick={() => toggleSelectAllPages(pageNumbers)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            {allPagesSelected ? 'Clear Selection' : 'Select All Pages'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
          <label>
            <span className="mb-1 block text-xs font-semibold text-gray-600">Review status</span>
            <select
              value={bulkReviewStatus}
              onChange={(event) => setBulkReviewStatus(event.target.value as EPaperPageReviewStatus)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
              disabled={isApplyingBulkReview}
            >
              <option value="pending">Pending</option>
              <option value="needs_attention">Needs attention</option>
              <option value="ready">Ready</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold text-gray-600">Shared reviewer note</span>
            <textarea
              value={bulkReviewNote}
              onChange={(event) => setBulkReviewNote(event.target.value)}
              rows={3}
              placeholder="Applied to every selected page. Required if you mark pages as needing attention."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
              disabled={isApplyingBulkReview}
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void applyBulkPageReview()}
              disabled={isApplyingBulkReview || selectedPageNumbers.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isApplyingBulkReview ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Apply To {selectedPageNumbers.length || 0} Page{selectedPageNumbers.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Selected pages: {selectedPageNumbers.length > 0 ? selectedPageNumbers.join(', ') : 'none'}
        </p>
      </div>

      <div className="space-y-3">
        {pages.map(({ pageNumber, page, hotspotCount, tts, quality }) => {
          const hasImage = Boolean(page?.imagePath);
          const isUploading = uploadingPage === pageNumber;
          const isSelected = selectedPageNumbers.includes(pageNumber);
          return (
            <div
              key={pageNumber}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                isSelected ? 'border-primary-300 ring-2 ring-primary-100' : 'border-gray-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectedPage(pageNumber)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      Select
                    </label>
                    <h3 className="text-sm font-semibold text-gray-900">Page {pageNumber}</h3>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    {hasImage ? 'Image available' : 'Image missing'} | {hotspotCount} hotspots
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Story TTS: {tts.ready}/{tts.eligible} ready
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getEpaperPageQualityTone(
                        quality.level
                      )}`}
                    >
                      {quality.label}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pageReviewTone(
                        page?.reviewStatus
                      )}`}
                    >
                      {formatPageReviewStatusLabel(page?.reviewStatus)}
                    </span>
                    {page?.reviewedAt ? (
                      <span className="text-[11px] text-gray-500">
                        Reviewed {formatUiDateTime(page.reviewedAt, formatUiDate(page.reviewedAt))}
                      </span>
                    ) : null}
                    {page?.reviewedBy ? (
                      <span className="text-[11px] text-gray-500">
                        By {page.reviewedBy.name}
                      </span>
                    ) : null}
                  </div>
                  {page?.reviewNote ? (
                    <p className="mt-2 max-w-2xl text-xs text-gray-600">{page.reviewNote}</p>
                  ) : null}
                  {quality.issues[0] ? (
                    <p className="mt-2 max-w-2xl text-xs text-gray-600">{quality.issues[0]}</p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-gray-500">
                    Text coverage {quality.textCoveragePercent}% | {quality.readableStories}/{quality.mappedStories} readable
                  </p>
                </div>
                <Link
                  href={`/admin/epapers/${epaper._id}/page/${pageNumber}`}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                    hasImage
                      ? 'border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                      : 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-500'
                  }`}
                  aria-disabled={!hasImage}
                  onClick={(event) => {
                    if (!hasImage) event.preventDefault();
                  }}
                >
                  <PencilRuler className="h-3.5 w-3.5" />
                  Edit Hotspots
                </Link>
              </div>

              {page?.imagePath ? (
                <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <Image
                    src={page.imagePath}
                    alt={`Page ${pageNumber}`}
                    width={page.width || 1200}
                    height={page.height || 1600}
                    unoptimized
                    className="h-auto max-h-80 w-full object-contain"
                  />
                </div>
              ) : null}

              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="h-3.5 w-3.5" />
                    )}
                    {isUploading ? 'Uploading...' : hasImage ? 'Replace Page Image' : 'Upload Page Image'}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        const file = event.target.files?.[0] || null;
                        void onPageImageUpload(pageNumber, file);
                        event.target.value = '';
                      }}
                      disabled={isUploading}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void generateStoryAudio(pageNumber)}
                    disabled={runningTtsTarget !== '' || tts.eligible === 0}
                    className="inline-flex items-center gap-2 rounded-md border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {runningTtsTarget === `page-${pageNumber}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" />
                    )}
                    Generate Page Audio
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
