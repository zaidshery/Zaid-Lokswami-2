"use client";

import { useEffect, useState } from 'react';
import { getAuthHeader } from '@/lib/auth/clientToken';

interface CategoryItem {
  _id: string;
  name: string;
  description?: string;
  slug?: string;
}

export default function CategoriesPage() {
  const [cats, setCats] = useState<CategoryItem[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      if (res.ok) setCats(data.data || []);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCats(); }, []);

  const create = async () => {
    setError('');
    if (!name) return setError('Name required');
    try {
      const res = await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify({ name, description: desc }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      setName(''); setDesc(''); fetchCats();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const del = async (id: string) => {
    if (!confirm('Delete category?')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE', headers: { ...getAuthHeader() } });
      if (res.ok) fetchCats(); else setError('Failed to delete');
    } catch { setError('Failed to delete'); }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">Categories</h2>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Category name" className="px-3 py-2 border rounded" />
        <input value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Description (optional)" className="px-3 py-2 border rounded" />
        <div className="col-span-2">
          <button
            onClick={create}
            disabled={loading}
            className="px-4 py-2 bg-spanish-red text-white rounded disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Create'}
          </button>
        </div>
      </div>
      {error && <div className="mb-3 text-red-600">{error}</div>}
      <div className="space-y-2">
        {cats.map(c => (
          <div key={c._id} className="flex items-center justify-between border p-3 rounded">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-gray-500">{c.description}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-400">{c.slug}</div>
              <button onClick={() => del(c._id)} className="text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
