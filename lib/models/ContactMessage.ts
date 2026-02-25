import mongoose from 'mongoose';

export type ContactWorkflowStatus = 'new' | 'in_progress' | 'resolved';

export interface IContactMessageNote {
  body: string;
  author: string;
  createdAt: Date;
}

export interface IContactMessage extends mongoose.Document {
  ticketId: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  source: string;
  ipAddress?: string;
  userAgent?: string;
  status: ContactWorkflowStatus;
  assignee?: string;
  notes: IContactMessageNote[];
  createdAt: Date;
  updatedAt: Date;
}

const ContactMessageNoteSchema = new mongoose.Schema<IContactMessageNote>(
  {
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    author: { type: String, required: true, trim: true, maxlength: 120, default: 'Admin' },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const ContactMessageSchema = new mongoose.Schema<IContactMessage>(
  {
    ticketId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      maxlength: 40,
    },
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
    subject: {
      type: String,
      trim: true,
      maxlength: 200,
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
      default: 'main-contact',
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
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved'],
      default: 'new',
      index: true,
    },
    assignee: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    notes: {
      type: [ContactMessageNoteSchema],
      default: [],
    },
  },
  { timestamps: true }
);

ContactMessageSchema.index({ createdAt: -1 });
ContactMessageSchema.index({ status: 1, createdAt: -1 });
ContactMessageSchema.index({ ticketId: 1, createdAt: -1 });

export default mongoose.models.ContactMessage ||
  mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema);
