'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';

function ChatRedirectContent() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="flex flex-col items-center gap-3">
        <Logo size={42} className="animate-pulse" priority />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          Loading chat workspace...
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard
      title="Chat Workspace Protected"
      description="You must be signed in with your Google account to access conversational video search and chat."
    >
      <ChatRedirectContent />
    </AuthGuard>
  );
}
