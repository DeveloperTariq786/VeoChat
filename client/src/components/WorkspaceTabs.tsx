'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Layers,
  Presentation,
  BrainCircuit,
  Compass,
  Globe,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export type WorkspaceTabType =
  | 'chat'
  | 'flashcards'
  | 'slides'
  | 'infographics'
  | 'quiz'
  | 'recommendations'
  | 'resources';

interface WorkspaceTabsProps {
  activeTab: WorkspaceTabType;
  onTabChange: (tab: WorkspaceTabType) => void;
  flashcardCount?: number;
  slideCount?: number;
  infographicCount?: number;
  quizCount?: number;
  recommendationCount?: number;
  resourceCount?: number;
  orientation?: 'horizontal' | 'vertical';
  showDescriptions?: boolean;
  className?: string;
}

export function WorkspaceTabs({
  activeTab,
  onTabChange,
  flashcardCount = 0,
  slideCount = 0,
  infographicCount = 0,
  quizCount = 0,
  recommendationCount = 0,
  resourceCount = 0,
  orientation = 'horizontal',
  showDescriptions = false,
  className = '',
}: WorkspaceTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const tabs: Array<{
    id: WorkspaceTabType;
    label: string;
    horizontalLabel: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }> = [
    {
      id: 'chat',
      label: 'Chat',
      horizontalLabel: 'Chat',
      description: 'Interactive AI Q&A & insights',
      icon: MessageSquare,
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      horizontalLabel: 'Flashcards',
      description: 'Active recall study deck',
      icon: Layers,
      badge: flashcardCount > 0 ? flashcardCount : undefined,
    },
    {
      id: 'slides',
      label: 'Slides',
      horizontalLabel: 'Slides',
      description: 'Visual presentations & cards',
      icon: Presentation,
      badge: slideCount > 0 ? slideCount : undefined,
    },
    // Infographics tab is temporarily hidden across all screens; underlying code is preserved
    /*
    {
      id: 'infographics',
      label: 'Infographics',
      horizontalLabel: 'Infographics',
      description: 'AI visual summary & concept graphics',
      icon: Sparkles,
      badge: infographicCount > 0 ? infographicCount : undefined,
    },
    */
    {
      id: 'quiz',
      label: 'Quiz',
      horizontalLabel: 'Quiz',
      description: 'Dynamic comprehension test',
      icon: BrainCircuit,
      badge: quizCount > 0 ? quizCount : undefined,
    },
    {
      id: 'recommendations',
      label: 'Related Videos',
      horizontalLabel: 'Related',
      description: 'Similar & related YouTube videos',
      icon: Compass,
      badge: recommendationCount > 0 ? recommendationCount : undefined,
    },
    {
      id: 'resources',
      label: 'External Links',
      horizontalLabel: 'Links',
      description: 'Curated articles, documentation & web resources',
      icon: Globe,
      badge: resourceCount > 0 ? resourceCount : undefined,
    },
  ];

  const checkScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    if (orientation !== 'horizontal') return;

    checkScrollState();
    const el = scrollRef.current;
    if (!el) return;

    const handleResize = () => checkScrollState();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => {
      checkScrollState();
    });
    observer.observe(el);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [orientation, checkScrollState]);

  // Auto-scroll active tab into view whenever activeTab changes
  useEffect(() => {
    if (orientation !== 'horizontal') return;

    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const activeEl = scrollRef.current.querySelector<HTMLElement>(`#workspace-tab-${activeTab}`);
        if (activeEl) {
          const container = scrollRef.current;
          const leftOffset = activeEl.offsetLeft - container.offsetLeft;
          const rightOffset = leftOffset + activeEl.offsetWidth;
          
          if (leftOffset < container.scrollLeft || rightOffset > container.scrollLeft + container.clientWidth) {
            activeEl.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'center',
            });
          }
        }
      }
      checkScrollState();
    }, 50);

    return () => clearTimeout(timer);
  }, [activeTab, orientation, checkScrollState]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -120 : 120;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScrollState, 200);
  };

  if (orientation === 'vertical') {
    return (
      <nav
        id="workspace-tabs-vertical-nav"
        aria-label="Workspace Tools Sidebar"
        className={`flex flex-col gap-1.5 w-full ${className}`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`workspace-vtab-${tab.id}`}
              type="button"
              onClick={() => onTabChange(tab.id)}
              title={tab.description}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all select-none cursor-pointer group ${
                isActive
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs border border-zinc-200/90 dark:border-zinc-700/80 font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-transparent font-medium'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isActive
                    ? 'bg-red-600/10 text-red-600 dark:text-red-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs truncate">
                    {tab.label}
                  </span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md font-medium shrink-0 ${
                        isActive
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                          : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                {showDescriptions && tab.description && (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 leading-tight">
                    {tab.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <div className={`relative flex items-center w-full group ${className}`}>
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <div className="absolute left-0 z-10 flex items-center h-full pr-2 bg-gradient-to-r from-white via-white/90 to-transparent dark:from-zinc-900 dark:via-zinc-900/90 dark:to-transparent pl-0.5">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label="Scroll tabs left"
            className="w-6 h-6 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 hover:scale-105 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Horizontal Tabs List */}
      <div
        ref={scrollRef}
        id="workspace-tabs-container"
        onScroll={checkScrollState}
        className="w-full flex items-center gap-1 p-1 bg-zinc-100/90 dark:bg-zinc-800/90 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`workspace-tab-${tab.id}`}
              type="button"
              onClick={() => onTabChange(tab.id)}
              title={tab.description}
              className={`flex-1 shrink-0 min-w-fit flex items-center justify-center gap-1 sm:gap-1.5 py-1 sm:py-1.5 px-2 sm:px-2.5 rounded-lg text-[11px] sm:text-xs transition-all select-none whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-2xs border border-zinc-200/70 dark:border-zinc-700 font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 font-medium'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  isActive ? 'text-red-600 dark:text-red-400' : 'text-zinc-400 dark:text-zinc-500'
                }`}
              />
              <span>{tab.horizontalLabel}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-medium shrink-0 ${
                    isActive
                      ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      {canScrollRight && (
        <div className="absolute right-0 z-10 flex items-center h-full pl-2 bg-gradient-to-l from-white via-white/90 to-transparent dark:from-zinc-900 dark:via-zinc-900/90 dark:to-transparent pr-0.5">
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label="Scroll tabs right"
            className="w-6 h-6 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 hover:scale-105 transition-all cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default WorkspaceTabs;

