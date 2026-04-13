import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import Story from '@/lib/models/Story';
import User from '@/lib/models/User';
import { getAdminSession } from '@/lib/auth/admin';
import {
  createEmptyCopyEditorMeta,
  createEmptyReporterMeta,
  normalizeCopyEditorMeta,
  normalizeCopyEditorMetaPartial,
  normalizeReporterMeta,
  normalizeReporterMetaPartial,
  validateCopyEditorMeta,
  validateReporterMeta,
} from '@/lib/content/newsroomMetadata';
import {
  canDeleteContent,
  canEditContent,
  canReadContent,
  canTransitionContent,
  type ContentTransitionAction,
} from '@/lib/auth/permissions';
import {
  buildStoryActivityMessage,
  recordStoryActivity,
} from '@/lib/server/storyActivity';
import type { CreateStoryInput } from '@/lib/storage/storiesFile';
import {
  deleteStoredStory,
  getStoredStoryById,
  updateStoredStory,
} from '@/lib/storage/storiesFile';
import {
  applyStoryWorkflowAction,
  resolveStoryWorkflow,
} from '@/lib/workflow/story';
import { isWorkflowPriority } from '@/lib/workflow/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type LeanStoryRecord = Record<string, unknown> & {
  author?: string;
  isPublished?: boolean;
  workflow?: Record<string, unknown> | null;
  publishedAt?: string | Date;
  updatedAt?: string | Date;
};

type WorkflowActionBody = {
  action?: ContentTransitionAction;
  assignedToId?: string;
  scheduledFor?: string;
  dueAt?: string;
  priority?: string;
  rejectionReason?: string;
  comment?: string;
};

const WORKFLOW_ACTIONS = new Set<ContentTransitionAction>([
  'submit',
  'assign',
  'start_review',
  'move_to_copy_edit',
  'request_changes',
  'mark_ready_for_approval',
  'approve',
  'reject',
  'schedule',
  'publish',
  'archive',
]);

function toBoundedDuration(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(2, Math.min(180, parsed));
}

function normalizeStoryUpdate(body: unknown) {
  const source = typeof body === 'object' && body ? (body as Record<string, unknown>) : {};
  const updates: Record<string, unknown> = {};

  if (typeof source.title === 'string') updates.title = source.title.trim();
  if (typeof source.caption === 'string') updates.caption = source.caption.trim();
  if (typeof source.thumbnail === 'string') updates.thumbnail = source.thumbnail.trim();
  if (typeof source.mediaUrl === 'string') updates.mediaUrl = source.mediaUrl.trim();
  if (typeof source.linkUrl === 'string') updates.linkUrl = source.linkUrl.trim();
  if (typeof source.linkLabel === 'string') updates.linkLabel = source.linkLabel.trim();
  if (typeof source.category === 'string') updates.category = source.category.trim();
  if (typeof source.author === 'string') updates.author = source.author.trim();
  if (source.reporterMeta !== undefined) {
    updates.reporterMeta = normalizeReporterMetaPartial(source.reporterMeta);
  }
  if (source.copyEditorMeta !== undefined) {
    updates.copyEditorMeta = normalizeCopyEditorMetaPartial(source.copyEditorMeta);
  }

  if (source.mediaType !== undefined) {
    if (source.mediaType === 'image' || source.mediaType === 'video') {
      updates.mediaType = source.mediaType;
    } else {
      return { updates: null, error: 'Invalid media type' };
    }
  }

  if (source.durationSeconds !== undefined) {
    const duration = toBoundedDuration(source.durationSeconds);
    if (duration === null) return { updates: null, error: 'Invalid duration' };
    updates.durationSeconds = duration;
  }

  if (source.priority !== undefined) {
    const priority = Number.parseInt(String(source.priority), 10);
    if (!Number.isFinite(priority)) return { updates: null, error: 'Invalid priority' };
    updates.priority = priority;
  }

  if (source.views !== undefined) {
    const views = Number.parseInt(String(source.views), 10);
    if (!Number.isFinite(views) || views < 0) {
      return { updates: null, error: 'Invalid views count' };
    }
    updates.views = views;
  }

  if (typeof source.isPublished === 'boolean') {
    updates.isPublished = source.isPublished;
  }

  if (source.publishedAt !== undefined) {
    const publishedAt = new Date(String(source.publishedAt));
    if (Number.isNaN(publishedAt.getTime())) {
      return { updates: null, error: 'Invalid published date' };
    }
    updates.publishedAt = publishedAt;
  }

  if (typeof updates.title === 'string' && updates.title.length > 140) {
    return { updates: null, error: 'Title is too long (max 140 characters)' };
  }

  if (typeof updates.caption === 'string' && updates.caption.length > 300) {
    return { updates: null, error: 'Caption is too long (max 300 characters)' };
  }

  if (typeof updates.linkUrl === 'string' && updates.linkUrl.length > 500) {
    return { updates: null, error: 'Link URL is too long' };
  }

  if (updates.reporterMeta && typeof updates.reporterMeta === 'object') {
    const reporterMetaError = validateReporterMeta(
      normalizeReporterMeta({
        ...createEmptyReporterMeta(),
        ...updates.reporterMeta,
      })
    );
    if (reporterMetaError) {
      return { updates: null, error: reporterMetaError };
    }
  }

  if (updates.copyEditorMeta && typeof updates.copyEditorMeta === 'object') {
    const copyEditorMetaError = validateCopyEditorMeta(
      normalizeCopyEditorMeta({
        ...createEmptyCopyEditorMeta(),
        ...updates.copyEditorMeta,
      })
    );
    if (copyEditorMetaError) {
      return { updates: null, error: copyEditorMetaError };
    }
  }

  return { updates, error: null };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '';
}

