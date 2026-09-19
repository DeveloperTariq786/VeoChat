'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router caught runtime error:', error);
  }, [error]);

  return (
    <div id="error-boundary-container" className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-center">
      <div id="error-icon-wrapper" className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h1 id="error-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        Something went wrong
      </h1>
      <p id="error-description" className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-6">
        {error?.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <div id="error-actions" className="flex items-center gap-3">
        <button
          id="error-try-again-button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
        <Link
          id="error-home-link"
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
