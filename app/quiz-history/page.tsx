'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth, SavedQuizAttempt } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserProfileMenu } from '@/components/UserProfileMenu';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { QuizPerformanceChart } from '@/components/QuizPerformanceChart';
import { AuthGuard } from '@/components/AuthGuard';
import {
  BrainCircuit,
  Sparkles,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  BookOpen,
  TrendingUp,
  Target,
  Lightbulb,
  ArrowRight,
  HelpCircle,
  Zap,
  GraduationCap,
} from 'lucide-react';

interface QuizProgressAnalysisState {
  overallSummary: string;
  masteryScore: number;
  masteryLevel: string;
  learningVelocity: string;
  keyStrengths: string[];
  areasForImprovement: string[];
  studyRecommendations: string[];
  personalizedTip: string;
  topicBreakdown: {
    topic: string;
    accuracy: number;
    status: 'mastered' | 'learning' | 'needs_review';
    totalQuestions: number;
  }[];
  streakInsights: string;
  totalQuizzesAnalyzed: number;
  overallAccuracy: number;
}

function QuizHistoryContent() {
  const { user, profile, loading: authLoading, signInWithGoogle, getQuizHistory, deleteQuizAttempt, clearQuizHistory } =
    useAuth();

  const [quizzes, setQuizzes] = useState<SavedQuizAttempt[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'score_high' | 'score_low'>('newest');

  // Diagnostic states
  const [analysis, setAnalysis] = useState<QuizProgressAnalysisState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isClearingHistory, setIsClearingHistory] = useState<boolean>(false);

  // Manual trigger for progress analysis refresh
  const triggerAnalysis = useCallback(
    async (attemptsList: SavedQuizAttempt[]) => {
      if (attemptsList.length === 0) return;
      setIsAnalyzing(true);
      setAnalysisError(null);
      try {
        const res = await fetch('/api/quiz/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attempts: attemptsList,
            userName: profile?.displayName || user?.displayName || 'Student',
          }),
        });
        if (!res.ok) {
          throw new Error(`Failed to generate progress analysis (${res.status})`);
        }
        const data = await res.json();
        setAnalysis(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error analyzing quiz history';
        setAnalysisError(msg);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [profile, user]
  );

  // Fetch quiz history from Firestore and run initial progress analysis
  useEffect(() => {
    let isMounted = true;
    if (!user) {
      return;
    }

    Promise.resolve()
      .then(() => {
        if (!isMounted) return;
        setLoadingHistory(true);
        return getQuizHistory();
      })
      .then((records) => {
        if (!isMounted || !records) return;
        setQuizzes(records);
        setLoadingHistory(false);

        if (records.length > 0) {
          setIsAnalyzing(true);
          fetch('/api/quiz/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attempts: records,
              userName: profile?.displayName || user?.displayName || 'Student',
            }),
          })
            .then((res) => {
              if (!res.ok) throw new Error('Analysis failed');
              return res.json();
            })
            .then((data) => {
              if (isMounted) {
                setAnalysis(data);
                setIsAnalyzing(false);
              }
            })
            .catch((err) => {
              if (isMounted) {
                setAnalysisError(err instanceof Error ? err.message : 'Error during analysis');
                setIsAnalyzing(false);
              }
            });
        }
      })
      .catch((err) => {
        console.error('Failed to load quiz history:', err);
        if (isMounted) {
          setLoadingHistory(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, profile, getQuizHistory]);

  // Filter and sort quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes
      .filter((q) => {
        // Search filter
        if (searchQuery.trim()) {
          const qLow = searchQuery.toLowerCase();
          const matchTitle = (q.videoTitle || '').toLowerCase().includes(qLow);
          const matchChannel = (q.videoChannel || '').toLowerCase().includes(qLow);
          if (!matchTitle && !matchChannel) return false;
        }

        // Difficulty filter
        if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) {
          return false;
        }

        // Score filter
        if (scoreFilter === 'perfect' && q.percentage !== 100) return false;
        if (scoreFilter === 'passed' && q.percentage < 70) return false;
        if (scoreFilter === 'review' && q.percentage >= 70) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return (b.timestamp || 0) - (a.timestamp || 0);
        if (sortBy === 'oldest') return (a.timestamp || 0) - (b.timestamp || 0);
        if (sortBy === 'score_high') return b.percentage - a.percentage;
        if (sortBy === 'score_low') return a.percentage - b.percentage;
        return 0;
      });
  }, [quizzes, searchQuery, selectedDifficulty, scoreFilter, sortBy]);

  // High-level statistics
  const stats = useMemo(() => {
    if (quizzes.length === 0) {
      return { total: 0, accuracy: 0, totalQuestions: 0, perfectCount: 0 };
    }
    const total = quizzes.length;
    let totalScore = 0;
    let totalQuestions = 0;
    let perfectCount = 0;

    quizzes.forEach((q) => {
      totalScore += q.score;
      totalQuestions += q.totalQuestions;
      if (q.percentage === 100) perfectCount++;
    });

    const accuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
    return { total, accuracy, totalQuestions, perfectCount };
  }, [quizzes]);

  // Handlers
  const handleDeleteAttempt = async (quizId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this quiz record?')) return;
    await deleteQuizAttempt(quizId);
    setQuizzes((prev) => prev.filter((item) => item.id !== quizId));
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all saved quiz history? This cannot be undone.')) {
      return;
    }
    setIsClearingHistory(true);
    try {
      await clearQuizHistory();
      setQuizzes([]);
      setAnalysis(null);
    } finally {
      setIsClearingHistory(false);
    }
  };

  return (
    <div id="quiz-history-page" className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <header
        id="quiz-history-header"
        className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200/80 dark:border-zinc-800/80 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg p-0.5"
            >
              <Logo size={28} />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-white group-hover:text-red-600 transition-colors">
                  VeoChat
                </span>
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hidden sm:inline">
                  Analytics
                </span>
              </div>
            </Link>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <BrainCircuit className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
              <span className="font-medium text-zinc-900 dark:text-zinc-200 hidden sm:inline">Quiz History & Analytics</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-200 sm:hidden text-xs">History</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle id="quiz-history-theme-toggle" />
            <UserProfileMenu id="quiz-history-user-profile" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Page Title & KPI Metrics Overview */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Quiz History & Learning Analytics</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Review your quiz attempts, inspect question breakdowns, and track concept retention across lessons.
              </p>
            </div>

            {quizzes.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => triggerAnalysis(quizzes)}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  title="Refresh progress diagnostics from all quiz results"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? 'Analyzing Progress...' : 'Refresh Analytics'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isClearingHistory}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  title="Clear all saved quiz history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear History</span>
                </button>
              </div>
            )}
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Quizzes */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Quizzes Completed</span>
                <BrainCircuit className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
                  {stats.total}
                </span>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Saved test sessions
                </span>
              </div>
            </div>

            {/* Card 2: Overall Accuracy */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Avg. Accuracy</span>
                <Target className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <span
                  className={`text-2xl sm:text-3xl font-black ${
                    stats.accuracy >= 80
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : stats.accuracy >= 60
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-zinc-900 dark:text-white'
                  }`}
                >
                  {stats.accuracy}%
                </span>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Across all questions
                </span>
              </div>
            </div>

            {/* Card 3: Questions Answered */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Questions Answered</span>
                <BookOpen className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
                  {stats.totalQuestions}
                </span>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {stats.perfectCount} perfect scores
                </span>
              </div>
            </div>

            {/* Card 4: Mastery Status */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Mastery Tier</span>
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate block">
                  {analysis?.masteryLevel || (stats.accuracy >= 85 ? 'Mastery Scholar' : stats.total > 0 ? 'Active Learner' : 'Explorer')}
                </span>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                  {analysis?.learningVelocity || 'Tracking progress'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Chart over Time */}
        {quizzes.length > 0 && (
          <QuizPerformanceChart quizzes={quizzes} overallAccuracy={stats.accuracy} />
        )}

        {/* Progress & Diagnostic Card */}
        {quizzes.length > 0 && (
          <div
            id="learning-diagnostic-card"
            className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 p-5 sm:p-6 shadow-xs relative overflow-hidden"
          >
            {/* Top Bar of Diagnostic Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                      Learning Progress & Skill Diagnostic
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Synthesized from {stats.total} quiz attempt{stats.total > 1 ? 's' : ''} and {stats.totalQuestions} questions
                  </p>
                </div>
              </div>

              {analysis?.streakInsights && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs border border-amber-200/60 dark:border-amber-800/40 self-start sm:self-auto">
                  <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-medium">{analysis.streakInsights}</span>
                </div>
              )}
            </div>

            {isAnalyzing ? (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center animate-pulse">
                  <BrainCircuit className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Synthesizing your knowledge trajectory...
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Evaluating retention insights and missed question patterns
                  </p>
                </div>
              </div>
            ) : analysis ? (
              <div className="space-y-5">
                {/* Executive Summary Narrative */}
                <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60">
                  <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                    {analysis.overallSummary}
                  </p>
                </div>

                {/* 3-Column Diagnostic Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Key Strengths */}
                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Key Knowledge Strengths</span>
                    </div>
                    <ul className="space-y-1.5">
                      {analysis.keyStrengths.map((item, idx) => (
                        <li key={idx} className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-1.5 leading-snug">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Areas to Revisit */}
                  <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                      <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Focus & Concept Gaps</span>
                    </div>
                    <ul className="space-y-1.5">
                      {analysis.areasForImprovement.map((item, idx) => (
                        <li key={idx} className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-1.5 leading-snug">
                          <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Study Recommendations */}
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-2.5">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-semibold text-xs">
                      <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Recommended Next Steps</span>
                    </div>
                    <ul className="space-y-1.5">
                      {analysis.studyRecommendations.map((item, idx) => (
                        <li key={idx} className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-1.5 leading-snug">
                          <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Topic Breakdown Progress Bars */}
                {analysis.topicBreakdown && analysis.topicBreakdown.length > 0 && (
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                      Topic Mastery Breakdown
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {analysis.topicBreakdown.map((t, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate pr-2">
                              {t.topic}
                            </span>
                            <span
                              className={`font-bold text-[11px] ${
                                t.status === 'mastered'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : t.status === 'needs_review'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {t.accuracy}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                t.status === 'mastered'
                                  ? 'bg-emerald-500'
                                  : t.status === 'needs_review'
                                  ? 'bg-red-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, t.accuracy))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personalized Golden Tip */}
                {analysis.personalizedTip && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-zinc-800 dark:text-zinc-200">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-amber-900 dark:text-amber-300">
                        Study Recommendation:
                      </span>
                      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {analysis.personalizedTip}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Filter and Search Controls */}
        {quizzes.length > 0 && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
            {/* Search Input */}
            <div className="relative w-full md:flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search quiz history by video title or channel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
            </div>

            {/* Filter Selectors */}
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 w-full md:w-auto">
              {/* Difficulty filter */}
              <select
                aria-label="Filter by Difficulty"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full sm:w-auto text-[11px] sm:text-xs font-medium bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl px-2 sm:px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer truncate"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Challenging</option>
              </select>

              {/* Score filter */}
              <select
                aria-label="Filter by Score"
                value={scoreFilter}
                onChange={(e) => setScoreFilter(e.target.value)}
                className="w-full sm:w-auto text-[11px] sm:text-xs font-medium bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl px-2 sm:px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer truncate"
              >
                <option value="all">All Scores</option>
                <option value="perfect">Perfect 100%</option>
                <option value="passed">Passed (70%+)</option>
                <option value="review">Needs Review (&lt;70%)</option>
              </select>

              {/* Sort Order */}
              <select
                aria-label="Sort Quiz Order"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto text-[11px] sm:text-xs font-medium bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl px-2 sm:px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer truncate"
              >
                <option value="newest">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="score_high">Highest Score</option>
                <option value="score_low">Lowest Score</option>
              </select>
            </div>
          </div>
        )}

        {/* Quiz Attempts Accordion List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Saved Quiz Sessions ({filteredQuizzes.length})
            </h2>
          </div>

          {loadingHistory ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
              <RefreshCw className="w-6 h-6 animate-spin text-red-600" />
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Loading your quiz records...
              </p>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-14 h-14 rounded-3xl bg-red-600/10 text-red-600 flex items-center justify-center">
                <BrainCircuit className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  {quizzes.length === 0 ? 'No quiz records yet' : 'No matching quizzes found'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {quizzes.length === 0
                    ? 'Watch any video in VeoChat, switch to the Quiz tab, and test your knowledge. Completed quizzes will be saved and analyzed here automatically!'
                    : 'Try clearing your search query or filters above to see more records.'}
                </p>
              </div>

              {quizzes.length === 0 ? (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Explore Lessons & Quizzes</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDifficulty('all');
                    setScoreFilter('all');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuizzes.map((quiz) => {
                const isExpanded = expandedQuizId === quiz.id;
                const formattedDate = quiz.createdAt
                  ? new Date(quiz.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent session';

                const isPerfect = quiz.percentage === 100;
                const isPassing = quiz.percentage >= 70;

                return (
                  <div
                    key={quiz.id}
                    className={`rounded-2xl border transition-all bg-white dark:bg-zinc-900 overflow-hidden w-full max-w-full ${
                      isExpanded
                        ? 'border-red-500/40 ring-1 ring-red-500/20 shadow-md'
                        : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs'
                    }`}
                  >
                    {/* Card Summary Header */}
                    <div
                      onClick={() => setExpandedQuizId(isExpanded ? null : quiz.id)}
                      className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 cursor-pointer select-none w-full max-w-full overflow-hidden"
                    >
                      <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0 w-full flex-1 overflow-hidden">
                        {/* Video Thumbnail */}
                        {quiz.videoThumbnail ? (
                          <div className="relative w-14 h-9 sm:w-20 sm:h-12 rounded-lg sm:rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
                            <Image
                              src={quiz.videoThumbnail}
                              alt={quiz.videoTitle}
                              fill
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                            <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                          </div>
                        )}

                        {/* Title & Metadata */}
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <h3
                            className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate block w-full"
                            title={quiz.videoTitle}
                          >
                            {quiz.videoTitle}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex-wrap overflow-hidden">
                            <span
                              className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[100px] sm:max-w-[150px] inline-block"
                              title={quiz.videoChannel}
                            >
                              {quiz.videoChannel}
                            </span>
                            <span className="shrink-0">•</span>
                            <span className="flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{formattedDate}</span>
                            </span>
                            <span className="shrink-0">•</span>
                            <span className="capitalize px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono shrink-0">
                              {quiz.difficulty || 'balanced'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Score Badge and Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t border-zinc-100 dark:border-zinc-800/80 sm:border-t-0 shrink-0">
                        {/* Score Pill */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs sm:text-sm font-bold ${
                              isPerfect
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isPassing
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {quiz.score}/{quiz.totalQuestions}
                          </span>
                          <span
                            className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold ${
                              isPerfect
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : isPassing
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {quiz.percentage}%
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Link
                            href={`/video/${quiz.videoId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Open in Video Studio"
                          >
                            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteAttempt(quiz.id, e)}
                            className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete this record"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          <div className="text-zinc-400 p-1">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Question Review (Expanded) with full math support */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/30 rounded-b-2xl animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 pt-1">
                          <span>Question Breakdown & Explanation Review</span>
                          <Link
                            href={`/video/${quiz.videoId}`}
                            className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline"
                          >
                            <span>Retake Quiz in Workspace</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>

                        <div className="space-y-3">
                          {quiz.questionsSummary && quiz.questionsSummary.length > 0 ? (
                            quiz.questionsSummary.map((q, idx) => (
                              <div
                                key={idx}
                                className={`p-3.5 rounded-2xl border text-xs ${
                                  q.correct
                                    ? 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800'
                                    : 'bg-red-50/40 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2.5 mb-2">
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    {q.correct ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                    )}
                                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                                      <span className="text-zinc-400 mr-1.5">Q{idx + 1}.</span>
                                      <MarkdownRenderer content={q.question} inline />
                                    </div>
                                  </div>

                                  {q.seconds !== undefined && q.timestamp && (
                                    <Link
                                      href={`/video/${quiz.videoId}?t=${q.seconds}`}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-red-600 dark:text-red-400 text-[10px] font-mono font-medium hover:bg-red-50 transition-colors shrink-0"
                                      title="Jump to video timestamp in workspace"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-current" />
                                      <span>{q.timestamp}</span>
                                    </Link>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mb-2">
                                  <div
                                    className={`p-2.5 rounded-xl border ${
                                      q.correct
                                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                                        : 'bg-red-50/60 dark:bg-red-950/30 border-red-200/60 dark:border-red-800/40 text-red-900 dark:text-red-200'
                                    }`}
                                  >
                                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70 block mb-0.5">
                                      Your Choice:
                                    </span>
                                    <MarkdownRenderer content={q.userAnswer} inline />
                                  </div>
                                  {!q.correct && (
                                    <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200">
                                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70 block mb-0.5">
                                        Correct Answer:
                                      </span>
                                      <MarkdownRenderer content={q.correctAnswer} inline />
                                    </div>
                                  )}
                                </div>

                                {q.explanation && (
                                  <div className="text-[11px] text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-0.5">
                                      Explanation:
                                    </span>
                                    <MarkdownRenderer content={q.explanation} />
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-zinc-500 py-2">
                              Detailed questions are available on recent quiz runs.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function QuizHistoryPage() {
  return (
    <AuthGuard
      title="Quiz History Protected"
      description="You must be signed in with your Google account to access your quiz history, past attempts, and diagnostic analytics."
    >
      <QuizHistoryContent />
    </AuthGuard>
  );
}
