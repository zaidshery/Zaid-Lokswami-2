import mongoose, { type Model } from 'mongoose';
import {
  TTS_AUDIT_ACTIONS,
  TTS_AUDIT_RESULTS,
  TTS_SOURCE_TYPES,
  TTS_VARIANTS,
  type TtsAuditAction,
  type TtsAuditResult,
  type TtsSourceType,
  type TtsVariant,
} from '@/lib/types/tts';

export interface ITtsAuditEvent {
  action: TtsAuditAction;
  result: TtsAuditResult;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  assetId?: string;
  sourceType?: TtsSourceType;
  sourceId?: string;
  variant?: TtsVariant;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TtsAuditEventSchema = new mongoose.Schema<ITtsAuditEvent>(
  {
    action: { type: String, enum: TTS_AUDIT_ACTIONS, required: true },
    result: { type: String, enum: TTS_AUDIT_RESULTS, required: true },
    actorId: { type: String, trim: true, maxlength: 120, default: '' },
    actorEmail: { type: String, trim: true, lowercase: true, maxlength: 320, default: '' },
    actorRole: { type: String, trim: true, maxlength: 80, default: '' },
    assetId: { type: String, trim: true, maxlength: 120, default: '' },
    sourceType: { type: String, enum: TTS_SOURCE_TYPES, default: undefined },
    sourceId: { type: String, trim: true, maxlength: 120, default: '' },
    variant: { type: String, enum: TTS_VARIANTS, default: undefined },
    message: { type: String, trim: true, maxlength: 1000, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

TtsAuditEventSchema.index({ createdAt: -1 });
TtsAuditEventSchema.index({ sourceType: 1, sourceId: 1, createdAt: -1 });
TtsAuditEventSchema.index({ assetId: 1, createdAt: -1 });

const TtsAuditEvent: Model<ITtsAuditEvent> =
  (mongoose.models.TtsAuditEvent as Model<ITtsAuditEvent>) ||
  mongoose.model<ITtsAuditEvent>('TtsAuditEvent', TtsAuditEventSchema);

export default TtsAuditEvent;
