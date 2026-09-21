'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth, SavedSearchRecord } from '@/contexts/AuthContext';
import { searchThreadStore, SearchTurn } from '@/lib/searchThreadStore';
import {
  History,
  Search,
  Trash2,
  Play,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Loader2,
  Film,
} from 'lucide-react';

interface SavedSearchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  id?: string;
}

export function SavedSearchesModal({
  isOpen,
  onClose,
  id = 'saved-searches-modal',
}: SavedSearchesModalProps) {
  const router = useRouter();
  const { user, getSearchHistory, deleteSearchHistoryItem, clearSearchHistory } = useAuth();
  const [searches, setSearches] = useState<SavedSearchRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedSearchId, setExpandedSearchId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    let isMounted = true;

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const records = await getSearchHistory();
        if (isMounted) {
          setSearches(records);
          if (records.length > 0) {
            setExpandedSearchId((prev) => prev ?? records[0].id);
          }
        }
      } catch (err) {
        console.warn('Error loading search history:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user, getSearchHistory]);

  if (!isOpen) return null;

  const handleDeleteItem = async (searchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsDeletingId(searchId);
      await deleteSearchHistoryItem(searchId);
      setSearches((prev) => prev.filter((s) => s.id !== searchId));
      if (expandedSearchId === searchId) {
        setExpandedSearchId(null);
      }
    } catch (err) {
      console.error('Failed to delete search record:', err);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all saved searches from Firebase?')) {
      return;
    }
    try {
      setIsClearing(true);
      await clearSearchHistory();
      setSearches([]);
      setExpandedSearchId(null);
    } catch (err) {
      console.error('Failed to clear search history:', err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleLoadIntoThread = (searchRecord: SavedSearchRecord) => {
    const newTurn: SearchTurn = {
      id: searchRecord.id,
      query: searchRecord.query,
      timestamp: searchRecord.timestamp,
      videos: searchRecord.videos || [],
      isLoading: false,
      source: (searchRecord.source as 'serpapi' | 'demo') || 'serpapi',
    };

    const current = searchThreadStore.getSnapshot();
    const exists = current.some((t) => t.id === newTurn.id || t.query.toLowerCase() === newTurn.query.toLowerCase());
    if (!exists) {
      searchThreadStore.setTurns([...current, newTurn]);
    }

    onClose();
    router.push('/');
  };

  const handleOpenVideo = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    router.push(`/video/${videoId}`);
  };

  const formatTimestamp = (ts: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      id={id}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="h-14 px-4 sm:px-5 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Stored Searches</span>
                {searches.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {searches.length}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Persistent video queries saved in your Firebase account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {searches.length > 0 && (
              <button
                type="button"
                id="clear-all-searches-btn"
                onClick={handleClearAll}
                disabled={isClearing}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer disabled:opacity-50"
                title="Clear all stored searches"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}

            <button
              type="button"
              id="close-saved-searches-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-2.5">
              <Loader2 className="w-7 h-7 text-red-600 dark:text-red-400 animate-spin" />
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Retrieving stored searches from Firebase...
              </p>
            </div>
          ) : searches.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4 max-w-sm mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center text-zinc-400">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  No Saved Searches Yet
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  When you search for topics, queries and the complete related video information are automatically stored in your Firebase account.
                </p>
              </div>
            </div>
          ) : (
            searches.map((search) => {
              const isExpanded = expandedSearchId === search.id;
              const videos = search.videos || [];

              return (
                <div
                  key={search.id}
                  id={`stored-search-${search.id}`}
                  className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-hidden transition-all"
                >
                  {/* Query Item Header */}
                  <div
                    onClick={() => setExpandedSearchId(isExpanded ? null : search.id)}
                    className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                        <Search className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            &ldquo;{search.query}&rdquo;
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 shrink-0">
                            {search.resultsCount || videos.length} videos
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block truncate">
                          {formatTimestamp(search.timestamp)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadIntoThread(search);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors shadow-2xs cursor-pointer"
                        title="Load into active search timeline"
                      >
                        <RotateCcw className="w-3 h-3 text-red-500" />
                        <span className="hidden sm:inline">Load</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(search.id, e)}
                        disabled={isDeletingId === search.id}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                        title="Delete this query from Firebase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="text-zinc-400 p-0.5">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Videos List */}
                  {isExpanded && (
                    <div className="border-t border-zinc-200 dark:border-zinc-800/80 p-3 sm:p-4 bg-white dark:bg-zinc-950/40">
                      <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-2.5 flex items-center justify-between">
                        <span>Related Videos ({videos.length})</span>
                        <span className="text-[10px] text-zinc-400 font-normal">
                          Complete metadata stored in Firebase
                        </span>
                      </div>

                      <div className="space-y-2">
                        {videos.map((vid) => (
                          <div
                            key={vid.id}
                            onClick={(e) => handleOpenVideo(vid.id, e)}
                            className="group flex items-center gap-3 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-red-500/50 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-all cursor-pointer"
                          >
                            {/* Thumbnail */}
                            <div className="relative w-20 sm:w-24 aspect-video rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
                              {vid.thumbnail ? (
                                <Image
                                  src={vid.thumbnail}
                                  alt={vid.title}
                                  fill
                                  sizes="96px"
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                  <Film className="w-4 h-4" />
                                </div>
                              )}
                              {vid.duration && (
                                <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-mono px-1 py-0.2 rounded font-medium">
                                  {vid.duration}
                                </span>
                              )}
                            </div>

                            {/* Video Information */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                {vid.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                                <span className="truncate font-medium">{vid.channel}</span>
                                {vid.views && <span>• {vid.views}</span>}
                              </div>
                              {vid.description && (
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 line-clamp-1 mt-0.5">
                                  {vid.description}
                                </p>
                              )}
                            </div>

                            {/* Action CTA */}
                            <div className="shrink-0 flex items-center pr-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 group-hover:translate-x-0.5 transition-transform">
                                <Play className="w-3 h-3 fill-current" />
                                <span className="hidden md:inline">Open</span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
