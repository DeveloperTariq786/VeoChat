'use client';

import { VideoItem } from '@/types/video';

const WATCHED_KEY = 'veochat_watched_videos';
const RECENT_QUERIES_KEY = 'veochat_recent_queries';
const MAX_ITEMS = 20;

export interface WatchedVideoRecord {
  id: string;
  title: string;
  thumbnail: string;
  channel?: string;
  duration?: string;
  views?: string;
  watchedAt: number;
}

export function getWatchedVideos(): WatchedVideoRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WATCHED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordWatchedVideo(video: VideoItem): void {
  if (typeof window === 'undefined' || !video?.id) return;
  try {
    const existing = getWatchedVideos();
    const filtered = existing.filter((v) => v.id !== video.id);
    const newRecord: WatchedVideoRecord = {
      id: video.id,
      title: video.title || 'YouTube Video',
      thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
      channel: video.channel,
      duration: video.duration,
      views: video.views,
      watchedAt: Date.now(),
    };
    const updated = [newRecord, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(WATCHED_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('veochat_history_updated'));
  } catch (err) {
    console.warn('Could not record watched video', err);
  }
}

export function getRecentQueries(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_QUERIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRecentQuery(query: string): void {
  const trimmed = query.trim();
  if (typeof window === 'undefined' || !trimmed) return;
  try {
    const existing = getRecentQueries();
    const filtered = existing.filter(
      (q) => q.toLowerCase() !== trimmed.toLowerCase()
    );
    const updated = [trimmed, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('veochat_history_updated'));
  } catch (err) {
    console.warn('Could not record recent query', err);
  }
}
