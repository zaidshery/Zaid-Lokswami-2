'use client';

export function SkeletonCard() {
  return (
    <div className="bg-lokswami-surface border border-lokswami-border rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-lokswami-border" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-lokswami-border rounded w-3/4" />
        <div className="h-3 bg-lokswami-border rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-3 bg-lokswami-border rounded w-16" />
          <div className="h-3 bg-lokswami-border rounded w-16" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden animate-pulse bg-lokswami-border">
      <div className="absolute inset-0 bg-gradient-to-t from-lokswami-black via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
        <div className="h-4 bg-lokswami-border rounded w-24" />
        <div className="h-8 bg-lokswami-border rounded w-3/4" />
        <div className="h-4 bg-lokswami-border rounded w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonStories() {
  return (
    <div className="flex gap-4 overflow-hidden py-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-lokswami-border animate-pulse" />
          <div className="h-3 w-12 bg-lokswami-border rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
