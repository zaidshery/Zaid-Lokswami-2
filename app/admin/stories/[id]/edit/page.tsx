'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Image as ImageIcon,
  Loader2,
  Save,
} from 'lucide-react';
import { getAuthHeader } from '@/lib/auth/clientToken';
import { NEWS_CATEGORIES } from '@/lib/constants/newsCategories';

interface StoryFormData {
  title: string;
  caption: string;
  thumbnail: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  linkUrl: string;
  linkLabel: string;
  category: string;
  author: string;
  durationSeconds: string;
  priority: string;
  views: string;
  isPublished: boolean;
}

const categories = ['General', ...NEWS_CATEGORIES.map((category) => category.nameEn)];
const THUMBNAIL_MAX_SIZE = 5 * 1024 * 1024;

const initialFormData: StoryFormData = {
  title: '',
  caption: '',
  thumbnail: '',
  mediaType: 'image',
  mediaUrl: '',
  linkUrl: '',
  linkLabel: '',
  category: 'General',
  author: 'Desk',
  durationSeconds: '6',
  priority: '0',
  views: '0',
  isPublished: true,
};

export default function EditStoryPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.id as string;

  const [formData, setFormData] = useState<StoryFormData>(initialFormData);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const previewThumbnail = useMemo(
    () => thumbnailPreview || formData.thumbnail.trim(),
    [formData.thumbnail, thumbnailPreview]
  );

  useEffect(() => {
    const loadStory = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/admin/stories/${storyId}`, {
          headers: {
            ...getAuthHeader(),
          },
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load story');
        }

        const story = data.data as Record<string, unknown>;
        setFormData({
          title: String(story.title || ''),
          caption: String(story.caption || ''),
          thumbnail: String(story.thumbnail || ''),
          mediaType: story.mediaType === 'video' ? 'video' : 'image',
          mediaUrl: String(story.mediaUrl || ''),
          linkUrl: String(story.linkUrl || ''),
          linkLabel: String(story.linkLabel || ''),
          category: String(story.category || 'General'),
          author: String(story.author || 'Desk'),
          durationSeconds: String(story.durationSeconds ?? 6),
          priority: String(story.priority ?? 0),
          views: String(story.views ?? 0),
          isPublished: story.isPublished === false ? false : true,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally {
        setIsLoading(false);
      }
    };

    if (storyId) {
      loadStory();
    }
  }, [storyId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Thumbnail must be an image file');
      return;
    }

    if (file.size > THUMBNAIL_MAX_SIZE) {
      setError('Thumbnail image size must be less than 5MB');
      return;
    }

    setError('');
    setThumbnailFile(file);

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
      const body = new FormData();
      body.append('file', thumbnailFile);
      body.append('purpose', 'story-thumbnail');

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
        body,
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
      if (!formData.title.trim()) {
        setError('Story title is required');
        setIsSaving(false);
        return;
      }

      const thumbnail = await uploadThumbnail();
      if (!thumbnail) {
        setError('Please provide a story thumbnail');
        setIsSaving(false);
        return;
      }

      const durationSeconds = Number.parseInt(formData.durationSeconds, 10);
      const priority = Number.parseInt(formData.priority, 10);
      const views = Number.parseInt(formData.views, 10);

      if (!Number.isFinite(durationSeconds) || durationSeconds < 2 || durationSeconds > 180) {
        setError('Duration must be between 2 and 180 seconds');
        setIsSaving(false);
        return;
      }

      if (!Number.isFinite(priority)) {
        setError('Priority must be a valid number');
        setIsSaving(false);
        return;
      }

      if (!Number.isFinite(views) || views < 0) {
        setError('Views must be a valid non-negative number');
        setIsSaving(false);
        return;
      }

      if (formData.mediaType === 'video' && !formData.mediaUrl.trim()) {
        setError('Video media URL is required for video stories');
        setIsSaving(false);
        return;
      }

      const response = await fetch(`/api/admin/stories/${storyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          caption: formData.caption.trim(),
          thumbnail: thumbnail.trim(),
          mediaType: formData.mediaType,
          mediaUrl: formData.mediaUrl.trim(),
          linkUrl: formData.linkUrl.trim(),
          linkLabel: formData.linkLabel.trim(),
          category: formData.category,
          author: formData.author.trim() || 'Desk',
          durationSeconds,
          priority,
          views,
          isPublished: formData.isPublished,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update story');
      }

      setSuccess('Story updated successfully! Redirecting...');
      setTimeout(() => {
        router.push('/admin/stories');
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update story');
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
        href="/admin/stories"
        className="mb-6 inline-flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Stories
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl"
      >
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Edit Story</h1>
          <p className="mb-6 text-gray-600">Refine story visuals, link behavior, and status</p>

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
                Story Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-primary-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">Caption</label>
              <textarea
                name="caption"
                value={formData.caption}
                onChange={handleInputChange}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-primary-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Story Type
                </label>
                <select
                  name="mediaType"
                  value={formData.mediaType}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-primary-600 focus:outline-none"
                >
                  <option value="image">Image Story</option>
                  <option value="video">Video Story</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-primary-600 focus:outline-none"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">Thumbnail URL</label>
              <input
                type="url"
                name="thumbnail"
                value={formData.thumbnail}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-primary-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                Replace Thumbnail (image)
              </label>
              <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-5 transition-colors hover:border-primary-600 hover:bg-gray-50">
                <span className="flex flex-col items-center gap-1 text-center">
                  <ImageIcon className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Click to upload</span>
                  <span className="text-xs text-gray-500">PNG/JPG/WebP up to 5MB</span>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {previewThumbnail ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                {/* Admin preview supports blob/object URLs from file input. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewThumbnail}
                  alt="Story thumbnail preview"
                  className="h-64 w-full object-cover"
                />
              </div>
            ) : null}

            {formData.mediaType === 'video' ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Video URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  name="mediaUrl"
                  value={formData.mediaUrl}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-primary-600 focus:outline-none"
                  required
                />
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Link URL
                </label>
                <input
                  type="text"
                  name="linkUrl"
                  value={formData.linkUrl}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-primary-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Link Label
                </label>
                <input
                  type="text"
                  name="linkLabel"
                  value={formData.linkLabel}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-primary-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-900">Author</label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-primary-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Duration (sec)
                </label>
                <input
                  type="number"
                  name="durationSeconds"
                  value={formData.durationSeconds}
                  onChange={handleInputChange}
                  min="2"
                  max="180"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-primary-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">Priority</label>
                <input
                  type="number"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-primary-600 focus:outline-none"
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
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 transition-colors focus:border-primary-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
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
                    {isUploadingThumbnail ? 'Uploading...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Changes
                  </>
                )}
              </button>

              <Link
                href="/admin/stories"
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
