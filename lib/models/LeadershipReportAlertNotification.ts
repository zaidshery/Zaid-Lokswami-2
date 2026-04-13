import mongoose, { type Model } from 'mongoose';

export interface ILeadershipReportAlertNotification extends mongoose.Document {
  status: 'sent' | 'failed';
  alertCount: number;
  alertIds: string[];
  reason: string;
  emailRecipients: string[];
  webhookTargets: number;
  acknowledgedAt?: Date | null;
  acknowledgedByEmail?: string | null;
  resolvedAt?: Date | null;
  resolvedByEmail?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const LeadershipReportAlertNotificationSchema =
  new mongoose.Schema<ILeadershipReportAlertNotification>(
    {
      status: {
        type: String,
        enum: ['sent', 'failed'],
        default: 'sent',
      },
      alertCount: { type: Number, default: 0, min: 0, max: 50 },
      alertIds: {
        type: [String],
        default: [],
        set: (value: string[]) => (Array.isArray(value) ? value.slice(0, 20) : []),
      },
      reason: { type: String, trim: true, maxlength: 2000, default: '' },
      emailRecipients: {
        type: [String],
        default: [],
        set: (value: string[]) => (Array.isArray(value) ? value.slice(0, 20) : []),
      },
      webhookTargets: { type: Number, default: 0, min: 0, max: 100 },
      acknowledgedAt: { type: Date, default: null },
      acknowledgedByEmail: { type: String, trim: true, lowercase: true, maxlength: 320, default: '' },
      resolvedAt: { type: Date, default: null },
      resolvedByEmail: { type: String, trim: true, lowercase: true, maxlength: 320, default: '' },
    },
    { timestamps: true }
  );

LeadershipReportAlertNotificationSchema.index({ createdAt: -1 });

const LeadershipReportAlertNotification: Model<ILeadershipReportAlertNotification> =
  (mongoose.models.LeadershipReportAlertNotification as Model<ILeadershipReportAlertNotification>) ||
  mongoose.model<ILeadershipReportAlertNotification>(
    'LeadershipReportAlertNotification',
    LeadershipReportAlertNotificationSchema
  );

export default LeadershipReportAlertNotification;
