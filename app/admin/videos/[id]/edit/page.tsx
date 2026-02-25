'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { getAuthHeader } from '@/lib/auth/clientToken';
import { NEWS_CATEGORIES } from '@/lib/constants/newsCategories';

const categories = NEWS_CATEGORIES.map((category) => category.nameEn);
const THUMBNAIL_MAX_SIZE = 10 * 1024 * 1024;
const THUMBNAIL_ACCEPT = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';

interface VideoFormData {
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
  category: string;
  isShort: boolean;
  isPublished: boolean;
  shortsRank: string;
  views: string;
}

const initialFormData: VideoFormData = {
  title: '',
  description: '',
  thumbnail: '',
  videoUrl: '',
  duration: '',
  category: 'National',
  isShort: false,
  isPublished: true,
  shortsRank: '0',
  views: '0',
};

function isPdfUrl(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('data:application/pdf') || normalized.endsWith('.pdf');
}

function isAllowedThumbnailFile(file: File) {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    mime === 'image/jpeg' ||
    mime === 'image/jpg' ||
    mime === 'image/png' ||
    mime === 'application/pdf' ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.pdf')
  );
}

function getYouTubeId(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace('www.', '').toLowerCase();

    if (host === 'youtu.be') return url.pathname.slice(1) || null;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || null;
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || null;
    }
    return null;
  } catch {
    return null;
  }
}

function getYouTubeThumbnail(value: string) {
  const id = getYouTubeId(value);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
}

