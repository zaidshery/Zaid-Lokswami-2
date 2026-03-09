"use client";

import { useEffect, useState } from 'react';
import { Upload, Trash } from 'lucide-react';
import { getAuthHeader } from '@/lib/auth/clientToken';

interface MediaItem {
  _id: string;
  filename: string;
  url: string;
  type: string;
}

export default function MediaLibrary() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/media');
      const data = await res.json();
      if (res.ok) setMedia(data.data || []);
    } catch {
      setError('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedia(); }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null);

  const upload = async () => {
    if (!file) return setError('Select a file');
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/admin/upload', { method: 'POST', headers: { ...getAuthHeader() }, body: fd });
      const upd = await up.json();
      if (!up.ok) throw new Error(upd.error || 'Upload failed');
      const create = await fetch('/api/admin/media', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify({ filename: upd.data.filename, url: upd.data.url, size: upd.data.size, type: upd.data.type }) });
      if (create.ok) {
        setFile(null);
        (document.getElementById('media-file') as HTMLInputElement).value = '';
        fetchMedia();
      } else {
        const cd = await create.json();
        throw new Error(cd.error || 'Create failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
    } finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this media?')) return;
    try {
      const res = await fetch(`/api/admin/media/${id}`, { method: 'DELETE', headers: { ...getAuthHeader() } });
      if (res.ok) fetchMedia();
      else setError('Failed to delete');
    } catch { setError('Failed to delete'); }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Media Library</h2>
      <div className="mb-4 flex gap-2">
        <input id="media-file" type="file" accept="image/*,video/*" onChange={handleFile} />
        <button onClick={upload} disabled={loading} className="px-4 py-2 bg-spanish-red text-white rounded"> <Upload className="inline-block w-4 h-4 mr-2"/> Upload</button>
      </div>
      {error && <div className="mb-3 text-red-600">{error}</div>}
      <div className="grid grid-cols-3 gap-4">
        {media.map((m) => (
          <div key={m._id} className="border rounded overflow-hidden">
            <div className="h-40 bg-gray-100 overflow-hidden flex items-center justify-center">
              {/* support images for now */}
              {m.type.startsWith('image') ? (
                // Media URLs can be arbitrary external/blob sources in admin.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
              ) : (
                <div className="text-sm">{m.filename}</div>
              )}
            </div>
            <div className="p-2 flex items-center justify-between">
              <div className="text-xs truncate">{m.filename}</div>
              <button onClick={() => remove(m._id)} className="text-red-600 hover:text-red-800"><Trash className="w-4 h-4"/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
