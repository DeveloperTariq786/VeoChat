'use client';

import React from 'react';

export function SkeletonCard({ id }: { id?: string }) {
  return (
    <div
      id={id}
      className="flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-sm"
    >
      {/* Thumbnail Aspect Ratio 16:9 Skeleton */}
      <div className="relative aspect-video w-full bg-zinc-200 dark:bg-zinc-800 animate-pulse">
        <div className="absolute bottom-2.5 right-2.5 h-4 w-12 rounded bg-zinc-300 dark:bg-zinc-700 animate-pulse" />
      </div>

      {/* Content Skeleton */}
      <div className="p-4 flex flex-col gap-3 flex-1 justify-between">
        <div className="space-y-2">
          {/* Title line 1 */}
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-11/12 animate-pulse" />
          {/* Title line 2 */}
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-3/4 animate-pulse" />
        </div>

        {/* Channel & Meta */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-24 animate-pulse" />
          </div>
          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-14 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
