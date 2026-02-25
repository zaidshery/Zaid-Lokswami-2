const VIEWED_STORIES_KEY = 'lokswami_viewed_stories_v1';

type ViewedStoriesMap = Record<string, number>;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readViewedStoriesMap(): ViewedStoriesMap {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(VIEWED_STORIES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ViewedStoriesMap) : {};
  } catch {
    return {};
  }
}

function writeViewedStoriesMap(value: ViewedStoriesMap) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(VIEWED_STORIES_KEY, JSON.stringify(value));
  } catch {
    // ignore storage write errors
  }
}

export function getViewedStoryIds() {
  return new Set(Object.keys(readViewedStoriesMap()));
}

export function markStoryAsViewed(storyId: string) {
  if (!storyId) return getViewedStoryIds();

  const existing = readViewedStoriesMap();
  if (!existing[storyId]) {
    existing[storyId] = Date.now();
    writeViewedStoriesMap(existing);
  }
  return new Set(Object.keys(existing));
}

export function markStoriesAsViewed(storyIds: string[]) {
  if (!storyIds.length) return getViewedStoryIds();

  const existing = readViewedStoriesMap();
  let changed = false;

  storyIds.forEach((id) => {
    if (!id) return;
    if (!existing[id]) {
      existing[id] = Date.now();
      changed = true;
    }
  });

  if (changed) {
    writeViewedStoriesMap(existing);
  }
  return new Set(Object.keys(existing));
}