async function shouldUseFileStore() {
  if (!process.env.MONGODB_URI) return true;

  try {
    await connectDB();
    return false;
  } catch (error) {
    console.error('MongoDB unavailable for story id route, using file store.', error);
    return true;
  }
}

function buildStoryPermissionRecord(story: {
  author?: unknown;
  isPublished?: unknown;
  workflow?: unknown;
  publishedAt?: unknown;
  updatedAt?: unknown;
}) {
  return {
    legacyAuthorName: typeof story.author === 'string' ? story.author : '',
    workflow: resolveStoryWorkflow({
      workflow:
        typeof story.workflow === 'object' && story.workflow
          ? (story.workflow as Record<string, unknown>)
          : null,
      isPublished: story.isPublished,
      publishedAt: story.publishedAt,
      updatedAt: story.updatedAt,
    }),
  };
}

function resolveStoryResponse(
  story: {
    author?: string;
    isPublished?: boolean;
    workflow?: unknown;
    publishedAt?: unknown;
    updatedAt?: unknown;
  }
) {
  const workflow = resolveStoryWorkflow({
    workflow:
      typeof story.workflow === 'object' && story.workflow
        ? (story.workflow as Record<string, unknown>)
        : null,
    isPublished: story.isPublished,
    publishedAt: story.publishedAt,
    updatedAt: story.updatedAt,
  });

  return {
    ...story,
    isPublished: workflow.status === 'published',
    workflow,
  };
}

function isWorkflowAction(value: unknown): value is ContentTransitionAction {
  return typeof value === 'string' && WORKFLOW_ACTIONS.has(value as ContentTransitionAction);
}

function parseOptionalDate(value: unknown) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toStoredWorkflowUpdate(workflow: ReturnType<typeof resolveStoryWorkflow>) {
  return {
    ...workflow,
    submittedAt: workflow.submittedAt?.toISOString() || null,
    approvedAt: workflow.approvedAt?.toISOString() || null,
    rejectedAt: workflow.rejectedAt?.toISOString() || null,
    publishedAt: workflow.publishedAt?.toISOString() || null,
    scheduledFor: workflow.scheduledFor?.toISOString() || null,
    dueAt: workflow.dueAt?.toISOString() || null,
    comments: workflow.comments.map((comment) => ({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
    })),
  };
}

