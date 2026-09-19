'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global layout error caught:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center font-sans antialiased">
        <div id="global-error-container" className="flex flex-col items-center max-w-md">
          <div id="global-error-icon" className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 id="global-error-heading" className="text-xl font-bold mb-2">Application Error</h1>
          <p id="global-error-text" className="text-sm text-zinc-400 mb-6">
            {error?.message || 'A critical error occurred. Please try reloading the page.'}
          </p>
          <button
            id="global-error-reset-button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Application</span>
          </button>
        </div>
      </body>
    </html>
  );
}
