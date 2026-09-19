'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ExternalResourceItem, ExternalResourcesApiResponse } from '@/types/video';
import {
  Globe,
  BookOpen,
  FileCode2,
  Bookmark,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  AlertCircle,
  FileText,
  Video,
  Wrench,
  Library,
} from 'lucide-react';

interface ExternalResourcesPanelProps {
  videoId: string;
  video: { title?: string; channel?: string } | null;
  onResourcesLoaded?: (count: number) => void;
}

export function ExternalResourcesPanel({
  videoId,
  video,
  onResourcesLoaded,
}: ExternalResourcesPanelProps) {
  const [resources, setResources] = useState<ExternalResourceItem[]>([]);
  const [topic, setTopic] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchResources = useCallback(async (isRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/video/${videoId}/resources`, {
        method: isRefresh ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch external resources (${res.status})`);
      }

      const data: ExternalResourcesApiResponse = await res.json();
      const items = data.resources || [];
      setResources(items);
      if (data.topic) setTopic(data.topic);
      if (onResourcesLoaded) {
        onResourcesLoaded(items.length);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load external resources';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [videoId, onResourcesLoaded]);

  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        const res = await fetch(`/api/video/${videoId}/resources`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch external resources (${res.status})`);
        }
        const data: ExternalResourcesApiResponse = await res.json();
        if (isMounted) {
          const items = data.resources || [];
          setResources(items);
          if (data.topic) setTopic(data.topic);
          if (onResourcesLoaded) {
            onResourcesLoaded(items.length);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Unable to load external resources';
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
  }, [videoId, onResourcesLoaded]);

  const handleCopyLink = (item: ExternalResourceItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.link);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryBadge = (category: ExternalResourceItem['category']) => {
    switch (category) {
      case 'documentation':
        return {
          label: 'Documentation',
          icon: FileCode2,
          className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800',
        };
      case 'reference':
        return {
          label: 'Reference',
          icon: Library,
          className: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/80 dark:border-purple-800',
        };
      case 'tutorial':
        return {
          label: 'Tutorial',
          icon: BookOpen,
          className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/80 dark:border-blue-800',
        };
      case 'video':
        return {
          label: 'Video Link',
          icon: Video,
          className: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200/80 dark:border-red-800',
        };
      case 'tool':
        return {
          label: 'Tool / Utility',
          icon: Wrench,
          className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800',
        };
      case 'article':
      default:
        return {
          label: 'Article',
          icon: FileText,
          className: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800',
        };
    }
  };

  return (
    <div id="external-resources-panel" className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-900">
      {/* Header Controls */}
      <div className="p-3 sm:p-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-950/30">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
              <span>External Links & Resources</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold">
                Google & Web
              </span>
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {topic ? `Browser links & documentation for "${topic}"` : 'Curated articles, docs & web resources'}
            </p>
          </div>
        </div>

        <button
          id="refresh-resources-btn"
          type="button"
          onClick={() => fetchResources(true)}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50 shrink-0 border border-zinc-200/80 dark:border-zinc-700/80"
          title="Refresh Web Resources"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 animate-pulse space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700/60" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700/60 rounded w-1/3" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700/60 rounded w-16 ml-auto" />
                </div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700/60 rounded w-4/5" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-700/60 rounded w-full" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-700/60 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => fetchResources(true)}
              className="mt-3 px-4 py-1.5 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : resources.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-800">
            <Globe className="w-8 h-8 text-zinc-400 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No external resources found</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Click refresh to discover online references and articles for this video.
            </p>
            <button
              type="button"
              onClick={() => fetchResources(true)}
              className="mt-3 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              Discover Resources
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {resources.map((item) => {
              const catBadge = getCategoryBadge(item.category);
              const CatIcon = catBadge.icon;
              const isCopied = copiedId === item.id;

              return (
                <div
                  key={item.id}
                  id={`resource-item-${item.id}`}
                  className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-2xs hover:shadow-md"
                >
                  <div>
                    {/* Top Metadata Row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.favicon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.favicon}
                            alt=""
                            className="w-4 h-4 rounded-xs shrink-0 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Globe className="w-4 h-4 text-zinc-400 shrink-0" />
                        )}
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 truncate">
                          {item.source || item.domain || 'External Resource'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${catBadge.className}`}
                        >
                          <CatIcon className="w-2.5 h-2.5" />
                          <span>{catBadge.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug flex items-start gap-1.5"
                    >
                      <span className="flex-1">{item.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0 mt-0.5" />
                    </a>

                    {/* Snippet */}
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                      {item.snippet}
                    </p>
                  </div>

                  {/* Footer Row */}
                  <div className="flex items-center justify-between gap-2 pt-2.5 mt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 truncate">
                      {item.publishedDate && (
                        <span>{item.publishedDate}</span>
                      )}
                      {item.domain && (
                        <span className="truncate">{item.domain}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(item, e)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Copy Resource URL"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>

                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition-colors shadow-2xs"
                      >
                        <span>Visit</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
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
