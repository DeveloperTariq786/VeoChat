'use client';

import React, { useState, useRef } from 'react';
import { Search, Loader2, ArrowUp, X } from 'lucide-react';

interface BottomChatSearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  onClearThread?: () => void;
  hasThread?: boolean;
}

export function BottomChatSearchBar({
  onSearch,
  isLoading = false,
}: BottomChatSearchBarProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && !isLoading) {
      onSearch(trimmed);
      setInput('');
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Compact, Mobile-Responsive Search Form */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center w-full bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-full border border-zinc-300/80 dark:border-zinc-700/80 shadow-lg shadow-zinc-900/10 dark:shadow-black/40 focus-within:border-red-500 dark:focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 transition-all p-1 sm:p-1.5"
      >
        <div className="pl-2.5 sm:pl-3 pr-1.5 flex items-center text-zinc-400 dark:text-zinc-500 shrink-0">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>

        <input
          ref={inputRef}
          id="chat-search-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type Any Topic"
          className="w-full py-1.5 sm:py-2 pr-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 bg-transparent border-none outline-none min-w-0"
          disabled={isLoading}
          autoComplete="off"
        />

        {input && (
          <button
            type="button"
            onClick={() => setInput('')}
            className="p-1 mr-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
            title="Clear text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          id="chat-search-submit-btn"
          type="submit"
          disabled={!input.trim() || isLoading}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl sm:rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-40 disabled:hover:bg-red-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
          title="Send query"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          )}
        </button>
      </form>
    </div>
  );
}
