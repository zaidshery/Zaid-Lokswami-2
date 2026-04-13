import mongoose from 'mongoose';
import {
  FACT_CHECK_STATUSES,
  HEADLINE_STATUSES,
  IMAGE_OPTIMIZATION_STATUSES,
  type CopyEditorMeta,
  type ReporterMeta,
} from '@/lib/content/newsroomMetadata';

const ReporterMetaSchema = new mongoose.Schema<ReporterMeta>(
  {
    locationTag: { type: String, default: '', trim: true, maxlength: 160 },
    sourceInfo: { type: String, default: '', trim: true, maxlength: 2000 },
    sourceConfidential: { type: Boolean, default: false },
    reporterNotes: { type: String, default: '', trim: true, maxlength: 2000 },
  },
  { _id: false }
);

const CopyEditorMetaSchema = new mongoose.Schema<CopyEditorMeta>(
  {
    proofreadComplete: { type: Boolean, default: false },
    factCheckStatus: {
      type: String,
      enum: FACT_CHECK_STATUSES,
      default: 'pending',
    },
    headlineStatus: {
      type: String,
      enum: HEADLINE_STATUSES,
      default: 'pending',
    },
    imageOptimizationStatus: {
      type: String,
      enum: IMAGE_OPTIMIZATION_STATUSES,
      default: 'pending',
    },
    copyEditorNotes: { type: String, default: '', trim: true, maxlength: 2000 },
    returnForChangesReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
  },
  { _id: false }
);

export { CopyEditorMetaSchema, ReporterMetaSchema };
