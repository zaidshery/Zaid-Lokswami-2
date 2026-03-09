import mongoose, { type Model, type Types } from 'mongoose';

export type UserRole = 'reader' | 'admin';
export type PreferredLanguage = 'hi' | 'en';

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  image: string;
  role: UserRole;
  savedArticles: Types.ObjectId[];
  preferredLanguage: PreferredLanguage;
  preferredCategories: string[];
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
    role: { type: String, enum: ['reader', 'admin'], default: 'reader' },
    savedArticles: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
      default: [],
    },
    preferredLanguage: { type: String, enum: ['hi', 'en'], default: 'hi' },
    preferredCategories: {
      type: [{ type: String }],
      default: [],
    },
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
