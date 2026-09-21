'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ShieldAlert, ArrowLeft, ArrowRight, Lock } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  title = 'Authentication Required',
  description = 'You must be signed in with your Google account to access this workspace. Videos, history, and interactive chat tools are restricted to authenticated accounts.',
  redirectTo = '/',
}: AuthGuardProps) {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      // Trigger navigation to home landing page
      router.replace(redirectTo);
    }
  }, [loading, user, router, redirectTo]);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (err) {
      console.error('Authentication error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  // While checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased">
        <div className="flex flex-col items-center gap-3">
          <Logo size={42} className="animate-pulse" priority />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium tracking-wide">
            Verifying authentication...
          </p>
        </div>
      </div>
    );
  }

  // If unauthenticated: completely block children from ever rendering and show security gate
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased selection:bg-red-500 selection:text-white">
        {/* Simple top header */}
        <header className="w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <Logo size={28} />
              <span className="font-bold text-sm text-zinc-900 dark:text-white tracking-tight">
                VeoChat
              </span>
            </Link>
            <ThemeToggle id="auth-guard-theme-toggle" />
          </div>
        </header>

        {/* Centered Auth Card */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100/70 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Protected Route</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                {description}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                id="auth-guard-signin-btn"
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSigningIn ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                )}
                <span>Sign in with Google to Continue</span>
              </button>

              <Link
                href="/"
                id="auth-guard-home-btn"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Home</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated: Render children
  return <>{children}</>;
}
