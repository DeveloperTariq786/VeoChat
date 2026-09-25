'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Loader2,
  RotateCw,
  Play,
  AlertCircle,
} from 'lucide-react';
import { InfographicsData, InfographicItem, VideoItem } from '@/types/video';

interface InfographicsViewerProps {
  videoId: string;
  video: VideoItem | null;
  onSeekToTime: (seconds: number) => void;
  onInfographicsLoaded?: (count: number) => void;
}

export function InfographicsViewer({
  videoId,
  video,
  onSeekToTime,
  onInfographicsLoaded,
}: InfographicsViewerProps) {
  const [data, setData] = useState<InfographicsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatingIndices, setGeneratingIndices] = useState<Set<number>>(new Set());

  const generatingRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    generatingRef.current = generatingIndices;
  }, [generatingIndices]);

  const items = data?.items || [];

  // Generate an image for a specific visual item
  const generateImageForItem = useCallback(
    async (item: InfographicItem, index: number, force: boolean = false) => {
      if (!item) return;
      if (item.imageUrl && !force) return;
      if (generatingRef.current.has(index)) return;

      setGeneratingIndices((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });

      try {
        const res = await fetch(`/api/video/${videoId}/infographics/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: item.visualPrompt,
            title: item.title,
            caption: item.caption,
            stepNumber: item.stepNumber || index + 1,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to generate visual diagram');
        }

        const resData = await res.json();
        if (resData.imageUrl) {
          setData((prev) => {
            if (!prev) return prev;
            const updatedItems = [...prev.items];
            if (updatedItems[index]) {
              updatedItems[index] = {
                ...updatedItems[index],
                imageUrl: resData.imageUrl,
                status: 'ready',
              };
            }
            return { ...prev, items: updatedItems };
          });
        }
      } catch (err) {
        console.warn(`Visual generation failed for index ${index + 1}:`, err);
      } finally {
        setGeneratingIndices((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
    },
    [videoId]
  );

  // Trigger batch generation of any missing images
  const ensureAllImagesGenerated = useCallback(
    (visualItems: InfographicItem[]) => {
      visualItems.forEach((item, idx) => {
        if (!item.imageUrl) {
          // Stagger generation slightly to avoid bursting
          setTimeout(() => {
            generateImageForItem(item, idx);
          }, idx * 150);
        }
      });
    },
    [generateImageForItem]
  );

  // Load or fetch infographics
  const fetchInfographics = useCallback(
    async (forceRegenerate = false) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/video/${videoId}/infographics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceRegenerate }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to generate visual infographics');
        }

        const resJson = await res.json();
        const infographics: InfographicsData = resJson.infographics;

        if (infographics && Array.isArray(infographics.items) && infographics.items.length > 0) {
          setData(infographics);
          onInfographicsLoaded?.(infographics.items.length);
          ensureAllImagesGenerated(infographics.items);
        } else {
          throw new Error('No visuals were returned for this video.');
        }
      } catch (err) {
        console.error('Infographics fetch error:', err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Unable to generate visuals for this video.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [videoId, onInfographicsLoaded, ensureAllImagesGenerated]
  );

  // Passive initial load if already cached
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        const res = await fetch(`/api/video/${videoId}/infographics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceRegenerate: false }),
        });
        if (res.ok) {
          const resJson = await res.json();
          if (isMounted && resJson?.infographics?.items?.length > 0) {
            setData(resJson.infographics);
            onInfographicsLoaded?.(resJson.infographics.items.length);
            ensureAllImagesGenerated(resJson.infographics.items);
          }
        }
      } catch {
        // silent fail on passive initial
      }
    }
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [videoId, onInfographicsLoaded, ensureAllImagesGenerated]);

  return (
    <div
      id="infographics-viewer-root"
      className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-zinc-900"
    >
      {/* Main Visuals Scroll Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center scrollbar-thin min-h-0">
        <div className="max-w-3xl w-full flex-1 flex flex-col">
          {errorMessage && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Visual Generation Error</p>
                <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => fetchInfographics(true)}
                className="px-2 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Active Visuals Minimal Toolbar (matches Slides tab) */}
          {items.length > 0 && !isLoading && (
            <div className="flex items-center justify-between pb-3 text-xs w-full">
              <span className="font-mono text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {items.length} Visuals
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fetchInfographics(true)}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                  title="Regenerate visual infographics"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>
          )}

          {/* Empty State (matches Slides and Flashcards theme) */}
          {items.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center text-center py-10 px-4 my-auto">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-3 border border-red-200 dark:border-red-900/50 shadow-2xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Visuals
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
                Visual diagrams and infographics explaining key concepts from this video.
              </p>
              <button
                id="generate-visuals-btn"
                type="button"
                onClick={() => fetchInfographics(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Visuals</span>
              </button>
            </div>
          )}

          {/* Loading Spinner */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-14 text-center my-auto">
              <Loader2 className="w-7 h-7 animate-spin text-red-600 dark:text-red-400 mb-2.5" />
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Generating Visuals...
              </p>
            </div>
          )}

          {/* Pure Visual Scrollable Feed (Images only, with user scroll) */}
          {items.length > 0 && !isLoading && (
            <div className="space-y-5 w-full pb-8">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="relative w-full aspect-video rounded-2xl overflow-hidden border border-neutral-200/90 dark:border-neutral-700/90 bg-neutral-950 shadow-sm flex items-center justify-center group select-none"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.title || `Visual ${idx + 1}`}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                      <Loader2 className="w-7 h-7 text-red-600 dark:text-red-400 animate-spin mb-2" />
                      <p className="text-xs font-semibold text-zinc-200">
                        Generating Visual {idx + 1}...
                      </p>
                    </div>
                  )}

                  {/* Clean Minimal Timestamp Button to Seek Video */}
                  {item.timestamp && (
                    <button
                      type="button"
                      onClick={() => onSeekToTime(item.seconds || 0)}
                      className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-black/75 hover:bg-red-600 text-white backdrop-blur-md border border-white/10 transition-colors cursor-pointer z-10"
                      title={`Seek video player to ${item.timestamp}`}
                    >
                      <Play className="w-2.5 h-2.5 fill-current text-red-400 group-hover:text-white" />
                      <span>{item.timestamp}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InfographicsViewer;
