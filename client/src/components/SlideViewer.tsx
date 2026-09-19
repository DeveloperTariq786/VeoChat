'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Presentation,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Play,
  Copy,
  Check,
  LayoutGrid,
  Maximize2,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { SlideItem, VideoItem } from '@/types/video';
import { MarkdownRenderer } from './MarkdownRenderer';

interface SlideViewerProps {
  videoId: string;
  video: VideoItem | null;
  onSeekToTime: (seconds: number) => void;
  onSlidesLoaded?: (count: number) => void;
}

export function SlideViewer({
  videoId,
  video,
  onSeekToTime,
  onSlidesLoaded,
}: SlideViewerProps) {
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGridView, setIsGridView] = useState(false);
  const [copied, setCopied] = useState(false);

  // Navigation handlers declared before effect
  const handleNextSlide = useCallback(() => {
    setSlides((prev) => {
      if (prev.length === 0) return prev;
      setCurrentSlideIndex((idx) => (idx + 1) % prev.length);
      return prev;
    });
  }, []);

  const handlePrevSlide = useCallback(() => {
    setSlides((prev) => {
      if (prev.length === 0) return prev;
      setCurrentSlideIndex((idx) => (idx - 1 + prev.length) % prev.length);
      return prev;
    });
  }, []);

  // Passive initial load for cached slides
  useEffect(() => {
    let isMounted = true;
    async function loadCachedSlides() {
      try {
        const res = await fetch(`/api/video/${videoId}/slides`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceRegenerate: false }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.slides) && data.slides.length > 0) {
            setSlides(data.slides);
            onSlidesLoaded?.(data.slides.length);
          }
        }
      } catch (err) {
        console.debug('No cached slides', err);
      }
    }
    loadCachedSlides();
    return () => {
      isMounted = false;
    };
  }, [videoId, onSlidesLoaded]);

  // Keyboard navigation for slides
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (slides.length === 0 || isGridView) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevSlide();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, isGridView, handleNextSlide, handlePrevSlide]);

  const handleGenerateSlides = async (force: boolean = false) => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsGridView(false);

    try {
      const res = await fetch(`/api/video/${videoId}/slides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate: force }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      if (!Array.isArray(data.slides) || data.slides.length === 0) {
        throw new Error('No slides returned from model');
      }

      setSlides(data.slides);
      setCurrentSlideIndex(0);
      onSlidesLoaded?.(data.slides.length);
    } catch (err) {
      console.error('Slides generation error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to generate slide outline from video.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyOutline = () => {
    const text = slides
      .map(
        (s) =>
          `Slide ${s.slideNumber}: ${s.title} [${s.timestamp || '00:00'}]\n` +
          s.bullets.map((b) => `• ${b}`).join('\n') +
          (s.keyTakeaway ? `\nTakeaway: ${s.keyTakeaway}` : '')
      )
      .join('\n\n---\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentSlide = slides[currentSlideIndex];

  return (
    <div id="slide-viewer-root" className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-zinc-900">
      {/* Top Header - Full width matching ChatPanel */}
      <div className="h-11 flex items-center justify-between px-3.5 sm:px-4 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 text-xs shrink-0 w-full">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <Presentation className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
            Slides
          </span>
          {slides.length > 0 && (
            <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
              ({currentSlideIndex + 1}/{slides.length})
            </span>
          )}
        </div>

        {slides.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsGridView(!isGridView)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                isGridView
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white font-medium'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
              }`}
              title={isGridView ? 'Deck view' : 'Grid overview'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{isGridView ? 'Slide' : 'Grid'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyOutline}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Copy slide deck outline"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Copied' : 'Outline'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleGenerateSlides(true)}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
              title="Regenerate presentation slides"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Slide Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center scrollbar-thin min-h-0">
        <div className="max-w-3xl w-full flex-1 flex flex-col justify-between">
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Slide Generation Failed</p>
              <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => handleGenerateSlides(true)}
              className="px-2 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {slides.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center text-center py-10 px-4 my-auto">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-3 border border-red-200 dark:border-red-900/50 shadow-2xs">
              <Presentation className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Slides
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
              Overview slides and key takeaways from this video.
            </p>
            <button
              id="generate-slides-btn"
              type="button"
              onClick={() => handleGenerateSlides(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Slides</span>
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-14 text-center my-auto">
            <Loader2 className="w-7 h-7 animate-spin text-red-600 dark:text-red-400 mb-2.5" />
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Generating Slides...
            </p>
          </div>
        )}

        {/* Grid View Mode */}
        {slides.length > 0 && !isLoading && isGridView && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {slides.map((s, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setCurrentSlideIndex(idx);
                  setIsGridView(false);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                  currentSlideIndex === idx
                    ? 'border-red-500 bg-red-50/20 dark:bg-red-950/30'
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 hover:border-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1.5 text-neutral-500">
                  <span className="font-mono font-bold">Slide {s.slideNumber}</span>
                  {s.timestamp && (
                    <span className="font-mono text-red-600 dark:text-red-400">
                      {s.timestamp}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1 mb-1">
                  <MarkdownRenderer content={s.title} onSeekToTime={onSeekToTime} inline />
                </h4>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2">
                  <MarkdownRenderer content={s.bullets[0] || 'No content'} onSeekToTime={onSeekToTime} inline />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Single Slide Deck Presentation View */}
        {slides.length > 0 && !isLoading && !isGridView && currentSlide && (
          <div className="flex flex-col flex-1 justify-between gap-4 py-2">
            {/* Slide Presentation Canvas */}
            <div className="relative min-h-[260px] md:min-h-[300px] p-6 rounded-2xl bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-900/90 border border-neutral-200/90 dark:border-neutral-700/90 shadow-sm flex flex-col justify-between select-none">
              {/* Slide Top Banner */}
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    SLIDE {currentSlide.slideNumber}
                  </span>
                  <span className="text-xs text-neutral-400">/ {slides.length}</span>
                </div>

                {currentSlide.timestamp && (
                  <button
                    type="button"
                    onClick={() => onSeekToTime(currentSlide.seconds || 0)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50 cursor-pointer"
                    title="Seek video to this slide section"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>{currentSlide.timestamp}</span>
                  </button>
                )}
              </div>

              {/* Slide Content */}
              <div className="my-auto py-3 space-y-3">
                <h3 className="text-base md:text-xl font-bold text-neutral-950 dark:text-white leading-tight">
                  <MarkdownRenderer content={currentSlide.title} onSeekToTime={onSeekToTime} inline />
                </h3>

                <ul className="space-y-2 text-xs md:text-sm text-neutral-700 dark:text-neutral-300">
                  {currentSlide.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:text-red-400 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <MarkdownRenderer content={bullet} onSeekToTime={onSeekToTime} inline />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key Takeaway Callout */}
              {currentSlide.keyTakeaway && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="font-medium flex-1">
                    <MarkdownRenderer content={currentSlide.keyTakeaway} onSeekToTime={onSeekToTime} inline />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handlePrevSlide}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Slide</span>
              </button>

              {/* Slide Pips */}
              <div className="flex items-center gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                      currentSlideIndex === idx
                        ? 'bg-red-600 w-5'
                        : 'bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400'
                    }`}
                    title={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleNextSlide}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              >
                <span>Next Slide</span>
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

export default SlideViewer;
