'use client';

import React from 'react';
import { VideoItem } from '@/types/video';
import { VideoCard } from './VideoCard';
import { SkeletonCard } from './SkeletonCard';
import { Film, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

interface VideoGridProps {
  videos: VideoItem[];
  isLoading: boolean;
  error?: string | null;
  query?: string;
  source?: 'serpapi' | 'demo';
  message?: string;
  onRetry?: () => void;
  id?: string;
}

export function VideoGrid({
  videos,
  isLoading,
  error,
  query,
  source,
  message,
  onRetry,
  id = 'video-grid-section',
}: VideoGridProps) {
  // Error state
  if (error && !isLoading) {
    return (
      <div
        id="video-grid-error"
        className="w-full max-w-2xl mx-auto my-12 p-6 rounded-2xl bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Unable to fetch video results
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 max-w-md mx-auto">
          {error}
        </p>
        {onRetry && (
          <button
            id="retry-search-btn"
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
      </div>
    );
  }

  // Loading skeleton grid
  if (isLoading) {
    return (
      <div id={id} className="w-full space-y-4">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-36 animate-pulse" />
          <span className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 animate-pulse" />
        </div>

        {/* 1 col mobile, 2 col tablet, 4 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5 lg:gap-5 xl:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} id={`skeleton-card-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state when search performed but 0 results
  if (!isLoading && query && videos.length === 0) {
    return (
      <div
        id="video-grid-empty"
        className="w-full max-w-md mx-auto my-16 p-8 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center mb-3">
          <Film className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          No YouTube videos found
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No results found for &ldquo;{query}&rdquo;. Try another natural language query or broader topic.
        </p>
      </div>
    );
  }

  // No search initiated yet state
  if (!isLoading && videos.length === 0) {
    return null;
  }

  return (
    <div id={id} className="w-full space-y-4">
      {/* Header with result count */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-0.5">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Found {videos.length} videos {query ? `for "${query}"` : ''}
        </span>
      </div>

      {/* Video Grid (1 col mobile, 2 col tablet, 4 col desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5 lg:gap-5 xl:gap-6">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
