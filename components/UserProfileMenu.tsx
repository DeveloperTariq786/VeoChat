'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMounted } from '@/lib/useIsMounted';
import { User, LogOut, ChevronDown, CheckCircle2 } from 'lucide-react';

interface UserProfileMenuProps {
  id?: string;
}

export function UserProfileMenu({ id = 'user-profile-menu' }: UserProfileMenuProps) {
  const { user, profile, loading, signInWithGoogle, logout } = useAuth();
  const isMounted = useIsMounted();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
      setIsOpen(false);
    } catch (err) {
      console.error('Sign in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (!isMounted || loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <button
        id={`${id}-signin-btn`}
        type="button"
        onClick={handleSignIn}
        disabled={isSigningIn}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-all cursor-pointer shadow-xs disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{isSigningIn ? 'Signing In...' : 'Sign In'}</span>
      </button>
    );
  }

  const displayName = profile?.displayName || user.displayName || 'VeoChat User';
  const email = profile?.email || user.email || '';
  const photoURL = profile?.photoURL || user.photoURL;

  return (
    <div className="relative" ref={menuRef} id={id}>
      <button
        type="button"
        id={`${id}-trigger-btn`}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left shadow-2xs"
        title="User Profile & Settings"
      >
        {photoURL ? (
          <Image
            src={photoURL}
            alt={displayName}
            width={28}
            height={28}
            className="w-7 h-7 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="hidden md:flex flex-col text-left max-w-[120px]">
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {displayName}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
            {email}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 hidden sm:block" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id={`${id}-dropdown`}
          className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* User Details Header */}
          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-100 dark:border-zinc-800/60 mb-2">
            {photoURL ? (
              <Image
                src={photoURL}
                alt={displayName}
                width={40}
                height={40}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-red-500/20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  {displayName}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate block">
                {email}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-1">
            <button
              type="button"
              id={`${id}-logout-btn`}
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
