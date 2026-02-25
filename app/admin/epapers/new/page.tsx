'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, UploadCloud } from 'lucide-react';
import { getAuthHeader } from '@/lib/auth/clientToken';
import { EPAPER_CITY_OPTIONS, type EPaperCitySlug } from '@/lib/constants/epaperCities';

type UploadResponse = {
  success: boolean;
  error?: string;
  warning?: string | null;
  data?: { _id: string };
};

export default function NewEPaperPage() {
  const router = useRouter();

  const [citySlug, setCitySlug] = useState<EPaperCitySlug>(EPAPER_CITY_OPTIONS[0].slug);
  const [title, setTitle] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [pageCount, setPageCount] = useState('');

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [pageImages, setPageImages] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const cityName = useMemo(() => {
    const match = EPAPER_CITY_OPTIONS.find((item) => item.slug === citySlug);
    return match?.name || '';
  }, [citySlug]);

  const onPageImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPageImages(files);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setWarning('');

    if (!citySlug || !cityName || !title.trim() || !publishDate || !pdfFile || !thumbnailFile) {
      setError('city, title, publishDate, PDF and thumbnail are required');
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      body.append('citySlug', citySlug);
      body.append('cityName', cityName);
      body.append('title', title.trim());
      body.append('publishDate', publishDate);
      body.append('status', status);
      if (pageCount.trim()) body.append('pageCount', pageCount.trim());
      body.append('pdf', pdfFile);
      body.append('thumbnail', thumbnailFile);
      pageImages.forEach((file) => body.append('pageImages', file));

      const response = await fetch('/api/admin/epapers/upload', {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
        body,
      });

      const payload = (await response.json()) as UploadResponse;
      if (!response.ok || !payload.success || !payload.data?._id) {
        throw new Error(payload.error || 'Failed to upload e-paper');
      }

      if (payload.warning) {
        setWarning(payload.warning);
        window.setTimeout(() => {
          router.push(`/admin/epapers/${payload.data!._id}`);
        }, 900);
        return;
      }

      router.push(`/admin/epapers/${payload.data._id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload e-paper');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Link
        href="/admin/epapers"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to E-Papers
      </Link>

      <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Upload E-Paper</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload PDF + thumbnail and optionally page images for hotspot editing.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {warning ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {warning}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-semibold text-gray-600">City</span>
              <select
                value={citySlug}
                onChange={(event) => setCitySlug(event.target.value as EPaperCitySlug)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
              >
                {EPAPER_CITY_OPTIONS.map((city) => (
                  <option key={city.slug} value={city.slug}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-gray-600">Publish Date</span>
              <input
                type="date"
                value={publishDate}
                onChange={(event) => setPublishDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
                required
              />
            </label>
          </div>

          <label>
            <span className="mb-1 block text-xs font-semibold text-gray-600">Title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Indore Edition - 16 Feb 2026"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
              required
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-semibold text-gray-600">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as 'draft' | 'published')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-gray-600">
                Manual Page Count (only if PDF auto-count fails)
              </span>
              <input
                type="number"
                min={1}
                value={pageCount}
                onChange={(event) => setPageCount(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
                placeholder="Optional"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-semibold text-gray-600">
                PDF (required, max 25MB)
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
                required
              />
              {pdfFile ? (
                <p className="mt-1 text-xs text-gray-600">{pdfFile.name}</p>
              ) : null}
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-gray-600">
                Thumbnail (JPG/PNG/WEBP, max 10MB)
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(event) => setThumbnailFile(event.target.files?.[0] || null)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
                required
              />
              {thumbnailFile ? (
                <p className="mt-1 text-xs text-gray-600">{thumbnailFile.name}</p>
              ) : null}
            </label>
          </div>

          <label>
            <span className="mb-1 block text-xs font-semibold text-gray-600">
              Optional Page Images (ordered upload, one per page)
            </span>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={onPageImagesChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-600"
            />
            <p className="mt-1 text-xs text-gray-600">
              {pageImages.length > 0
                ? `${pageImages.length} page image(s) selected`
                : 'If omitted, hotspots can be added later after page images are uploaded.'}
            </p>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {loading ? 'Uploading...' : 'Upload E-Paper'}
          </button>
        </form>
      </div>
    </div>
  );
}
