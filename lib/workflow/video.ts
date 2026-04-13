import {
  applyArticleWorkflowAction,
  toWorkflowActorRef,
} from '@/lib/workflow/article';
import {
  createWorkflowMeta,
  isWorkflowPriority,
  isWorkflowStatus,
  type WorkflowActorRef,
  type WorkflowMeta,
} from '@/lib/workflow/types';

function parseOptionalDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeActorRef(value: unknown): WorkflowActorRef | null {
  const source = typeof value === 'object' && value ? (value as Record<string, unknown>) : null;
  const id = typeof source?.id === 'string' ? source.id.trim() : '';
  const name = typeof source?.name === 'string' ? source.name.trim() : '';
  const email = typeof source?.email === 'string' ? source.email.trim() : '';
  const role = source?.role;

  if (!id || !name || !email || typeof role !== 'string') {
    return null;
  }

  return {
    id,
    name,
    email,
    role: role as WorkflowActorRef['role'],
  };
}

export function resolveVideoWorkflow(source: {
  workflow?: unknown;
  isPublished?: unknown;
  publishedAt?: unknown;
  updatedAt?: unknown;
  createdBy?: WorkflowActorRef | null;
}): WorkflowMeta {
  const workflow =
    typeof source.workflow === 'object' && source.workflow
      ? (source.workflow as Record<string, unknown>)
      : null;
  const fallbackStatus =
    source.isPublished === false ? 'draft' : source.publishedAt || source.updatedAt ? 'published' : 'draft';

  return createWorkflowMeta({
    ...workflow,
    status: isWorkflowStatus(workflow?.status) ? workflow.status : fallbackStatus,
    priority: isWorkflowPriority(workflow?.priority) ? workflow.priority : 'normal',
    createdBy: normalizeActorRef(workflow?.createdBy) ?? source.createdBy ?? null,
    assignedTo: normalizeActorRef(workflow?.assignedTo),
    reviewedBy: normalizeActorRef(workflow?.reviewedBy),
    submittedAt: parseOptionalDate(workflow?.submittedAt),
    approvedAt: parseOptionalDate(workflow?.approvedAt),
    rejectedAt: parseOptionalDate(workflow?.rejectedAt),
    publishedAt: parseOptionalDate(workflow?.publishedAt),
    scheduledFor: parseOptionalDate(workflow?.scheduledFor),
    dueAt: parseOptionalDate(workflow?.dueAt),
    rejectionReason:
      typeof workflow?.rejectionReason === 'string' ? workflow.rejectionReason : '',
    comments: Array.isArray(workflow?.comments)
      ? workflow.comments.map((comment) => ({
          id: String(comment.id || '').trim() || cryptoRandomId(),
          body: String(comment.body || '').trim(),
          kind:
            comment.kind === 'revision_request' ||
            comment.kind === 'approval_note' ||
            comment.kind === 'rejection_note'
              ? comment.kind
              : 'comment',
          author: comment.author
            ? {
                id: String(comment.author.id || '').trim(),
                name: String(comment.author.name || '').trim(),
                email: String(comment.author.email || '').trim(),
                role: comment.author.role,
              }
            : {
                id: '',
                name: '',
                email: '',
                role: 'admin',
              },
          createdAt: parseOptionalDate(comment.createdAt) ?? new Date(),
        }))
      : [],
  });
}

export const applyVideoWorkflowAction = applyArticleWorkflowAction;
export { toWorkflowActorRef };
