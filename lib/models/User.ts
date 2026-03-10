import mongoose, { type Model, type Types } from 'mongoose';
import { USER_ROLES, type UserRole } from '@/lib/auth/roles';

export type PreferredLanguage = 'hi' | 'en';

export interface IUserReadHistoryEntry {
  articleId: Types.ObjectId;
  readAt: Date;
  completionPercent: number;
}

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  image: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  readCount: number;
  readHistory: IUserReadHistoryEntry[];
  savedArticles: Types.ObjectId[];
  preferredLanguage: PreferredLanguage;
  preferredCategories: string[];
  state?: string;
  district?: string;
  pushEnabled: boolean;
  notifPromptShown: boolean;
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReadHistorySchema = new mongoose.Schema<IUserReadHistoryEntry>(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      required: true,
    },
    readAt: { type: Date, default: Date.now },
    completionPercent: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    image: { type: String, default: '' },
    role: { type: String, enum: USER_ROLES, default: 'reader' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    lastActiveAt: { type: Date },
    readCount: { type: Number, default: 0, min: 0 },
    readHistory: {
      type: [ReadHistorySchema],
      default: [],
      set: (value: IUserReadHistoryEntry[]) =>
        Array.isArray(value) ? value.slice(-50) : [],
    },
    savedArticles: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
      default: [],
    },
    preferredLanguage: { type: String, enum: ['hi', 'en'], default: 'hi' },
    preferredCategories: {
      type: [{ type: String }],
      default: [],
    },
    state: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    pushEnabled: { type: Boolean, default: false },
    notifPromptShown: { type: Boolean, default: false },
    notificationsEnabled: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);

export default User;
