import mongoose from 'mongoose';

export interface ICareerApplication extends mongoose.Document {
  name: string;
  email: string;
  phone?: string;
  role: string;
  experience?: string;
  portfolioUrl?: string;
  message: string;
  source: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CareerApplicationSchema = new mongoose.Schema<ICareerApplication>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
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
    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    experience: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    portfolioUrl: {
      type: String,
      trim: true,
      maxlength: 500,
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
      default: 'main-careers',
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

CareerApplicationSchema.index({ createdAt: -1 });

export default mongoose.models.CareerApplication ||
  mongoose.model<ICareerApplication>('CareerApplication', CareerApplicationSchema);
