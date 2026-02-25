import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Category from '@/lib/models/Category';
import fs from 'fs/promises';
import path from 'path';
import { verifyAdminToken } from '@/lib/auth/adminToken';

type CategoryRecord = {
  _id?: string;
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
};

async function shouldUseFileStore() {
  if (!process.env.MONGODB_URI) return true;

  try {
    await connectDB();
    return false;
  } catch (error) {
    console.error('MongoDB unavailable for categories id route, using file store.', error);
    return true;
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = verifyAdminToken(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // allow file-backed fallback when no DB configured
    if (await shouldUseFileStore()) {
      const parts = req.url.split('/');
      const id = parts[parts.length - 1];
      const dataPath = path.resolve(process.cwd(), 'data', 'categories.json');
      try {
        const raw = await fs.readFile(dataPath, 'utf-8');
        const parsed = JSON.parse(raw || '[]');
        const cats = Array.isArray(parsed) ? (parsed as CategoryRecord[]) : [];
        const idx = cats.findIndex((c) => c._id === id);
        if (idx === -1) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        cats.splice(idx, 1);
        await fs.writeFile(dataPath, JSON.stringify(cats, null, 2), 'utf-8');
        return NextResponse.json({ success: true });
      } catch {
        return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
      }
    }

    const parts = req.url.split('/');
    const id = parts[parts.length - 1];
    const cat = await Category.findByIdAndDelete(id);
    if (!cat) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('cat delete err', err);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
