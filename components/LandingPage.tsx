'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  MessageSquare,
  Layers,
  Presentation,
  HelpCircle,
  FileText,
  Compass,
  ArrowRight,
  CheckCircle2,
  Play,
  RotateCw,
  ChevronRight,
  ShieldCheck,
  Search,
  Check,
  Sparkles,
} from 'lucide-react';

export function LandingPage() {
  const { signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [demoTab, setDemoTab] = useState<'chat' | 'flashcards' | 'slides' | 'quiz'>('chat');
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const capabilities = [
    {
      icon: MessageSquare,
      title: 'Timestamp-Grounded Chat',
      description:
        'Ask specific questions about the video and receive detailed explanations with clickable timestamp links that jump directly to that exact moment.',
      badge: 'Interactive',
    },
    {
      icon: Layers,
      title: 'Automated Flashcard Decks',
      description:
        'Generate structured flashcard decks complete with questions, answers, and source citations for spaced repetition study.',
      badge: 'Study Tool',
    },
    {
      icon: Presentation,
      title: 'Visual Slide Summaries',
      description:
        'Transform long video lectures into clean presentation slides with executive takeaways, bullet points, and key formulas.',
      badge: 'Synthesis',
    },
    {
      icon: HelpCircle,
      title: 'Comprehension Quizzes',
      description:
        'Test your retention with instant multiple-choice questions, score tracking, and detailed explanations for each answer.',
      badge: 'Assessment',
    },
    {
      icon: FileText,
      title: 'Structured Takeaways',
      description:
        'Review comprehensive topic breakdowns with chronological chapter points linked directly into synchronized video playback.',
      badge: 'Review',
    },
    {
      icon: Compass,
      title: 'Curated Supplementary Guides',
      description:
        'Discover high-signal related videos and external documentation filtered by concise overviews or technical deep dives.',
      badge: 'Discovery',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Search Any Subject',
      description:
        'Enter any topic or concept to find high-signal YouTube tutorials, lectures, and instructional videos.',
    },
    {
      step: '02',
      title: 'Load Interactive Studio',
      description:
        'Select any video to open a synchronized split-pane workspace with live transcript grounding.',
    },
    {
      step: '03',
      title: 'Interact & Retain',
      description:
        'Ask targeted questions, flip through study flashcards, review slide summaries, and take retention quizzes.',
    },
  ];

  const faqs = [
    {
      q: 'How does timestamp grounding work?',
      a: 'When you ask a question in the chat workspace, answers include bracketed timestamps (such as [04:18]). Clicking any timestamp automatically seeks the embedded YouTube player directly to that exact segment.',
    },
    {
      q: 'What types of YouTube videos can I search and study?',
      a: 'VeoChat works with educational tutorials, computer science lectures, scientific explanations, history documentaries, and instructional videos across YouTube.',
    },
    {
      q: 'Do I need a paid subscription or special credentials?',
      a: 'No paid subscription is needed. You simply sign in with your standard Google account to start searching and interacting with video workspaces.',
    },
    {
      q: 'Is my search history and study progress saved?',
      a: 'Yes. When signed in, your search history and workspace sessions are securely preserved in your private profile so you can revisit them anytime.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased selection:bg-red-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={32} priority />
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-base sm:text-lg leading-tight text-zinc-950 dark:text-white">
                VeoChat
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium hidden xs:block">
                Interactive Video Workspace
              </span>
            </div>
          </div>

          {/* Navigation links for quick anchor scrolling */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <a
              href="#preview"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Interactive Preview
            </a>
            <a
              href="#capabilities"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Capabilities
            </a>
            <a
              href="#workflow"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#faq"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Right: Sign in with Google & ThemeToggle */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              id="landing-header-signin-btn"
              onClick={handleGoogleSignIn}
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

            <ThemeToggle id="landing-theme-toggle" />
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-20 sm:space-y-28">
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto pt-4 sm:pt-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/70 dark:border-red-900/40">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 animate-pulse" />
            <span>Interactive Video Learning Studio</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.12]">
            Transform Video Lectures Into{' '}
            <span className="text-red-600 dark:text-red-500">Active Workspaces</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Search any lecture or tutorial. Ask questions with clickable timestamp links, study
            flashcards, review summary slides, and test retention with instant quizzes.
          </p>

          {/* Primary Action Button */}
          <div className="pt-2 flex flex-col items-center justify-center gap-3">
            <button
              type="button"
              id="landing-hero-google-btn"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              {isSigningIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span>Sign in with Google</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Instant access • Private session history preserved</span>
            </div>
          </div>
        </section>

        {/* Interactive Studio Preview Section */}
        <section id="preview" className="space-y-4 max-w-5xl mx-auto">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Interactive Workspace Preview
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Try switching tabs below to explore how VeoChat organizes knowledge during video playback.
            </p>
          </div>

          {/* Window Mockup Frame */}
          <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
            {/* Window Top Bar */}
            <div className="h-10 px-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hidden sm:inline">
                  VeoChat Studio &mdash; Interactive Video Learning Workspace
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">Live Session</div>
            </div>

            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200/80 dark:divide-zinc-800">
              {/* Left: Actual YouTube Video Preview (Non-clickable) */}
              <div className="lg:col-span-6 flex flex-col bg-black text-white min-h-[280px] sm:min-h-[360px] relative overflow-hidden group">
                {/* Embedded YouTube Video with muted autoplay & loop */}
                <iframe
                  src="https://www.youtube.com/embed/avjX3QrYkls?autoplay=1&mute=1&loop=1&playlist=avjX3QrYkls&controls=0&disablekb=1&modestbranding=1&rel=0&playsinline=1"
                  title="YouTube Video Workspace Preview"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-105"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />

                {/* Completely transparent overlay blocking all click and hover interactions */}
                <div
                  className="absolute inset-0 z-20 cursor-default select-none bg-transparent"
                  aria-hidden="true"
                />

                {/* Floating Top Status Badge */}
                <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-white font-mono text-[11px] border border-white/15 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE WORKSPACE
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-zinc-300 font-mono text-[11px] border border-white/15 shadow-sm">
                    Synchronized
                  </span>
                </div>

                {/* Floating Bottom Chapter Tracker */}
                <div className="mt-auto m-3 z-30 p-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 text-white space-y-1.5 pointer-events-none shadow-lg">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-zinc-200 truncate">
                      Lecture: Interactive Topic Breakdown
                    </span>
                    <span className="text-red-400 font-mono shrink-0 ml-2">Active</span>
                  </div>
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="w-[42%] h-full bg-red-600 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Right: Interactive Tabs & Panel */}
              <div className="lg:col-span-6 p-4 sm:p-5 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/50 min-h-[340px]">
                {/* Tab Switcher */}
                <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-3">
                  {(['chat', 'flashcards', 'slides', 'quiz'] as const).map((tabKey) => {
                    const isActive = demoTab === tabKey;
                    const labels: Record<string, string> = {
                      chat: 'Grounded Chat',
                      flashcards: 'Flashcards',
                      slides: 'Slides',
                      quiz: 'Quiz',
                    };
                    return (
                      <button
                        key={tabKey}
                        type="button"
                        onClick={() => setDemoTab(tabKey)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {labels[tabKey]}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content 1: Chat */}
                {demoTab === 'chat' && (
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2.5">
                      <div className="self-end ml-auto max-w-[85%] bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs p-2.5 rounded-xl rounded-tr-xs">
                        Where is the scaling factor √d_k explained?
                      </div>
                      <div className="self-start max-w-[92%] bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-750 text-zinc-800 dark:text-zinc-200 text-xs p-3 rounded-xl rounded-tl-xs shadow-2xs space-y-1.5">
                        <p className="leading-relaxed">
                          At{' '}
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-semibold font-mono text-[11px]">
                            04:25
                          </span>
                          , the speaker explains that for large dimension values, dot products grow
                          large in magnitude, pushing the softmax function into regions with
                          extremely small gradients. Dividing by √d_k stabilizes training.
                        </p>
                        <div className="text-[10px] text-zinc-400 font-medium">
                          Clicking [04:25] seeks the video immediately.
                        </div>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 text-xs text-zinc-400 flex items-center justify-between">
                      <span>Ask about video...</span>
                      <div className="w-5 h-5 rounded-md bg-red-600 text-white flex items-center justify-center text-[10px]">
                        &rarr;
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content 2: Flashcards */}
                {demoTab === 'flashcards' && (
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    <div
                      onClick={() => setIsCardFlipped(!isCardFlipped)}
                      className="flex-1 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-750 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-all min-h-[160px]"
                    >
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                          Card 1 of 6 &bull; {isCardFlipped ? 'Answer' : 'Question'}
                        </span>
                        <span className="flex items-center gap-1">
                          <RotateCw className="w-3 h-3" /> Click to flip
                        </span>
                      </div>
                      <div className="my-auto py-2">
                        {isCardFlipped ? (
                          <p className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                            It injects information about the order of tokens in the sequence, since
                            self-attention operations are inherently permutation-invariant.
                          </p>
                        ) : (
                          <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white leading-relaxed">
                            Why are positional encodings required in transformer architectures?
                          </p>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">Reference: [07:12]</div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>Self-paced active recall</span>
                      <span className="font-medium text-red-600 dark:text-red-400">Card 1 / 6</span>
                    </div>
                  </div>
                )}

                {/* Tab Content 3: Slides */}
                {demoTab === 'slides' && (
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    <div className="flex-1 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-750 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          SLIDE 2 OF 5
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">[08:45] Chapter 3</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Multi-Head Attention vs Single Attention
                      </h4>
                      <ul className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1.5 list-disc pl-4 leading-relaxed">
                        <li>Allows model to jointly attend to information from different representation subspaces.</li>
                        <li>Projects queries, keys, and values h times with learned linear projections.</li>
                        <li>Total computational cost is similar to single-head attention with full dimensionality.</li>
                      </ul>
                    </div>
                    <div className="text-[11px] text-zinc-400 text-center font-medium">
                      Executive visual decks generated automatically for rapid review
                    </div>
                  </div>
                )}

                {/* Tab Content 4: Quiz */}
                {demoTab === 'quiz' && (
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-750 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-red-600 dark:text-red-400">QUESTION 1 OF 3</span>
                        <span className="text-zinc-400 font-mono">[04:25]</span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Why do we scale dot products by 1 / √d_k?
                      </p>
                      <div className="space-y-1.5">
                        {[
                          'To double the batch processing speed',
                          'To avoid extremely small softmax gradients from large magnitudes',
                          'To normalize sequence lengths automatically',
                        ].map((opt, idx) => {
                          const isSelected = selectedQuizOption === idx;
                          const isCorrect = idx === 1;
                          let btnStyle =
                            'border-zinc-200 dark:border-zinc-750 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300';
                          if (isSelected) {
                            btnStyle = isCorrect
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300';
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedQuizOption(idx)}
                              className={`w-full text-left px-3 py-1.5 rounded-lg border text-xs transition-colors flex items-center justify-between cursor-pointer ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {isSelected && isCorrect && (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-400 text-center font-medium">
                      Select option 2 to test instant quiz verification
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Platform Capabilities Grid */}
        <section id="capabilities" className="space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Purpose-Built Learning Studio
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Every tool is engineered to help you digest complex topics, memorize critical
              details, and navigate lectures effortlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200/50 dark:border-red-900/40">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3-Step Sequential Workflow */}
        <section
          id="workflow"
          className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs space-y-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                Workflow
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white">
                How VeoChat Works
              </h3>
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {workflowSteps.map((step, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-md">
                    {step.step}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-zinc-100">
                  {step.title}
                </h4>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              Clear answers to common questions about using the VeoChat workspace.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronRight
                      className={`w-4 h-4 text-zinc-400 transition-transform ${
                        isOpen ? 'rotate-90 text-red-500' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/80">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA Card (Red primary background with white button) */}
        <section className="p-8 sm:p-12 rounded-3xl bg-red-600 dark:bg-red-600 border border-red-500 text-white text-center space-y-6 max-w-4xl mx-auto shadow-xl shadow-red-950/25">
          <div className="space-y-2 max-w-xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Ready to Upgrade How You Learn from Video?
            </h3>
            <p className="text-xs sm:text-sm text-red-100 leading-relaxed">
              Sign in with your Google account to start searching, chatting with lectures, and
              mastering subjects in an interactive studio.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              id="landing-bottom-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl text-sm font-bold bg-white hover:bg-zinc-100 text-red-600 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
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
            <a href="#preview" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Preview
            </a>
            <a href="#capabilities" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Capabilities
            </a>
            <a href="#faq" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              FAQ
            </a>
          </div>
          <p className="text-zinc-400 dark:text-zinc-500">
            &copy; {new Date().getFullYear()} VeoChat. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
