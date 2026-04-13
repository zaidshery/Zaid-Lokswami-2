import mongoose from 'mongoose';
import { ADMIN_ROLES } from '@/lib/auth/roles';
import {
  EPAPER_PRODUCTION_STATUSES,
  WORKFLOW_COMMENT_KINDS,
  WORKFLOW_PRIORITIES,
  WORKFLOW_STATUSES,
  type WorkflowActorRef,
  type WorkflowComment,
  type WorkflowMeta,
} from '@/lib/workflow/types';

const WorkflowActorRefSchema = new mongoose.Schema<WorkflowActorRef>(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    role: { type: String, enum: ADMIN_ROLES, required: true },
  },
  { _id: false }
);

const WorkflowCommentSchema = new mongoose.Schema<WorkflowComment>(
  {
    id: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    kind: { type: String, enum: WORKFLOW_COMMENT_KINDS, default: 'comment' },
    author: { type: WorkflowActorRefSchema, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WorkflowMetaSchema = new mongoose.Schema<WorkflowMeta>(
  {
    status: { type: String, enum: WORKFLOW_STATUSES, default: 'draft' },
    priority: { type: String, enum: WORKFLOW_PRIORITIES, default: 'normal' },
    createdBy: { type: WorkflowActorRefSchema, default: null },
    assignedTo: { type: WorkflowActorRefSchema, default: null },
    reviewedBy: { type: WorkflowActorRefSchema, default: null },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    scheduledFor: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '', trim: true, maxlength: 1000 },
    comments: { type: [WorkflowCommentSchema], default: [] },
  },
  { _id: false }
);

const EPaperProductionStatusSchema = {
  type: String,
  enum: EPAPER_PRODUCTION_STATUSES,
  default: 'draft_upload',
} as const;

export {
  EPaperProductionStatusSchema,
  WorkflowActorRefSchema,
  WorkflowCommentSchema,
  WorkflowMetaSchema,
};
