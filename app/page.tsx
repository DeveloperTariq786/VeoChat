'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { LandingPage } from '@/components/LandingPage';
import { UserProfileMenu } from '@/components/UserProfileMenu';
import { BottomChatSearchBar } from '@/components/BottomChatSearchBar';
import { VideoGrid } from '@/components/VideoGrid';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/Logo';
import { VideoItem } from '@/types/video';
import { isWithinAllowedDuration } from '@/lib/videoDuration';
import { useIsMounted } from '@/lib/useIsMounted';
import { useSearchThread, SearchTurn } from '@/lib/searchThreadStore';
import {
  Sparkles,
  User,
  Search,
  Bot,
  RotateCcw,
  Youtube,
  ArrowRight,
  Info,
} from 'lucide-react';

const POPULAR_SUGGESTIONS = [
  'Transformer architecture explained',
  'Next.js 15 complete course',
  'How to make cold brew coffee',
  'System design interview guide',
  'Deep learning with PyTorch',
  'Learn Rust in 1 hour',
];

export default function HomePage() {
  const { user, profile, loading: authLoading, saveSearchHistory } = useAuth();
  const isMounted = useIsMounted();
  const [turns, setTurns, clearTurns] = useSearchThread();
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to bottom when new search turn is added
  useEffect(() => {
    if (turns.length > 0) {
      bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns.length, isSearching]);

  const executeSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      const turnId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newTurn: SearchTurn = {
        id: turnId,
        query: trimmed,
        timestamp: Date.now(),
        videos: [],
        isLoading: true,
      };

      setTurns((prev) => [...prev, newTurn]);
      setIsSearching(true);

      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to search YouTube videos');
        }

        const rawVideos: VideoItem[] = data.videos || [];
        const receivedVideos = rawVideos.filter((v) =>
          isWithinAllowedDuration(v.duration)
        );
        const receivedSource = data.source || 'demo';
        const receivedMessage = data.message;

        setTurns((prev) =>
          prev.map((t) =>
            t.id === turnId
              ? {
                  ...t,
                  isLoading: false,
                  videos: receivedVideos,
                  source: receivedSource,
                  message: receivedMessage,
                  error: null,
                }
              : t
          )
        );

        if (receivedVideos.length > 0) {
          saveSearchHistory(trimmed, receivedVideos, receivedSource);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'An error occurred during video search';
        setTurns((prev) =>
          prev.map((t) =>
            t.id === turnId
              ? {
                  ...t,
                  isLoading: false,
                  error: msg,
                  videos: [],
                }
              : t
          )
        );
      } finally {
        setIsSearching(false);
      }
    },
    [saveSearchHistory, setTurns]
  );

  const handleClearThread = () => {
    clearTurns();
  };

  // If on landing page view, render LandingPage component
  if (!isMounted || authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Logo size={42} className="animate-pulse" priority />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Loading VeoChat...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  const userAvatar = profile?.photoURL || user?.photoURL;
  const userDisplayName =
    profile?.displayName || user?.displayName || 'You';

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-red-500 selection:text-white">
      {/* Top Header */}
      <header
        id="chat-search-header"
        className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md"
      >
        <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Logo size={34} className="sm:w-9 sm:h-9" priority />
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-base sm:text-lg leading-tight text-zinc-900 dark:text-white">
                VeoChat
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium hidden xs:block">
                Interactive Video Search
              </span>
            </div>
          </div>

          {/* Header Right: Stored Searches, User Profile, Reset, Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {turns.length > 0 && (
              <button
                type="button"
                id="header-new-search-btn"
                onClick={handleClearThread}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Start a new search thread"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            <UserProfileMenu id="header-profile-menu" />
            <ThemeToggle id="header-theme-toggle" />
          </div>
        </div>
      </header>

      {/* Main Conversational Video Search Timeline (No hero text or description) */}
      <main
        ref={scrollContainerRef}
        className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 flex flex-col pb-24 sm:pb-28"
      >
        {/* Empty state: Clean conversational prompt if no turns yet */}
        {turns.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center px-4 max-w-xl mx-auto space-y-4 my-auto">
            <div className="w-10 h-10 rounded-2xl bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white">
                Conversational Video Search
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                Type any topic below to search YouTube videos in chat stream form.
              </p>
            </div>

            {/* Suggestions centered below the description */}
            <div className="pt-2 w-full flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                <Sparkles className="w-3 h-3 text-red-500" />
                <span>Try searching for:</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-lg">
                {POPULAR_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => executeSearch(item)}
                    disabled={isSearching}
                    className="px-3 py-1 rounded-full bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs font-medium transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conversational Stream of Turns (User Query -> Video Grid Response) */}
        <div className="w-full space-y-8 sm:space-y-12">
          {turns.map((turn, index) => (
            <div
              key={turn.id}
              id={`search-turn-${turn.id}`}
              className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-200"
            >
              {/* User Query Message Bubble */}
              <div className="flex items-start justify-end gap-2.5 sm:gap-3 max-w-3xl ml-auto">
                <div className="flex flex-col items-end">
                  <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-red-600 text-white font-medium text-xs sm:text-sm shadow-sm">
                    {turn.query}
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 px-1">
                    {new Date(turn.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt={userDisplayName}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-red-500/20 shrink-0 mt-0.5"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Assistant Video Response Container */}
              <div className="w-full bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 sm:p-6 shadow-2xs space-y-4">
                {/* Result header bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <Youtube className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Results for &ldquo;{turn.query}&rdquo;
                    </span>
                  </div>

                  {!turn.isLoading && turn.videos.length > 0 && (
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full">
                      {turn.videos.length} videos found
                    </span>
                  )}
                </div>

                {/* Video Grid for this turn */}
                <VideoGrid
                  videos={turn.videos}
                  isLoading={turn.isLoading}
                  error={turn.error || null}
                  query={turn.query}
                  source={turn.source || 'demo'}
                  message={turn.message}
                  onRetry={() => executeSearch(turn.query)}
                />
              </div>
            </div>
          ))}

          {/* Bottom scroll anchor */}
          <div ref={bottomAnchorRef} className="h-4" />
        </div>
      </main>

      {/* Fixed Compact Bottom Search Bar (No intrusive blur) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none pb-3 sm:pb-4 px-3 sm:px-4">
        <div className="pointer-events-auto w-full max-w-2xl mx-auto">
          <BottomChatSearchBar
            onSearch={executeSearch}
            isLoading={isSearching}
            onClearThread={handleClearThread}
            hasThread={turns.length > 0}
          />
        </div>
      </div>
    </div>
  );
}
