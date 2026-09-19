'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { VideoItem, RecommendationItem, RecommendationsApiResponse } from '@/types/video';
import {
  Compass,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  Clock,
  Eye,
  Play,
  Film,
  AlertCircle,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';

interface RecommendationsPanelProps {
  videoId: string;
  video: VideoItem | null;
  onRecommendationsLoaded?: (count: number) => void;
}

export function RecommendationsPanel({
  videoId,
  video,
  onRecommendationsLoaded,
}: RecommendationsPanelProps) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [topic, setTopic] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDuration, setFilterDuration] = useState<'all' | 'short' | 'long'>('all');
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (isRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/video/${videoId}/recommendations`, {
        method: isRefresh ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch recommendations (${res.status})`);
      }

      const data: RecommendationsApiResponse = await res.json();
      const recs = data.recommendations || [];
      setRecommendations(recs);
      if (data.topic) setTopic(data.topic);
      if (onRecommendationsLoaded) {
        onRecommendationsLoaded(recs.length);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load recommended videos';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [videoId, onRecommendationsLoaded]);

  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        const res = await fetch(`/api/video/${videoId}/recommendations`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch recommendations (${res.status})`);
        }
        const data: RecommendationsApiResponse = await res.json();
        if (isMounted) {
          const recs = data.recommendations || [];
          setRecommendations(recs);
          if (data.topic) setTopic(data.topic);
          if (onRecommendationsLoaded) {
            onRecommendationsLoaded(recs.length);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Unable to load recommended videos';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [videoId, onRecommendationsLoaded]);

  const handleSelectVideo = (item: RecommendationItem) => {
    if (navigatingId) return;
    setNavigatingId(item.id);

    try {
      sessionStorage.setItem(`askthevideo_video_${item.id}`, JSON.stringify(item));
    } catch (e) {
      console.warn('Unable to cache selected recommendation', e);
    }

    router.push(`/video/${item.id}`);
  };

  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((item) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          item.title.toLowerCase().includes(q) ||
          item.channel.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // Duration filter
      if (filterDuration === 'short') {
        const dur = (item.duration || '').trim();
        // Check if under 10 mins (e.g. 4:20 or 08:30)
        const parts = dur.split(':');
        if (parts.length === 2 && parseInt(parts[0], 10) < 10) return true;
        if (parts.length > 2) return false;
      } else if (filterDuration === 'long') {
        const dur = (item.duration || '').trim();
        const parts = dur.split(':');
        if (parts.length === 2 && parseInt(parts[0], 10) >= 10) return true;
        if (parts.length >= 3) return true;
      }

      return true;
    });
  }, [recommendations, searchQuery, filterDuration]);

  return (
    <div id="recommendations-panel" className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-900">
      {/* Top Controls Bar */}
      <div className="p-3 sm:p-4 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col gap-3 bg-zinc-50/50 dark:bg-zinc-950/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                <span>Recommended Videos</span>
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {topic ? `Related to "${topic}"` : 'Similar YouTube content curated for this topic'}
              </p>
            </div>
          </div>

          <button
            id="refresh-recommendations-btn"
            type="button"
            onClick={() => fetchRecommendations(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50 shrink-0 border border-zinc-200/80 dark:border-zinc-700/80"
            title="Refresh Recommendations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="recommendations-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter recommendations..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-0.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={() => setFilterDuration('all')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                filterDuration === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterDuration('short')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                filterDuration === 'short'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              &lt; 10m
            </button>
            <button
              type="button"
              onClick={() => setFilterDuration('long')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                filterDuration === 'long'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              10m+
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 animate-pulse"
              >
                <div className="w-full sm:w-44 aspect-video rounded-xl bg-zinc-200 dark:bg-zinc-700/60 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700/60 rounded w-4/5" />
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700/60 rounded w-2/5" />
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700/60 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => fetchRecommendations(true)}
              className="mt-3 px-4 py-1.5 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-800">
            <Film className="w-8 h-8 text-zinc-400 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No matching recommendations found</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Try adjusting your search query or duration filters.
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterDuration('all');
                }}
                className="mt-3 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredRecommendations.map((item) => {
              const isNavigating = navigatingId === item.id;

              return (
                <div
                  key={item.id}
                  id={`recommendation-item-${item.id}`}
                  className={`group relative flex flex-col sm:flex-row gap-3.5 p-3 rounded-2xl bg-white dark:bg-zinc-900 border transition-all duration-200 ${
                    isNavigating
                      ? 'border-red-500 ring-2 ring-red-500/30 shadow-md pointer-events-none'
                      : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs hover:shadow-md'
                  }`}
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => handleSelectVideo(item)}
                    className="relative w-full sm:w-44 aspect-video rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {item.duration && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/80 text-[10px] font-medium text-white backdrop-blur-xs flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {item.duration}
                      </span>
                    )}

                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        {isNavigating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metadata and Details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          onClick={() => handleSelectVideo(item)}
                          className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-red-600 dark:group-hover:text-red-400 line-clamp-2 cursor-pointer transition-colors leading-snug"
                        >
                          {item.title}
                        </h4>
                      </div>

                      <div className="flex items-center flex-wrap gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[140px]">
                          {item.channel}
                        </span>
                        {item.views && (
                          <>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3 text-zinc-400" />
                              {item.views}
                            </span>
                          </>
                        )}
                        {item.publishedAt && (
                          <>
                            <span>&bull;</span>
                            <span>{item.publishedAt}</span>
                          </>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-1.5 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                      {item.relevanceReason ? (
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-red-500 shrink-0" />
                          <span className="truncate">{item.relevanceReason}</span>
                        </span>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectVideo(item)}
                          disabled={isNavigating}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition-colors cursor-pointer shadow-2xs"
                        >
                          {isNavigating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                          <span>Open Studio</span>
                        </button>

                        <a
                          href={item.link || `https://www.youtube.com/watch?v=${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Watch on YouTube (New Tab)"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
