import mongoose from 'mongoose';

// lightweight slugify to avoid extra dependency
function makeSlug(s: string) {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export interface ICategory {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  createdAt?: Date;
}

const CategorySchema = new mongoose.Schema<ICategory>({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, default: '' },
  icon: { type: String },
  createdAt: { type: Date, default: Date.now },
});

CategorySchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = makeSlug(String(this.name));
  }
  next();
});

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
export default Category;
