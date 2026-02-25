import type { VisualStory } from '@/lib/content/visualStories';
import { mapLiveStoriesToVisualStories } from '@/lib/content/visualStories';

type ApiStoryResponse = {
  success?: boolean;
  data?: unknown;
};

export async function fetchLiveStories(limit = 20): Promise<VisualStory[]> {
  try {
    const res = await fetch(
      `/api/admin/stories?limit=${limit}&page=1&sort=priority&published=true`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];

    const payload = (await res.json()) as ApiStoryResponse;
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    return mapLiveStoriesToVisualStories(
      rows as Parameters<typeof mapLiveStoriesToVisualStories>[0],
      limit
    );
  } catch {
    return [];
  }
}
