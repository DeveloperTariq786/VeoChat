'use client';

import React, { useState } from 'react';
import { Search, X, Loader2, Sparkles, CornerDownLeft } from 'lucide-react';

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  isLoading?: boolean;
  id?: string;
}

const POPULAR_SUGGESTIONS = [
  'how to make cold brew coffee',
  'Next.js 15 tutorial for beginners',
  'lofi beats for focus and study',
  'how transformers and LLMs work',
];

export function SearchBar({
  initialQuery = '',
  onSearch,
  isLoading = false,
  id = 'main-search-bar',
}: SearchBarProps) {
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);

  // Sync internal state during render when initialQuery changes (e.g. restored from sessionStorage)
  if (initialQuery !== prevInitialQuery) {
    setPrevInitialQuery(initialQuery);
    setQuery(initialQuery);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div id={id} className="w-full max-w-2xl lg:max-w-3xl mx-auto flex flex-col items-center">
      {/* Search Bar Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full relative flex items-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 focus-within:border-zinc-400 dark:focus-within:border-zinc-600 focus-within:ring-4 focus-within:ring-zinc-900/5 dark:focus-within:ring-white/5 transition-all p-1.5"
      >
        <div className="pl-3.5 pr-2 flex items-center text-zinc-400 dark:text-zinc-500 shrink-0">
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        <input
          id="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type Any Topic"
          className="w-full py-2.5 sm:py-3 pr-2 text-sm sm:text-[15px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 bg-transparent border-none outline-none min-w-0"
          disabled={isLoading}
          autoComplete="off"
        />

        {query && !isLoading && (
          <button
            id="clear-search-btn"
            type="button"
            onClick={handleClear}
            className="p-1.5 mr-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          id="search-submit-btn"
          type="submit"
          disabled={!query.trim() || isLoading}
          className="px-4 sm:px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              <span className="hidden xs:inline">Searching...</span>
            </>
          ) : (
            <>
              <span>Search</span>
              <CornerDownLeft className="w-3 h-3 opacity-70 hidden sm:inline" />
            </>
          )}
        </button>
      </form>

      {/* Suggestion Chips */}
      <div className="w-full mt-3.5 flex items-center flex-wrap gap-1.5 sm:gap-2 justify-center text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1 font-medium text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mr-1">
          <Sparkles className="w-3 h-3 text-amber-500/90" />
          Suggested:
        </span>
        {POPULAR_SUGGESTIONS.map((item, idx) => (
          <button
            key={item}
            id={`suggestion-chip-${idx}`}
            type="button"
            onClick={() => handleSuggestionClick(item)}
            className="px-2.5 sm:px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/70 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-pointer text-[11px] sm:text-xs font-medium"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