function compactMetadata(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === null || entry === undefined) return false;
      if (typeof entry === 'string') return entry.trim().length > 0;
      if (Array.isArray(entry)) return entry.length > 0;
      return true;
    })
  );
}

async function resolveAssignee(assignedToId: string) {
  const normalized = assignedToId.trim();
  if (!normalized) return null;

  const query = Types.ObjectId.isValid(normalized)
    ? { _id: normalized }
    : { email: normalized.toLowerCase() };
  const assignee = await User.findOne(query).select('_id name email role').lean();
  if (!assignee || typeof assignee.role !== 'string' || assignee.role === 'reader') {
    return null;
  }

  return {
    id: String(assignee._id || ''),
    name: String(assignee.name || '').trim() || String(assignee.email || '').trim(),
    email: String(assignee.email || '').trim(),
    role: assignee.role,
  };
}

function applyLegacyPublishCompatibility(
  currentWorkflow: ReturnType<typeof resolveStoryWorkflow>,
  explicitPublishedState: boolean | undefined
) {
  if (typeof explicitPublishedState !== 'boolean') {
    return currentWorkflow;
  }

  if (explicitPublishedState) {
    return {
      ...currentWorkflow,
      status: 'published' as const,
      publishedAt: new Date(),
      scheduledFor: null,
      rejectionReason: '',
    };
  }

  if (currentWorkflow.status === 'published') {
    return {
      ...currentWorkflow,
      status: 'draft' as const,
      publishedAt: null,
    };
  }

  return currentWorkflow;
}

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const user = await getAdminSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (await shouldUseFileStore()) {
      const story = await getStoredStoryById(id);
      if (!story) {
        return NextResponse.json(
          { success: false, error: 'Story not found' },
          { status: 404 }
        );
      }
      if (!canReadContent(user, buildStoryPermissionRecord(story), { allowViewerRead: true })) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
      return NextResponse.json({ success: true, data: resolveStoryResponse(story) });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid story ID' },
        { status: 400 }
      );
    }

    const story = (await Story.findById(id).lean()) as LeanStoryRecord | null;
    if (!story) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }

    if (!canReadContent(user, buildStoryPermissionRecord(story), { allowViewerRead: true })) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: resolveStoryResponse(story) });
  } catch (error) {
    console.error('Error fetching story:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const user = await getAdminSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (!isWorkflowAction((body as WorkflowActionBody).action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid workflow action' },
        { status: 400 }
      );
    }

    const actionBody = body as WorkflowActionBody;
    const action = actionBody.action;

    if (await shouldUseFileStore()) {
      const currentStory = await getStoredStoryById(id);
      if (!currentStory) {
        return NextResponse.json(
          { success: false, error: 'Story not found' },
          { status: 404 }
        );
      }

      const permissionRecord = buildStoryPermissionRecord(currentStory);
      if (!action || !canTransitionContent(user, permissionRecord, action)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      let assignedTo = null;
      if (action === 'assign') {
        if (!process.env.MONGODB_URI?.trim()) {
          return NextResponse.json(
            { success: false, error: 'Assignments require MongoDB-backed users.' },
            { status: 503 }
          );
        }

        await connectDB();
        assignedTo = await resolveAssignee(String(actionBody.assignedToId || ''));
        if (!assignedTo) {
          return NextResponse.json(
            { success: false, error: 'Valid assignedToId is required' },
            { status: 400 }
          );
        }
      }

      try {
        const { fromStatus, toStatus, nextWorkflow } = applyStoryWorkflowAction({
          action,
          actor: user,
          currentWorkflow: resolveStoryWorkflow(currentStory),
          assignedTo,
          scheduledFor: parseOptionalDate(actionBody.scheduledFor),
          dueAt: parseOptionalDate(actionBody.dueAt),
          priority: isWorkflowPriority(actionBody.priority) ? actionBody.priority : undefined,
          comment: actionBody.comment,
          rejectionReason: actionBody.rejectionReason,
        });

        const story = await updateStoredStory(
          id,
          {
            isPublished: toStatus === 'published',
            workflow: toStoredWorkflowUpdate(nextWorkflow),
            ...(toStatus === 'published'
              ? { publishedAt: new Date().toISOString() }
              : {}),
          },
          );

        if (!story) {
          return NextResponse.json(
            { success: false, error: 'Story not found' },
            { status: 404 }
          );
        }

        await recordStoryActivity({
          storyId: id,
          actor: user,
          action,
          fromStatus,
          toStatus,
          message: buildStoryActivityMessage({
            action,
            toStatus,
            assignedTo: nextWorkflow.assignedTo,
            rejectionReason: nextWorkflow.rejectionReason,
          }),
          metadata: compactMetadata({
            assignedToId: nextWorkflow.assignedTo?.id || '',
            assignedToName: nextWorkflow.assignedTo?.name || '',
            priority: nextWorkflow.priority,
            dueAt: nextWorkflow.dueAt?.toISOString() || '',
            scheduledFor: nextWorkflow.scheduledFor?.toISOString() || '',
            rejectionReason: nextWorkflow.rejectionReason || '',
            comment: actionBody.comment?.trim() || '',
          }),
        });

        return NextResponse.json({
          success: true,
          data: resolveStoryResponse(story),
          message: `Story moved to ${toStatus}.`,
        });
      } catch (workflowError) {
        return NextResponse.json(
          {
            success: false,
            error:
              workflowError instanceof Error
                ? workflowError.message
                : 'Failed to update story workflow',
          },
          { status: 400 }
        );
      }
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid story ID' },
        { status: 400 }
      );
    }

    const current = (await Story.findById(id).lean()) as LeanStoryRecord | null;
    if (!current) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }

    const permissionRecord = buildStoryPermissionRecord(current);
    if (!action || !canTransitionContent(user, permissionRecord, action)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    let assignedTo = null;
    if (action === 'assign') {
      assignedTo = await resolveAssignee(String(actionBody.assignedToId || ''));
      if (!assignedTo) {
        return NextResponse.json(
          { success: false, error: 'Valid assignedToId is required' },
          { status: 400 }
        );
      }
    }

    try {
      const { fromStatus, toStatus, nextWorkflow } = applyStoryWorkflowAction({
        action,
        actor: user,
        currentWorkflow: resolveStoryWorkflow(current),
        assignedTo,
        scheduledFor: parseOptionalDate(actionBody.scheduledFor),
        dueAt: parseOptionalDate(actionBody.dueAt),
        priority: isWorkflowPriority(actionBody.priority) ? actionBody.priority : undefined,
        comment: actionBody.comment,
        rejectionReason: actionBody.rejectionReason,
      });

      const story = await Story.findByIdAndUpdate(
        id,
        {
          $set: {
            workflow: nextWorkflow,
            isPublished: toStatus === 'published',
            updatedAt: new Date(),
            ...(toStatus === 'published' ? { publishedAt: new Date() } : {}),
          },
        },
        { new: true, runValidators: true }
      );

      if (!story) {
        return NextResponse.json(
          { success: false, error: 'Story not found' },
          { status: 404 }
        );
      }

      await recordStoryActivity({
        storyId: id,
        actor: user,
        action,
        fromStatus,
        toStatus,
        message: buildStoryActivityMessage({
          action,
          toStatus,
          assignedTo: nextWorkflow.assignedTo,
          rejectionReason: nextWorkflow.rejectionReason,
        }),
        metadata: compactMetadata({
          assignedToId: nextWorkflow.assignedTo?.id || '',
          assignedToName: nextWorkflow.assignedTo?.name || '',
          priority: nextWorkflow.priority,
          dueAt: nextWorkflow.dueAt?.toISOString() || '',
          scheduledFor: nextWorkflow.scheduledFor?.toISOString() || '',
          rejectionReason: nextWorkflow.rejectionReason || '',
          comment: actionBody.comment?.trim() || '',
        }),
      });

      return NextResponse.json({
        success: true,
        data: resolveStoryResponse(story.toObject()),
        message: `Story moved to ${toStatus}.`,
      });
    } catch (workflowError) {
      return NextResponse.json(
        {
          success: false,
          error:
            workflowError instanceof Error
              ? workflowError.message
              : 'Failed to update story workflow',
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error('Error updating story workflow:', error);
    const message =
      process.env.NODE_ENV !== 'production'
        ? getErrorMessage(error) || 'Failed to update story workflow'
        : 'Failed to update story workflow';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const user = await getAdminSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { updates, error } = normalizeStoryUpdate(body);

    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    if (await shouldUseFileStore()) {
      const currentStory = await getStoredStoryById(id);
      if (!currentStory) {
        return NextResponse.json(
          { success: false, error: 'Story not found' },
          { status: 404 }
        );
      }
      if (!canEditContent(user, buildStoryPermissionRecord(currentStory))) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const publishedState =
        typeof updates.isPublished === 'boolean' ? Boolean(updates.isPublished) : undefined;
      const nextWorkflow = applyLegacyPublishCompatibility(
        resolveStoryWorkflow(currentStory),
        publishedState
      );

      const normalizedForStore = {
        ...(updates as Partial<CreateStoryInput> & {
          durationSeconds?: number;
          priority?: number;
          views?: number;
          publishedAt?: string;
        }),
        workflow: toStoredWorkflowUpdate(nextWorkflow),
        isPublished: nextWorkflow.status === 'published',
        ...(updates.publishedAt instanceof Date
          ? { publishedAt: updates.publishedAt.toISOString() }
          : {}),
      };

      const story = await updateStoredStory(id, normalizedForStore);
      if (!story) {
        return NextResponse.json(
          { success: false, error: 'Story not found' },
          { status: 404 }
        );
      }

      await recordStoryActivity({
        storyId: id,
        actor: user,
        action: 'saved',
        toStatus: resolveStoryWorkflow(story).status,
        message: buildStoryActivityMessage({ action: 'saved' }),
        metadata: {
          changedFields: Object.keys(updates),
        },
      });

      return NextResponse.json({
        success: true,
        data: resolveStoryResponse(story),
        message: 'Story updated successfully',
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid story ID' },
        { status: 400 }
      );
    }

    const current = (await Story.findById(id).lean()) as LeanStoryRecord | null;
    if (!current) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }
    if (!canEditContent(user, buildStoryPermissionRecord(current))) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const publishedState =
      typeof updates.isPublished === 'boolean' ? Boolean(updates.isPublished) : undefined;
    const nextWorkflow = applyLegacyPublishCompatibility(
      resolveStoryWorkflow(current),
      publishedState
    );

    const story = await Story.findByIdAndUpdate(
      id,
      {
        ...updates,
        isPublished: nextWorkflow.status === 'published',
        workflow: nextWorkflow,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!story) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }

    await recordStoryActivity({
      storyId: id,
      actor: user,
      action: 'saved',
      toStatus: resolveStoryWorkflow(story.toObject()).status,
      message: buildStoryActivityMessage({ action: 'saved' }),
      metadata: {
        changedFields: Object.keys(updates),
      },
    });

    return NextResponse.json({
      success: true,
      data: resolveStoryResponse(story.toObject()),
      message: 'Story updated successfully',
    });
  } catch (error: unknown) {
    console.error('Error updating story:', error);
    const message =
      process.env.NODE_ENV !== 'production'
        ? getErrorMessage(error) || 'Failed to update story'
        : 'Failed to update story';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const user = await getAdminSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (!canDeleteContent(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (await shouldUseFileStore()) {
      const deleted = await deleteStoredStory(id);
      if (!deleted) {
        return NextResponse.json(
          { success: false, error: 'Story not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Story deleted successfully',
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid story ID' },
        { status: 400 }
      );
    }

    const story = await Story.findByIdAndDelete(id);
    if (!story) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Story deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting story:', error);
    const message =
      process.env.NODE_ENV !== 'production'
        ? getErrorMessage(error) || 'Failed to delete story'
        : 'Failed to delete story';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
