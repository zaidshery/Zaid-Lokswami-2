'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  Loader2,
  Plus,
  Search,
  Trash2,
  Video,
} from 'lucide-react';
import { getAuthHeader } from '@/lib/auth/clientToken';
import {
  canCreateContent,
  canDeleteContent,
  type PermissionUser,
} from '@/lib/auth/permissions';
import { isAdminRole, type AdminRole } from '@/lib/auth/roles';
import { NEWS_CATEGORIES } from '@/lib/constants/newsCategories';
import { formatUiDate } from '@/lib/utils/dateFormat';
import type { WorkflowStatus } from '@/lib/workflow/types';

type WorkflowActor = {
  id?: string;
  name?: string;
  email?: string;
  role?: AdminRole;
};

interface AdminVideo {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  duration: number;
  category: string;
  isShort: boolean;
  isPublished: boolean;
  shortsRank: number;
  views: number;
  publishedAt: string;
  updatedAt?: string;
  workflow?: {
    status?: WorkflowStatus;
    createdBy?: WorkflowActor | null;
    assignedTo?: WorkflowActor | null;
  };
}

type TypeFilter = 'all' | 'shorts' | 'standard';
type StatusFilter = 'all' | WorkflowStatus;

const categories = ['all', ...NEWS_CATEGORIES.map((category) => category.nameEn)];
const workflowFilters: StatusFilter[] = [
  'all',
  'draft',
  'submitted',
  'assigned',
  'in_review',
  'copy_edit',
  'changes_requested',
  'ready_for_approval',
  'approved',
  'scheduled',
  'published',
  'rejected',
  'archived',
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const PANEL_CLASS =
  'admin-shell-surface-strong rounded-[30px] p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.22)] dark:shadow-[0_28px_90px_-52px_rgba(0,0,0,0.45)]';

const SOFT_CARD_CLASS =
  'admin-shell-surface-muted rounded-[24px] p-4 shadow-[0_18px_48px_-40px_rgba(15,23,42,0.14)] dark:shadow-[0_18px_48px_-40px_rgba(0,0,0,0.35)]';

const METRIC_CARD_CLASS =
  'admin-shell-surface rounded-[26px] p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.16)] dark:shadow-[0_22px_70px_-46px_rgba(0,0,0,0.38)]';

const EMPTY_STATE_CLASS =
  'rounded-[24px] border border-dashed border-[color:var(--admin-shell-border-strong)] bg-[color:var(--admin-shell-surface-muted)] p-6 text-sm leading-6 text-[color:var(--admin-shell-text-muted)]';

const META_CHIP_CLASS =
  'admin-shell-surface inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-shell-text-muted)]';

const FILTER_INPUT_CLASS =
  'w-full rounded-2xl border border-[color:var(--admin-shell-border)] bg-[color:var(--admin-shell-surface)] px-4 py-3 text-sm text-[color:var(--admin-shell-text)] outline-none transition-colors placeholder:text-[color:var(--admin-shell-text-muted)] focus:border-red-400/40';

const SECONDARY_BUTTON_CLASS =
  'admin-shell-toolbar-btn inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold';

const PRIMARY_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-900 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200';

const DANGER_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20';

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatWorkflowStatus(status: StatusFilter) {
  if (status === 'all') return 'All Status';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function workflowTone(status: WorkflowStatus | undefined) {
  switch (status) {
    case 'published':
      return 'bg-emerald-100 text-emerald-700';
    case 'approved':
    case 'ready_for_approval':
    case 'scheduled':
      return 'bg-blue-100 text-blue-700';
    case 'submitted':
    case 'assigned':
    case 'in_review':
    case 'copy_edit':
    case 'changes_requested':
      return 'bg-amber-100 text-amber-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    case 'archived':
      return 'bg-zinc-200 text-zinc-700';
    case 'draft':
    default:
      return 'bg-zinc-100 text-zinc-700';
  }
}

export default function VideosManagementPage() {
  const { data: session } = useSession();
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const permissionUser = useMemo<PermissionUser | null>(() => {
    const sessionUser = session?.user;
    const email = sessionUser?.email?.trim() || '';
    const role = sessionUser?.role;

    if (!sessionUser || !email || !isAdminRole(role)) {
      return null;
    }

    return {
      id: sessionUser.userId || sessionUser.id || email,
      email,
      name: sessionUser.name?.trim() || email.split('@')[0] || 'Admin',
      role,
    };
  }, [session]);

  const canCreateVideos = canCreateContent(permissionUser?.role, 'video');
  const canDeleteVideos = canDeleteContent(permissionUser);
  const canOpenDesk = Boolean(permissionUser);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch('/api/admin/videos?limit=all', {
          headers: {
            ...getAuthHeader(),
          },
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load videos');
        }

        setVideos(Array.isArray(data.data) ? (data.data as AdminVideo[]) : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load videos');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const filteredVideos = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return videos.filter((video) => {
      if (selectedCategory !== 'all' && video.category !== selectedCategory) return false;
      if (typeFilter === 'shorts' && !video.isShort) return false;
      if (typeFilter === 'standard' && video.isShort) return false;
      if (statusFilter !== 'all' && video.workflow?.status !== statusFilter) return false;

      if (!normalizedSearch) return true;
      return (
        video.title.toLowerCase().includes(normalizedSearch) ||
        video.description.toLowerCase().includes(normalizedSearch) ||
        video.category.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [videos, searchTerm, selectedCategory, typeFilter, statusFilter]);

  const summary = useMemo(() => {
    return filteredVideos.reduce(
      (accumulator, video) => {
        const status = video.workflow?.status || (video.isPublished ? 'published' : 'draft');
        if (status === 'draft') accumulator.drafts += 1;
        if (['submitted', 'assigned', 'in_review', 'copy_edit', 'changes_requested'].includes(status)) {
          accumulator.review += 1;
        }
        if (status === 'ready_for_approval' || status === 'approved' || status === 'scheduled') {
          accumulator.ready += 1;
        }
        if (status === 'published') {
          accumulator.published += 1;
        }
        return accumulator;
      },
      { drafts: 0, review: 0, ready: 0, published: 0 }
    );
  }, [filteredVideos]);

  const handleDelete = async (id: string) => {
    setBusyId(id);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/videos/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeader(),
        },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete video');
      }

      setVideos((prev) => prev.filter((item) => item._id !== id));
      setDeleteConfirmId(null);
      setSuccess('Video deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete video');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[36px] border border-[color:var(--admin-shell-border)] bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_28%),var(--admin-bg-depth)] p-8 text-[color:var(--admin-shell-text)] shadow-[var(--admin-shell-shadow-strong)] lg:p-10">
        <div className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/14" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/14" />
        <div className="relative grid gap-8 xl:grid-cols-[1.25fr,0.82fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
              Video Workflow
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-[color:var(--admin-shell-text)] sm:text-5xl">
              Video Desk
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--admin-shell-text-muted)] sm:text-[15px]">
              Manage long-form videos and Shorts through one calmer workflow desk for review, ranking, and publish readiness.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className={META_CHIP_CLASS}>
                <span>Drafts</span>
                <strong className="text-[color:var(--admin-shell-text)]">{summary.drafts}</strong>
              </div>
              <div className={META_CHIP_CLASS}>
                <span>Review</span>
                <strong className="text-[color:var(--admin-shell-text)]">{summary.review}</strong>
              </div>
              <div className={META_CHIP_CLASS}>
                <span>Ready</span>
                <strong className="text-[color:var(--admin-shell-text)]">{summary.ready}</strong>
              </div>
              <div className={META_CHIP_CLASS}>
                <span>Published</span>
                <strong className="text-[color:var(--admin-shell-text)]">{summary.published}</strong>
              </div>
            </div>
          </div>

          <div className={PANEL_CLASS}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-shell-text-muted)]">
              Desk Actions
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/admin/review-queue" className={SECONDARY_BUTTON_CLASS}>
                Review Queue
              </Link>
              {canCreateVideos ? (
                <Link href="/admin/videos/new" className={PRIMARY_BUTTON_CLASS}>
                  <Plus className="h-4 w-4" />
                  New Video
                </Link>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              <div className={SOFT_CARD_CLASS}>
                <p className="text-sm font-semibold text-[color:var(--admin-shell-text)]">
                  Desk coverage
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--admin-shell-text-muted)]">
                  Shorts, standard videos, and workflow readiness now stay aligned in one shared operator surface.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-2 rounded-[20px] border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2 rounded-[20px] border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className={METRIC_CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--admin-shell-text-muted)]">Drafts</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--admin-shell-text)]">{summary.drafts}</p>
        </div>
        <div className={METRIC_CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--admin-shell-text-muted)]">In Review</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--admin-shell-text)]">{summary.review}</p>
        </div>
        <div className={METRIC_CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--admin-shell-text-muted)]">Ready</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--admin-shell-text)]">{summary.ready}</p>
        </div>
        <div className={METRIC_CARD_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--admin-shell-text-muted)]">Published</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--admin-shell-text)]">{summary.published}</p>
        </div>
      </div>

      <div className={PANEL_CLASS}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search videos..."
              className={cx(FILTER_INPUT_CLASS, 'pl-11')}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className={FILTER_INPUT_CLASS}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              className={FILTER_INPUT_CLASS}
            >
              <option value="all">All Types</option>
              <option value="shorts">Shorts</option>
              <option value="standard">Standard</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className={FILTER_INPUT_CLASS}
            >
              {workflowFilters.map((status) => (
                <option key={status} value={status}>
                  {formatWorkflowStatus(status)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={cx(PANEL_CLASS, 'flex items-center justify-center py-16')}>
          <Loader2 className="h-6 w-6 animate-spin text-red-600 dark:text-red-300" />
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className={cx(PANEL_CLASS, 'py-16 text-center')}>
          <Video className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
          <p className="text-sm text-[color:var(--admin-shell-text-muted)]">No videos found for current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVideos.map((video, index) => {
            const status = video.workflow?.status || (video.isPublished ? 'published' : 'draft');

            return (
              <motion.article
                key={video._id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="admin-shell-surface-strong rounded-[30px] p-5 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.18)] dark:shadow-[0_26px_76px_-46px_rgba(0,0,0,0.42)]"
              >
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="relative h-36 w-full overflow-hidden rounded-[22px] bg-zinc-100 dark:bg-zinc-900 md:h-40 md:w-60 md:shrink-0">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--admin-shell-text-muted)]">
                        No thumbnail
                      </div>
                    )}
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                      {formatDuration(video.duration)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="line-clamp-2 text-xl font-semibold tracking-tight text-[color:var(--admin-shell-text)]">
                        {video.title}
                      </h2>
                      <span className={META_CHIP_CLASS}>
                        {video.isShort ? `Shorts #${video.shortsRank}` : 'Standard'}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${workflowTone(status)}`}
                      >
                        {formatWorkflowStatus(status)}
                      </span>
                    </div>

                    <p className="mb-3 line-clamp-2 text-sm leading-6 text-[color:var(--admin-shell-text-muted)]">{video.description}</p>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--admin-shell-text-muted)]">
                      <span>{video.category}</span>
                      <span>&bull;</span>
                      <span>{video.views} views</span>
                      <span>&bull;</span>
                      <span>
                        {formatUiDate(video.updatedAt || video.publishedAt, video.updatedAt || video.publishedAt)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[color:var(--admin-shell-text-muted)]">
                      {video.workflow?.createdBy?.name ? (
                        <span>Created by: {video.workflow.createdBy.name}</span>
                      ) : null}
                      {video.workflow?.assignedTo?.name ? (
                        <span>Assigned to: {video.workflow.assignedTo.name}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-row items-start justify-end gap-2 md:flex-col">
                    {canOpenDesk ? (
                      <Link href={`/admin/videos/${video._id}/edit`}>
                        <button
                          type="button"
                          className={SECONDARY_BUTTON_CLASS}
                        >
                          Open Desk
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </Link>
                    ) : (
                      <span className={SECONDARY_BUTTON_CLASS}>
                        <Eye className="h-4 w-4" />
                        View Only
                      </span>
                    )}

                    {canDeleteVideos ? (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(video._id)}
                        className="rounded-2xl border border-red-200/80 bg-red-50/80 p-2.5 text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                        aria-label="Delete video"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {deleteConfirmId === video._id ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-red-200 bg-red-50/80 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">Delete this video permanently?</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busyId === video._id}
                        onClick={() => void handleDelete(video._id)}
                        className={cx(DANGER_BUTTON_CLASS, 'disabled:cursor-not-allowed disabled:opacity-60')}
                      >
                        {busyId === video._id ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className={SECONDARY_BUTTON_CLASS}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
