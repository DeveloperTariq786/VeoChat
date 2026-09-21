'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Sparkles, Eye, Clock, Loader2 } from 'lucide-react';
import { VideoItem } from '@/types/video';
import { recordWatchedVideo } from '@/lib/watchedVideosStore';

interface VideoCardProps {
  video: VideoItem;
  id?: string;
}

export function VideoCard({ video, id }: VideoCardProps) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fallback thumbnail if primary image fails to load
  const thumbnailSrc = imgError
    ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
    : video.thumbnail;

  const handleClick = (e: React.MouseEvent) => {
    // If modifier keys pressed (new tab, new window), let default link navigation occur
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);

    // Record to user's watched video history for personalized suggestions
    recordWatchedVideo(video);

    // Cache video item in sessionStorage so the video detail page renders immediately with no intermediate loader screen
    try {
      sessionStorage.setItem(`askthevideo_video_${video.id}`, JSON.stringify(video));
    } catch (err) {
      console.warn('Unable to cache selected video', err);
    }

    router.push(`/video/${video.id}`);
  };

  return (
    <Link
      id={id || `video-card-${video.id}`}
      href={`/video/${video.id}`}
      onClick={handleClick}
      className={`group relative flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border overflow-hidden transition-all duration-200 focus:outline-none ${
        isLoading
          ? 'border-red-500/80 ring-2 ring-red-500/40 shadow-lg pointer-events-none'
          : 'border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 hover:border-zinc-300 dark:hover:border-zinc-700 focus:ring-2 focus:ring-red-500/50 cursor-pointer'
      }`}
    >
      {/* 16:9 Thumbnail Container */}
      <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailSrc}
          alt={video.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover transition-transform duration-300 ease-out ${
            isLoading ? 'scale-105 filter brightness-75' : 'group-hover:scale-105'
          }`}
        />

        {/* Loading Overlay directly on the video card */}
        {isLoading ? (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-white z-20 animate-in fade-in duration-150">
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-white tracking-wide drop-shadow-sm">
              Loading video...
            </span>
          </div>
        ) : (
          <>
            {/* Hover Play Button Overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-200">
                <Play className="w-4.5 h-4.5 fill-white ml-0.5" />
              </div>
            </div>

            {/* Duration badge */}
            {video.duration && (
              <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[11px] font-mono font-medium rounded-md bg-black/80 text-white backdrop-blur-xs flex items-center gap-1 shadow-xs">
                <Clock className="w-2.5 h-2.5 text-zinc-300" />
                {video.duration}
              </span>
            )}

            {/* AI Studio indicator pill */}
            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-medium rounded-md bg-black/75 text-zinc-200 backdrop-blur-xs flex items-center gap-1 border border-white/10 shadow-xs">
              <Sparkles className="w-2.5 h-2.5 text-red-400" />
              <span>AI Studio</span>
            </span>
          </>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div className="space-y-1">
          <h3
            className={`text-xs sm:text-sm font-semibold leading-snug line-clamp-2 transition-colors ${
              isLoading
                ? 'text-red-600 dark:text-red-400'
                : 'text-zinc-900 dark:text-zinc-100 group-hover:text-red-600 dark:group-hover:text-red-400'
            }`}
            title={video.title}
          >
            {video.title}
          </h3>

          {video.description && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
              {video.description}
            </p>
          )}
        </div>

        {/* Channel and Views Footer */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[120px] sm:max-w-[140px]">
            {video.channel}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            <Eye className="w-3 h-3 text-zinc-400" />
            <span>{video.views || 'YouTube'}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
