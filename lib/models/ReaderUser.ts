import mongoose, { type Model } from 'mongoose';

export interface IReaderUser extends mongoose.Document {
  name: string;
  email: string;
  passwordHash: string;
  authProvider?: 'local' | 'google' | 'oidc';
  oidcSubject?: string;
  wantsDailyAlerts: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

const ReaderUserSchema = new mongoose.Schema<IReaderUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    authProvider: { type: String, enum: ['local', 'google', 'oidc'], default: 'local' },
    oidcSubject: { type: String, trim: true, index: true, default: '' },
    wantsDailyAlerts: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

const ReaderUser: Model<IReaderUser> =
  (mongoose.models.ReaderUser as Model<IReaderUser>) ||
  mongoose.model<IReaderUser>('ReaderUser', ReaderUserSchema);

export default ReaderUser;
