import mongoose from 'mongoose';

export interface IAdvertiseInquiry extends mongoose.Document {
  name: string;
  company: string;
  email: string;
  phone?: string;
  budget?: string;
  campaignType: string;
  targetLocations?: string;
  message: string;
  source: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdvertiseInquirySchema = new mongoose.Schema<IAdvertiseInquiry>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      maxlength: 180,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: '',
    },
    budget: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    campaignType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    targetLocations: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    source: {
      type: String,
      trim: true,
      default: 'main-advertise',
      maxlength: 40,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true }
);

AdvertiseInquirySchema.index({ createdAt: -1 });

export default mongoose.models.AdvertiseInquiry ||
  mongoose.model<IAdvertiseInquiry>('AdvertiseInquiry', AdvertiseInquirySchema);
