'use client';

import React, { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => {
    window.removeEventListener('storage', callback);
    observer.disconnect();
  };
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains('dark');
}

function getServerSnapshot(): boolean {
  return true;
}

export function ThemeToggle({ id = 'theme-toggle-btn' }: { id?: string }) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      localStorage.setItem('askthevideo-theme', 'light');
    } else {
      root.classList.add('dark');
      localStorage.setItem('askthevideo-theme', 'dark');
    }
  };

  return (
    <button
      id={id}
      type="button"
      onClick={toggleTheme}
      className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200/80 dark:border-zinc-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}

