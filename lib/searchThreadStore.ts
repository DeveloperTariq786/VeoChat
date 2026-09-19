'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { VideoItem } from '@/types/video';

export interface SearchTurn {
  id: string;
  query: string;
  timestamp: number;
  videos: VideoItem[];
  isLoading: boolean;
  error?: string | null;
  source?: 'serpapi' | 'demo';
  message?: string;
}

const EMPTY_TURNS: SearchTurn[] = [];
let cachedTurns: SearchTurn[] | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function readStoredTurns(): SearchTurn[] {
  if (cachedTurns !== null) {
    return cachedTurns;
  }
  if (typeof window === 'undefined') {
    return EMPTY_TURNS;
  }
  try {
    const raw = sessionStorage.getItem('veochat_search_thread');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        cachedTurns = parsed;
        return cachedTurns;
      }
    }
  } catch (e) {
    console.warn('Could not read search thread from sessionStorage', e);
  }
  cachedTurns = EMPTY_TURNS;
  return cachedTurns;
}

export const searchThreadStore = {
  getSnapshot(): SearchTurn[] {
    return readStoredTurns();
  },
  getServerSnapshot(): SearchTurn[] {
    return EMPTY_TURNS;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  setTurns(update: SearchTurn[] | ((prev: SearchTurn[]) => SearchTurn[])) {
    const current = readStoredTurns();
    const next = typeof update === 'function' ? update(current) : update;
    cachedTurns = next;
    if (typeof window !== 'undefined') {
      try {
        if (next.length === 0) {
          sessionStorage.removeItem('veochat_search_thread');
        } else {
          sessionStorage.setItem('veochat_search_thread', JSON.stringify(next));
        }
      } catch (e) {
        console.warn('Could not persist search thread', e);
      }
    }
    notify();
  },
  clear() {
    searchThreadStore.setTurns([]);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('askthevideo_search_state');
        sessionStorage.removeItem('veochat_search_thread');
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('askthevideo_video_') || key.startsWith('veochat_')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Could not fully purge storage on clear', e);
      }
    }
  },
};

export function useSearchThread(): [
  SearchTurn[],
  (update: SearchTurn[] | ((prev: SearchTurn[]) => SearchTurn[])) => void,
  () => void,
] {
  const turns = useSyncExternalStore(
    searchThreadStore.subscribe,
    searchThreadStore.getSnapshot,
    searchThreadStore.getServerSnapshot
  );

  const setTurns = useCallback(
    (update: SearchTurn[] | ((prev: SearchTurn[]) => SearchTurn[])) => {
      searchThreadStore.setTurns(update);
    },
    []
  );

  const clearTurns = useCallback(() => {
    searchThreadStore.clear();
  }, []);

  return [turns, setTurns, clearTurns];
}
