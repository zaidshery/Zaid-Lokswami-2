import mongoose, { type Model } from 'mongoose';

export interface ILeadershipReportAlertState extends mongoose.Document {
  key: string;
  activeAlertIds: string[];
  lastAlertSignature: string;
  lastNotifiedAt?: Date | null;
  mutedUntil?: Date | null;
  mutedByEmail?: string | null;
  mutedReason?: string | null;
  updatedAt: Date;
  createdAt: Date;
}

const LeadershipReportAlertStateSchema = new mongoose.Schema<ILeadershipReportAlertState>(
  {
    key: { type: String, required: true, trim: true, maxlength: 120, unique: true, index: true },
    activeAlertIds: {
      type: [String],
      default: [],
      set: (value: string[]) => (Array.isArray(value) ? value.slice(0, 20) : []),
    },
    lastAlertSignature: { type: String, trim: true, maxlength: 2000, default: '' },
    lastNotifiedAt: { type: Date, default: null },
    mutedUntil: { type: Date, default: null },
    mutedByEmail: { type: String, trim: true, maxlength: 320, default: '' },
    mutedReason: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

const LeadershipReportAlertState: Model<ILeadershipReportAlertState> =
  (mongoose.models.LeadershipReportAlertState as Model<ILeadershipReportAlertState>) ||
  mongoose.model<ILeadershipReportAlertState>(
    'LeadershipReportAlertState',
    LeadershipReportAlertStateSchema
  );

export default LeadershipReportAlertState;
