import mongoose, { type Model } from 'mongoose';

export interface ILeadershipReportRun extends mongoose.Document {
  scheduleId: string;
  label: string;
  cadenceLabel: string;
  deliveryMode: 'dashboard_link' | 'markdown_export' | 'email_summary' | 'webhook_summary';
  webhookProvider?: 'generic_json' | 'slack' | 'discord' | 'teams' | 'telegram' | null;
  recipientEmails: string[];
  trigger: 'manual' | 'cron';
  actorEmail?: string | null;
  status: 'idle' | 'success' | 'failed';
  summary: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadershipReportRunSchema = new mongoose.Schema<ILeadershipReportRun>(
  {
    scheduleId: { type: String, required: true, trim: true, maxlength: 80, index: true },
    label: { type: String, required: true, trim: true, maxlength: 160 },
    cadenceLabel: { type: String, required: true, trim: true, maxlength: 80 },
    deliveryMode: {
      type: String,
      enum: ['dashboard_link', 'markdown_export', 'email_summary', 'webhook_summary'],
      default: 'dashboard_link',
    },
    webhookProvider: {
      type: String,
      enum: ['generic_json', 'slack', 'discord', 'teams', 'telegram', ''],
      default: '',
    },
    recipientEmails: {
      type: [String],
      default: [],
      set: (value: string[]) => (Array.isArray(value) ? value.slice(0, 20) : []),
    },
    trigger: {
      type: String,
      enum: ['manual', 'cron'],
      default: 'manual',
    },
    actorEmail: { type: String, trim: true, lowercase: true, maxlength: 320, default: '' },
    status: {
      type: String,
      enum: ['idle', 'success', 'failed'],
      default: 'idle',
    },
    summary: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true }
);

LeadershipReportRunSchema.index({ scheduleId: 1, createdAt: -1 });
LeadershipReportRunSchema.index({ createdAt: -1 });

const LeadershipReportRun: Model<ILeadershipReportRun> =
  (mongoose.models.LeadershipReportRun as Model<ILeadershipReportRun>) ||
  mongoose.model<ILeadershipReportRun>('LeadershipReportRun', LeadershipReportRunSchema);

export default LeadershipReportRun;
