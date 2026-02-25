import mongoose from 'mongoose';

export interface IAuthor {
  _id?: string;
  name: string;
  email: string;
  bio: string;
  avatar: string;
}

const AuthorSchema = new mongoose.Schema<IAuthor>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  bio: { type: String, required: true },
  avatar: { type: String, required: true },
});

export default mongoose.models.Author || mongoose.model('Author', AuthorSchema);
