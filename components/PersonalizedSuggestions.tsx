'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, SavedSearchRecord } from '@/contexts/AuthContext';
import { VideoItem } from '@/types/video';
import {
  getRecentQueries,
  getWatchedVideos,
  recordWatchedVideo,
} from '@/lib/watchedVideosStore';
import {
  Sparkles,
  Play,
  Clock,
  Compass,
  History,
  TrendingUp,
  ArrowRight,
  Flame,
} from 'lucide-react';

export const DEFAULT_SUGGESTIONS = [
  'Transformer architecture explained',
  'Next.js 15 complete course',
  'How to make cold brew coffee',
  'System design interview guide',
  'Deep learning with PyTorch',
  'Learn Rust in 1 hour',
];

interface PersonalizedSuggestionsProps {
  onSelectQuery: (query: string) => void;
  disabled?: boolean;
}

export function PersonalizedSuggestions({
  onSelectQuery,
  disabled = false,
}: PersonalizedSuggestionsProps) {
  const router = useRouter();
  const { user, getSearchHistory, loading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [isPersonalized, setIsPersonalized] = useState<boolean>(false);
  const [suggestedVideos, setSuggestedVideos] = useState<VideoItem[]>([]);
  const [recentTopic, setRecentTopic] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'for-you' | 'popular'>('for-you');
  const [historyVersion, setHistoryVersion] = useState<number>(0);

  // Subscribe to external history changes
  useEffect(() => {
    const handleHistoryUpdate = () => {
      setHistoryVersion((v) => v + 1);
    };

    window.addEventListener('veochat_history_updated', handleHistoryUpdate);
    return () => {
      window.removeEventListener('veochat_history_updated', handleHistoryUpdate);
    };
  }, []);

  // Fetch intelligent suggestions asynchronously
  useEffect(() => {
    let isCancelled = false;

    // While auth state is initializing, wait for it before loading
    if (authLoading) {
      return;
    }

    const executeLoad = async () => {
      await Promise.resolve();
      if (isCancelled) return;
      setIsLoading(true);

      try {
        // Collect local recent queries and watched videos
        const localQueries = getRecentQueries();
        const localWatched = getWatchedVideos();

        // Collect Firestore search records if user is logged in
        let firestoreRecords: SavedSearchRecord[] = [];
        if (user) {
          try {
            firestoreRecords = await getSearchHistory();
          } catch (err) {
            console.warn('Could not load search history for suggestions', err);
          }
        }

        if (isCancelled) return;

        // Aggregate past search queries
        const firestoreQueries = firestoreRecords
          .map((r) => r.query?.trim())
          .filter((q): q is string => Boolean(q));

        const combinedQueries = Array.from(
          new Set([...localQueries, ...firestoreQueries])
        ).filter(Boolean);

        // Aggregate past searched videos and watched videos
        const allVideosMap = new Map<string, VideoItem>();

        for (const w of localWatched) {
          if (w.id && !allVideosMap.has(w.id)) {
            allVideosMap.set(w.id, {
              id: w.id,
              title: w.title,
              thumbnail: w.thumbnail,
              channel: w.channel || '',
              duration: w.duration || '',
              views: w.views || '',
              link: `https://www.youtube.com/watch?v=${w.id}`,
            });
          }
        }

        for (const rec of firestoreRecords) {
          if (Array.isArray(rec.videos)) {
            for (const v of rec.videos) {
              if (v.id && !allVideosMap.has(v.id)) {
                allVideosMap.set(v.id, v);
              }
            }
          }
        }

        const aggregatedVideos = Array.from(allVideosMap.values()).slice(0, 4);

        if (isCancelled) return;

        setSuggestedVideos(aggregatedVideos);

        // If user has no search history and no watched videos, maintain default popular state
        if (combinedQueries.length === 0 && aggregatedVideos.length === 0) {
          setSuggestions(DEFAULT_SUGGESTIONS);
          setIsPersonalized(false);
          setRecentTopic('');
          setIsLoading(false);
          return;
        }

        // Identify most prominent recent topic
        const topQuery = combinedQueries[0] || aggregatedVideos[0]?.title || '';
        setRecentTopic(topQuery);
        setIsPersonalized(true);

        // Check session cache for these queries to avoid redundant API hits
        const cacheKey = `veochat_sugg_${combinedQueries.slice(0, 3).join('|')}`;
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (isCancelled) return;
              setSuggestions(parsed);
              setIsLoading(false);
              return;
            }
          }
        } catch {}

        // Request smart personalized suggestions from /api/suggestions
        const res = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queries: combinedQueries.slice(0, 5),
            watchedVideos: aggregatedVideos.slice(0, 5).map((v) => ({
              title: v.title,
              channel: v.channel,
            })),
          }),
        });

        if (isCancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(data.suggestions));
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Error fetching personalized suggestions:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    executeLoad();

    return () => {
      isCancelled = true;
    };
  }, [user, authLoading, getSearchHistory, historyVersion]);

  // Handle direct navigation to a suggested video
  const handleVideoClick = (video: VideoItem, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();

    recordWatchedVideo(video);
    try {
      sessionStorage.setItem(`askthevideo_video_${video.id}`, JSON.stringify(video));
    } catch {}

    router.push(`/video/${video.id}`);
  };

  const displayedSuggestions =
    activeTab === 'for-you' && isPersonalized
      ? suggestions
      : DEFAULT_SUGGESTIONS;

  // Shimmer skeleton loading state while determining or fetching suggestions & videos
  if (isLoading || authLoading) {
    return (
      <div className="w-full flex flex-col items-center gap-4 text-center animate-in fade-in duration-200">
        {/* Shimmer header label */}
        <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
          <div className="w-3.5 h-3.5 rounded-full bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 dark:via-zinc-600/40 to-transparent" />
          </div>
          <div className="h-3 w-40 sm:w-48 rounded-full bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 dark:via-zinc-600/40 to-transparent" />
          </div>
        </div>

        {/* Shimmer Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
          {[140, 180, 120, 160, 130, 150].map((width, idx) => (
            <div
              key={idx}
              style={{ width: `${width}px` }}
              className="h-7 sm:h-8 rounded-full bg-zinc-200/90 dark:bg-zinc-800/90 relative overflow-hidden border border-zinc-200/60 dark:border-zinc-800/60 shadow-2xs"
            >
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 dark:via-zinc-600/40 to-transparent" />
            </div>
          ))}
        </div>

        {/* Shimmer Video Shelf */}
        <div className="w-full max-w-3xl mt-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 text-left">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 dark:via-zinc-600/40 to-transparent" />
              </div>
              <div className="h-3.5 w-36 sm:w-44 rounded bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 dark:via-zinc-600/40 to-transparent" />
              </div>
            </div>
            <div className="h-3 w-20 rounded bg-zinc-200/70 dark:bg-zinc-800/70 relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 dark:via-zinc-600/40 to-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/70 shadow-2xs"
              >
                {/* 16:9 Thumbnail skeleton */}
                <div className="relative w-24 sm:w-28 aspect-video shrink-0 rounded-lg bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 dark:via-zinc-600/40 to-transparent" />
                </div>

                {/* Info lines */}
                <div className="flex-1 space-y-2 py-0.5">
                  <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-11/12 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 dark:via-zinc-600/40 to-transparent" />
                  </div>
                  <div className="h-3 bg-zinc-200/80 dark:bg-zinc-800/80 rounded w-2/3 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 dark:via-zinc-600/40 to-transparent" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-4 text-center animate-in fade-in duration-300">
      {/* Tab Switcher if user is personalized */}
      {isPersonalized && (
        <div className="inline-flex items-center p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-full border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('for-you')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'for-you'
                ? 'bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 shadow-xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Suggested for you</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('popular')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'popular'
                ? 'bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 shadow-xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>Popular topics</span>
          </button>
        </div>
      )}

      {/* Suggestion pill header */}
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        {activeTab === 'for-you' && isPersonalized ? (
          <>
            <Sparkles className="w-3 h-3 text-red-500 shrink-0" />
            <span>
              {recentTopic
                ? `Suggested based on your recent searches & videos:`
                : 'Suggested based on your previous activity:'}
            </span>
          </>
        ) : (
          <>
            <TrendingUp className="w-3 h-3 text-red-500 shrink-0" />
            <span>Try searching for:</span>
          </>
        )}
      </div>

      {/* Suggestion Pills */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xl">
        {displayedSuggestions.map((item, idx) => (
          <button
            key={`${item}-${idx}`}
            type="button"
            onClick={() => onSelectQuery(item)}
            disabled={disabled}
            className="group inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/90 dark:border-zinc-800 hover:border-red-300 dark:hover:border-red-900/60 text-xs font-medium transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
          >
            <span>{item}</span>
            <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-red-500" />
          </button>
        ))}
      </div>

      {/* Suggested Videos Shelf based on user's previous searches / watched videos */}
      {isPersonalized && activeTab === 'for-you' && suggestedVideos.length > 0 && (
        <div className="w-full max-w-3xl mt-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 text-left">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-red-500" />
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Videos from your recent searches
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Click to watch or chat
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {suggestedVideos.map((video) => (
              <Link
                key={video.id}
                href={`/video/${video.id}`}
                onClick={(e) => handleVideoClick(video, e)}
                className="group flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/70 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs transition-all cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="relative w-24 sm:w-28 aspect-video shrink-0 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    </div>
                  </div>
                  {video.duration && (
                    <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white font-medium">
                      {video.duration}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {video.title}
                  </h4>
                  {video.channel && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                      {video.channel}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
