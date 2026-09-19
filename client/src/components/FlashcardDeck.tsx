'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Play,
  RotateCcw,
  Check,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  Shuffle,
} from 'lucide-react';
import { FlashcardItem, VideoItem } from '@/types/video';
import { MarkdownRenderer } from './MarkdownRenderer';

interface FlashcardDeckProps {
  videoId: string;
  video: VideoItem | null;
  onSeekToTime: (seconds: number) => void;
  onFlashcardsLoaded?: (count: number) => void;
}

export function FlashcardDeck({
  videoId,
  video,
  onSeekToTime,
  onFlashcardsLoaded,
}: FlashcardDeckProps) {
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());

  // Navigation handlers declared before effects
  const handleNextCard = useCallback(() => {
    setIsFlipped(false);
    setCards((prev) => {
      if (prev.length === 0) return prev;
      setCurrentIndex((idx) => (idx + 1) % prev.length);
      return prev;
    });
  }, []);

  const handlePrevCard = useCallback(() => {
    setIsFlipped(false);
    setCards((prev) => {
      if (prev.length === 0) return prev;
      setCurrentIndex((idx) => (idx - 1 + prev.length) % prev.length);
      return prev;
    });
  }, []);

  // Passive initial load for cached cards
  useEffect(() => {
    let isMounted = true;
    async function loadCachedFlashcards() {
      try {
        const res = await fetch(`/api/video/${videoId}/flashcards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceRegenerate: false }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.flashcards) && data.flashcards.length > 0) {
            setCards(data.flashcards);
            onFlashcardsLoaded?.(data.flashcards.length);
          }
        }
      } catch (err) {
        console.debug('No cached flashcards', err);
      }
    }
    loadCachedFlashcards();
    return () => {
      isMounted = false;
    };
  }, [videoId, onFlashcardsLoaded]);

  // Keyboard navigation: Left/Right for cards, Space/Enter for flip
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (cards.length === 0) return;
      // Do not trigger if typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCard();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards.length, handleNextCard, handlePrevCard]);

  const handleGenerateFlashcards = async (force: boolean = false) => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsFlipped(false);

    try {
      const res = await fetch(`/api/video/${videoId}/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate: force }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (!Array.isArray(data.flashcards) || data.flashcards.length === 0) {
        throw new Error('No flashcards returned from model');
      }

      setCards(data.flashcards);
      setCurrentIndex(0);
      onFlashcardsLoaded?.(data.flashcards.length);
    } catch (err) {
      console.error('Flashcard error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to generate flashcards from video.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
  };

  const toggleMastered = (cardId: string) => {
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const currentCard = cards[currentIndex];
  const isCurrentMastered = currentCard && masteredIds.has(currentCard.id);

  return (
    <div id="flashcard-deck-root" className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-zinc-900">
      {/* Top Header - Full width matching ChatPanel */}
      <div className="h-11 flex items-center justify-between px-3.5 sm:px-4 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 text-xs shrink-0 w-full">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
            Flashcards
          </span>
          {cards.length > 0 && (
            <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
              ({currentIndex + 1}/{cards.length})
            </span>
          )}
        </div>

        {cards.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShuffle}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Shuffle cards"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle</span>
            </button>

            <button
              type="button"
              onClick={() => handleGenerateFlashcards(true)}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
              title="Regenerate new flashcards"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Flashcard Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center scrollbar-thin min-h-0">
        <div className="max-w-2xl w-full flex-1 flex flex-col justify-between">
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Generation Failed</p>
              <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => handleGenerateFlashcards(true)}
              className="px-2 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {cards.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center text-center py-10 px-4 my-auto">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-3 border border-red-200 dark:border-red-900/50 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Flashcards
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
              Review key concepts and definitions from this video.
            </p>
            <button
              id="generate-flashcards-btn"
              type="button"
              onClick={() => handleGenerateFlashcards(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Flashcards</span>
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-14 text-center my-auto">
            <Loader2 className="w-7 h-7 animate-spin text-red-600 dark:text-red-400 mb-2.5" />
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Generating Flashcards...
            </p>
          </div>
        )}

        {/* Active Card Viewer */}
        {cards.length > 0 && !isLoading && currentCard && (
          <div className="flex flex-col flex-1 justify-between gap-4 py-2">
            {/* Progress Bar */}
            <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-red-600 h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${((currentIndex + 1) / cards.length) * 100}%`,
                }}
              />
            </div>

            {/* Interactive Flip Card Container */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative min-h-[220px] md:min-h-[260px] p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-700/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between select-none group"
            >
              {/* Card Header row */}
              <div className="flex items-center justify-between text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium border border-neutral-200/60 dark:border-neutral-700/60">
                  {currentCard.category || 'Core Concept'}
                </span>

                <div className="flex items-center gap-2">
                  {currentCard.timestamp && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeekToTime(currentCard.seconds || 0);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50 cursor-pointer"
                      title="Seek video to this explanation"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{currentCard.timestamp}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMastered(currentCard.id);
                    }}
                    className={`p-1.5 rounded-full transition-colors ${
                      isCurrentMastered
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                        : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                    }`}
                    title={isCurrentMastered ? 'Mastered!' : 'Mark as mastered'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Center: Question vs Answer */}
              <div className="my-auto py-4 text-center">
                {!isFlipped ? (
                  <div className="space-y-3">
                    <span className="inline-block text-[11px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500">
                      Question
                    </span>
                    <div className="text-base md:text-lg font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                      <MarkdownRenderer content={currentCard.question} onSeekToTime={onSeekToTime} inline />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    <span className="inline-block text-[11px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">
                      Answer
                    </span>
                    <div className="text-sm md:text-base text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                      <MarkdownRenderer content={currentCard.answer} onSeekToTime={onSeekToTime} inline />
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer prompt */}
              <div className="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span>{isFlipped ? 'Click to show question' : 'Click or press Space to reveal answer'}</span>
                <span className="flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  Flip
                </span>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handlePrevCard}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous (←)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="px-4 py-2 rounded-xl bg-neutral-200/80 dark:bg-neutral-700/80 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {isFlipped ? 'Show Question' : 'Reveal Answer (Space)'}
              </button>

              <button
                type="button"
                onClick={handleNextCard}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              >
                <span>Next (→)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default FlashcardDeck;