export default function EditVideoPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [formData, setFormData] = useState<VideoFormData>(initialFormData);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hasPdfThumbnail = useMemo(() => {
    if (thumbnailFile) return thumbnailFile.type === 'application/pdf' || thumbnailFile.name.toLowerCase().endsWith('.pdf');
    return isPdfUrl(formData.thumbnail);
  }, [thumbnailFile, formData.thumbnail]);

  useEffect(() => {
    const loadVideo = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/admin/videos/${videoId}`, {
          headers: {
            ...getAuthHeader(),
          },
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load video');
        }

        const video = data.data as Record<string, unknown>;
        setFormData({
          title: String(video.title || ''),
          description: String(video.description || ''),
          thumbnail: String(video.thumbnail || ''),
          videoUrl: String(video.videoUrl || ''),
          duration: String(video.duration || ''),
          category: String(video.category || 'National'),
          isShort: Boolean(video.isShort),
          isPublished: video.isPublished === false ? false : true,
          shortsRank: String(video.shortsRank ?? 0),
          views: String(video.views ?? 0),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setIsLoading(false);
      }
    };

    if (videoId) {
      loadVideo();
    }
  }, [videoId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedThumbnailFile(file)) {
      setError('Thumbnail file must be JPG, JPEG, PNG, or PDF');
      return;
    }

    if (file.size > THUMBNAIL_MAX_SIZE) {
      setError('Thumbnail size must be less than 10MB');
      return;
    }

    setError('');
    setThumbnailFile(file);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      setThumbnailPreview('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setThumbnailPreview((event.target?.result as string) || '');
    };
    reader.readAsDataURL(file);
  };

  const uploadThumbnail = async () => {
    if (!thumbnailFile) return formData.thumbnail.trim();

    setIsUploadingThumbnail(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', thumbnailFile);
      formDataToSend.append('purpose', 'video-thumbnail');

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
        body: formDataToSend,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload thumbnail');
      }

      return String(data.data?.url || '');
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      if (
        !formData.title.trim() ||
        !formData.description.trim() ||
        !formData.videoUrl.trim() ||
        !formData.duration
      ) {
        setError('Please fill in all required fields');
        setIsSaving(false);
        return;
      }

      const duration = Number.parseInt(formData.duration, 10);
      const shortsRank = Number.parseInt(formData.shortsRank || '0', 10);
      const views = Number.parseInt(formData.views || '0', 10);

      if (!Number.isFinite(duration) || duration < 1) {
        setError('Duration must be a valid number greater than 0');
        setIsSaving(false);
        return;
      }

      if (!Number.isFinite(shortsRank)) {
        setError('Shorts rank must be a valid number');
        setIsSaving(false);
        return;
      }

      if (!Number.isFinite(views) || views < 0) {
        setError('Views must be a valid number');
        setIsSaving(false);
        return;
      }

      const youtubeId = getYouTubeId(formData.videoUrl);
      if (!youtubeId) {
        setError('Please enter a valid YouTube URL');
        setIsSaving(false);
        return;
      }

      let thumbnail = await uploadThumbnail();
      if (!thumbnail.trim()) {
        thumbnail = getYouTubeThumbnail(formData.videoUrl);
      }

      if (!thumbnail.trim()) {
        setError('Please provide a thumbnail (upload or URL)');
        setIsSaving(false);
        return;
      }

      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          thumbnail: thumbnail.trim(),
          videoUrl: formData.videoUrl.trim(),
          duration,
          category: formData.category,
          isShort: formData.isShort,
          isPublished: formData.isPublished,
          shortsRank: formData.isShort ? shortsRank : 0,
          views,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update video');
      }

      setSuccess('Video updated successfully! Redirecting...');
      setTimeout(() => {
        router.push('/admin/videos');
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update video');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex h-[50vh] items-center justify-center rounded-xl border border-gray-200 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-spanish-red" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Link
        href="/admin/videos"
        className="mb-6 inline-flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Videos
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl"
      >
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Edit Video</h1>
          <p className="mb-6 text-gray-600">Use YouTube URL and thumbnail as JPG/JPEG/PNG/PDF</p>

          {error ? (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          ) : null}

          {success ? (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{success}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                Video Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-600 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Thumbnail URL (optional)
                </label>
                <input
                  type="url"
                  name="thumbnail"
                  value={formData.thumbnail}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Video URL (YouTube) <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                Replace Thumbnail File (JPG/JPEG/PNG/PDF)
              </label>
              <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-5 transition-colors hover:border-primary-600 hover:bg-gray-50">
                <span className="flex flex-col items-center gap-1 text-center">
                  <ImageIcon className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Click to upload thumbnail file
                  </span>
                  <span className="text-xs text-gray-500">JPG/JPEG/PNG/PDF up to 10MB</span>
                </span>
                <input
                  type="file"
                  accept={THUMBNAIL_ACCEPT}
                  onChange={handleThumbnailFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {thumbnailFile || formData.thumbnail ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                {hasPdfThumbnail ? (
                  <div className="flex h-44 flex-col items-center justify-center gap-2 bg-gray-50 px-4 text-center">
                    <FileText className="h-8 w-8 text-red-600" />
                    <p className="text-sm font-semibold text-gray-800">PDF thumbnail selected</p>
                    <p className="text-xs text-gray-500">
                      {thumbnailFile ? thumbnailFile.name : 'PDF URL provided'}
                    </p>
                  </div>
                ) : (
                  // Admin preview supports blob/object URLs and dynamic remote URLs.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailPreview || formData.thumbnail}
                    alt="Thumbnail preview"
                    className="h-48 w-full object-cover"
                  />
                )}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Duration (sec) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-600 focus:outline-none"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">Shorts Rank</label>
                <input
                  type="number"
                  name="shortsRank"
                  value={formData.shortsRank}
                  onChange={handleInputChange}
                  disabled={!formData.isShort}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">Views</label>
                <input
                  type="number"
                  name="views"
                  value={formData.views}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-900">Use this video in Shorts mode</span>
                <input
                  type="checkbox"
                  name="isShort"
                  checked={formData.isShort}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-900">Published</span>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSaving || isUploadingThumbnail}
                className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving || isUploadingThumbnail ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {isUploadingThumbnail ? 'Uploading thumbnail...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Changes
                  </>
                )}
              </button>

              <Link
                href="/admin/videos"
                className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
