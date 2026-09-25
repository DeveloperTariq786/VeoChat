'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserProfileMenu } from '@/components/UserProfileMenu';
import {
  MessageSquare,
  Layers,
  Presentation,
  BrainCircuit,
  Compass,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Play,
  ArrowLeft,
  Search,
  Zap,
  BookOpen,
  Cpu,
  Target,
} from 'lucide-react';

export default function AboutPage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
      router.push('/');
    } catch (err) {
      console.error('Sign in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const corePillars = [
    {
      icon: MessageSquare,
      title: 'Timestamp-Grounded Reasoning',
      description:
        'Generic AI tools hallucinate or speak vaguely. VeoChat links every answer and key point directly to the exact second in the video transcript, allowing instant verification and non-linear review.',
      tag: 'Zero Hallucination',
    },
    {
      icon: Layers,
      title: 'Active Recall Study Decks',
      description:
        'Passive watching yields less than 20% retention after two days. VeoChat automatically generates interactive flashcards with questions, answers, and source citations for spaced repetition mastery.',
      tag: 'Retention Engine',
    },
    {
      icon: Presentation,
      title: 'Slide & Summary Synthesis',
      description:
        'Condense hour-long academic lectures and coding tutorials into executive presentation slides featuring takeaways, key formulas, code snippets, and structural frameworks.',
      tag: 'Rapid Synthesis',
    },
    {
      icon: BrainCircuit,
      title: 'Adaptive Comprehension Quizzes',
      description:
        'Evaluate your retention immediately after watching. Receive dynamic multiple-choice assessments with scoring analytics and granular explanations for every question.',
      tag: 'Instant Evaluation',
    },
    {
      icon: Search,
      title: 'Conversational Video Discovery',
      description:
        'A conversational YouTube discovery engine calibrated specifically for educational and technical content, filtering out low-quality clickbait in favor of high-signal lectures.',
      tag: 'High-Signal Search',
    },
    {
      icon: ShieldCheck,
      title: 'Personalized Learning Vault',
      description:
        'Your search history, study sessions, quiz performance, and active recall notes are securely synced to your private account, enabling a continuous personal knowledge base.',
      tag: 'Cloud Sync',
    },
  ];

  const architecturalLayers = [
    {
      number: '01',
      title: 'Transcript Ingestion & Time-Alignment',
      detail:
        'VeoChat extracts and parses time-coded video transcripts, tokenizing subtitles and synchronizing them into structured, chronological segments.',
    },
    {
      number: '02',
      title: 'Gemini Multimodal Grounding',
      detail:
        'State-of-the-art Gemini language models analyze the video context with strict grounding rules, attributing each piece of knowledge to specific timestamps.',
    },
    {
      number: '03',
      title: 'Synchronized Split-Pane Interface',
      detail:
        'A unified dual-pane workspace pairs embedded YouTube playback with interactive chat, slide viewers, flashcard decks, and quiz panels that control the player dynamically.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-red-500/20 selection:text-red-700 dark:selection:text-red-300">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Back to Home */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
              id="about-header-logo-link"
            >
              <Logo size={32} className="rounded-xl shadow-xs" priority />
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
                  VeoChat
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium hidden xs:block">
                  Interactive Video Workspace
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <Link
              href="/"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Home / Studio
            </Link>
            <Link
              href="/#preview"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Interactive Preview
            </Link>
            <Link
              href="/#capabilities"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Capabilities
            </Link>
            <Link
              href="/#faq"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              FAQ
            </Link>
            <span className="text-red-600 dark:text-red-400 font-bold border-b-2 border-red-600 dark:border-red-400 pb-0.5">
              About
            </span>
          </nav>

          {/* Right Action: Sign In or Profile + ThemeToggle */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Open Studio</span>
                </Link>
                <UserProfileMenu id="about-user-menu" />
              </div>
            ) : (
              <button
                type="button"
                id="about-header-signin-btn"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSigningIn ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
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
                )}
                <span>Sign in with Google</span>
              </button>
            )}

            <ThemeToggle id="about-theme-toggle" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16 sm:space-y-24">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-200 inline-flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3 h-3" />
            <span>Back to Video Studio</span>
          </Link>
          <span>/</span>
          <span className="text-zinc-800 dark:text-zinc-200 font-medium">About VeoChat</span>
        </div>

        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto pt-2 sm:pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/70 dark:border-red-900/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>About The Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.12]">
            Turning Video Watching Into{' '}
            <span className="text-red-600 dark:text-red-500">Active Mastery</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            VeoChat was designed to solve the passive learning trap. We transform YouTube lectures,
            academic seminars, and technical workshops into synchronized, interactive workspaces
            powered by timestamp-grounded AI.
          </p>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs hover:shadow transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Video Workspace</span>
            </Link>
          </div>
        </section>

        {/* The Problem & Our Mission */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                The Passive Video Problem
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Video is the primary medium for technical education today, but passive viewing is
                inherently inefficient. Without questioning, testing, and synthesizing, learners
                forget over 80% of what they watch within 48 hours. Searching for specific formulas
                or concepts across a 60-minute video is frustrating and slow.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Cognitive Science Challenge
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-900/50">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                The VeoChat Solution
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                VeoChat couples real-time video transcript grounding with proven learning science:
                interactive conversational exploration, active recall flashcards, visual slides, and
                comprehension quizzes. Everything is synchronized with the video player so you can jump
                to the exact second where any concept is taught.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-xs font-semibold text-red-600 dark:text-red-400">
              Active Recall + Multimodal Grounding
            </div>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Built for High-Retention Learning
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Every feature in VeoChat serves a deliberate cognitive function.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {corePillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 flex flex-col justify-between space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200/60 dark:border-red-900/40">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-full">
                        {pillar.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How It Works Behind The Scenes */}
        <section className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 space-y-8">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Architecture & Engine
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              How VeoChat Works
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Behind the sleek interface is a pipeline designed for latency, accuracy, and chronological fidelity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {architecturalLayers.map((layer) => (
              <div
                key={layer.number}
                className="space-y-2 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/70"
              >
                <div className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                  {layer.number}
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {layer.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {layer.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="p-8 sm:p-12 rounded-3xl bg-red-600 dark:bg-red-600 border border-red-500 text-white text-center space-y-6 max-w-4xl mx-auto shadow-xl shadow-red-950/25">
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Ready to Upgrade How You Learn from Video?
            </h2>
            <p className="text-xs sm:text-sm text-red-100 leading-relaxed">
              Open any video lecture, ask questions with timestamp precision, and master the material.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl text-sm font-bold bg-white hover:bg-zinc-100 text-red-600 shadow-md transition-all"
              >
                <span>Go to Video Studio</span>
                <ArrowRight className="w-4 h-4 text-red-600" />
              </Link>
            ) : (
              <button
                type="button"
                id="about-bottom-signin-btn"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl text-sm font-bold bg-white hover:bg-zinc-100 text-red-600 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSigningIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-red-600">Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                    <ArrowRight className="w-4 h-4 text-red-600" />
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-200/80 dark:border-zinc-800/80 py-8 text-xs text-zinc-500 dark:text-zinc-400 px-4 sm:px-8 mt-auto bg-white dark:bg-zinc-950">
        <div className="w-full max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size={24} className="rounded-md" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100">VeoChat</span>
            <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
            <span>Interactive Video Learning Studio</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/#preview" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Preview
            </Link>
            <Link href="/#capabilities" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Capabilities
            </Link>
            <Link href="/#faq" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              FAQ
            </Link>
            <Link href="/about" className="text-red-600 dark:text-red-400 font-semibold hover:underline">
              About
            </Link>
          </div>
          <p className="text-zinc-400 dark:text-zinc-500">
            &copy; {new Date().getFullYear()} VeoChat. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
