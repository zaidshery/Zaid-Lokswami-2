import mongoose, { type Model } from 'mongoose';

export interface IMarketingLead extends mongoose.Document {
  email: string;
  name: string;
  interests: string[];
  source: string;
  campaign: string;
  wantsDailyAlerts: boolean;
  consent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MarketingLeadSchema = new mongoose.Schema<IMarketingLead>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      maxlength: 180,
    },
    name: { type: String, trim: true, maxlength: 120, default: '' },
    interests: { type: [String], default: [] },
    source: { type: String, trim: true, maxlength: 80, default: 'engagement-popup' },
    campaign: { type: String, trim: true, maxlength: 80, default: 'daily-alerts' },
    wantsDailyAlerts: { type: Boolean, default: true },
    consent: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

MarketingLeadSchema.index({ email: 1, source: 1 });
MarketingLeadSchema.index({ createdAt: -1 });

const MarketingLead: Model<IMarketingLead> =
  (mongoose.models.MarketingLead as Model<IMarketingLead>) ||
  mongoose.model<IMarketingLead>('MarketingLead', MarketingLeadSchema);

export default MarketingLead;
