'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { VideoItem, QuizData, QuizQuestion } from '@/types/video';
import { useAuth } from '@/contexts/AuthContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  BrainCircuit,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  Award,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Trophy,
} from 'lucide-react';

interface QuizPanelProps {
  videoId: string;
  video: VideoItem | null;
  onSeekToTime?: (seconds: number) => void;
  onQuizLoaded?: (questionCount: number) => void;
}

type QuizDifficulty = 'all' | 'easy' | 'medium' | 'hard';

export function QuizPanel({
  videoId,
  video,
  onSeekToTime,
  onQuizLoaded,
}: QuizPanelProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [modelSource, setModelSource] = useState<string>('');

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('all');
  const [hasSavedAttempt, setHasSavedAttempt] = useState<boolean>(false);
  const savedAttemptKeyRef = useRef<string | null>(null);

  const { user, saveQuizAttempt } = useAuth();

  const questions: QuizQuestion[] = useMemo(() => quiz?.questions || [], [quiz]);
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  const fetchQuiz = useCallback(
    async (forceRegenerate = false, targetDifficulty: QuizDifficulty = difficulty) => {
      if (!videoId) return;

      if (forceRegenerate) {
        setIsRegenerating(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const res = await fetch(`/api/video/${videoId}/quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            forceRegenerate,
            difficulty: targetDifficulty,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to load dynamic quiz (${res.status})`);
        }

        const data = await res.json();
        setQuiz(data.quiz);
        setModelSource(data.source === 'cache' ? 'Cached' : data.model || 'Gemini');

        // Reset quiz flow state
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setShowExplanation({});
        setShowHint({});
        setIsQuizCompleted(false);
        setHasSavedAttempt(false);
        savedAttemptKeyRef.current = null;

        if (onQuizLoaded && data.quiz?.questions) {
          onQuizLoaded(data.quiz.questions.length);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to generate quiz';
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRegenerating(false);
      }
    },
    [videoId, difficulty, onQuizLoaded]
  );

  useEffect(() => {
    if (!isQuizCompleted || totalQuestions === 0 || !user) return;

    const answersKey = `${videoId}_${Object.entries(selectedAnswers)
      .sort()
      .map(([k, v]) => `${k}:${v}`)
      .join(',')}`;
    if (savedAttemptKeyRef.current === answersKey) return;
    savedAttemptKeyRef.current = answersKey;

    const calculatedScore = questions.reduce((acc, q, idx) => {
      return acc + (selectedAnswers[idx] === q.correctOptionIndex ? 1 : 0);
    }, 0);
    const calculatedPercentage = Math.round((calculatedScore / totalQuestions) * 100);

    const questionsSummary = questions.map((q, idx) => ({
      question: q.question,
      userAnswer: selectedAnswers[idx] !== undefined ? q.options[selectedAnswers[idx]] || '' : 'Unanswered',
      correctAnswer: q.options[q.correctOptionIndex] || '',
      correct: selectedAnswers[idx] === q.correctOptionIndex,
      explanation: q.explanation || '',
      timestamp: q.timestamp || '',
      seconds: q.seconds || 0,
    }));

    saveQuizAttempt({
      videoId,
      videoTitle: video?.title || 'YouTube Video',
      videoChannel: video?.channel || 'YouTube Creator',
      videoThumbnail: video?.thumbnail || '',
      score: calculatedScore,
      totalQuestions,
      percentage: calculatedPercentage,
      difficulty,
      questionsSummary,
    }).then((id) => {
      if (id) {
        setHasSavedAttempt(true);
      }
    });
  }, [isQuizCompleted, totalQuestions, user, videoId, video, selectedAnswers, questions, difficulty, saveQuizAttempt]);

  useEffect(() => {
    let isMounted = true;
    async function loadInitialQuiz() {
      if (!videoId) return;
      try {
        const res = await fetch(`/api/video/${videoId}/quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            forceRegenerate: false,
            difficulty: 'all',
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to load dynamic quiz (${res.status})`);
        }

        const data = await res.json();
        if (isMounted) {
          setQuiz(data.quiz);
          setModelSource(data.source === 'cache' ? 'Cached' : data.model || 'Gemini');
          if (onQuizLoaded && data.quiz?.questions) {
            onQuizLoaded(data.quiz.questions.length);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to generate quiz';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialQuiz();
    return () => {
      isMounted = false;
    };
  }, [videoId, onQuizLoaded]);

  const handleSelectOption = (optionIndex: number) => {
    if (selectedAnswers[currentQuestionIndex] !== undefined) {
      // Already answered this question
      return;
    }

    const updated = {
      ...selectedAnswers,
      [currentQuestionIndex]: optionIndex,
    };
    setSelectedAnswers(updated);
    setShowExplanation((prev) => ({ ...prev, [currentQuestionIndex]: true }));

    // If all questions are answered, mark quiz as completed
    if (Object.keys(updated).length === totalQuestions) {
      setTimeout(() => {
        setIsQuizCompleted(true);
      }, 1200);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowExplanation({});
    setShowHint({});
    setIsQuizCompleted(false);
    setHasSavedAttempt(false);
    savedAttemptKeyRef.current = null;
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctOptionIndex) {
        score++;
      }
    });
    return score;
  };

  const score = calculateScore();
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  return (
    <div id="quiz-panel-container" className="flex-1 flex flex-col h-full w-full overflow-hidden bg-white dark:bg-zinc-900">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center scrollbar-thin">
        <div className="max-w-3xl w-full flex-1 flex flex-col justify-between">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2.5 my-auto">
            <div className="w-10 h-10 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center animate-pulse">
              <BrainCircuit className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Generating Quiz...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mb-3">
              <XCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              Could not load quiz
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
              {error}
            </p>
            <button
              type="button"
              onClick={() => fetchQuiz(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : isQuizCompleted ? (
          /* Quiz Results View - Professional Learning Analytics & Review */
          <div className="flex-1 flex flex-col py-4 px-1 sm:px-4 max-w-2xl mx-auto w-full animate-in fade-in zoom-in-95 duration-200">
            {/* Header Result Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-800/80 dark:to-zinc-900 border border-zinc-200/90 dark:border-zinc-700/80 p-6 mb-5 shadow-xs text-center">
              {/* Radial Accuracy Ring */}
              <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Track */}
                  <path
                    className="text-zinc-200 dark:text-zinc-700"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Progress Fill */}
                  <path
                    className={`${
                      percentage >= 80
                        ? 'text-emerald-500'
                        : percentage >= 60
                        ? 'text-blue-500'
                        : 'text-amber-500'
                    } transition-all duration-1000 ease-out`}
                    strokeDasharray={`${percentage}, 100`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                    {percentage}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-400">
                    Score
                  </span>
                </div>
              </div>

              <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">
                {percentage === 100
                  ? 'Flawless Mastery!'
                  : percentage >= 80
                  ? 'Strong Comprehension!'
                  : percentage >= 60
                  ? 'Good Progress!'
                  : 'Review & Strengthen'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-5">
                {percentage >= 80
                  ? 'You demonstrated comprehensive understanding of this video’s core concepts.'
                  : percentage >= 60
                  ? 'Solid foundation! Review the missed questions below to solidify full retention.'
                  : 'Key concepts need reinforcement. Re-watch target timestamp clips below to master the material.'}
              </p>

              {/* Stat Pills */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-md mx-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="p-2.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/60">
                  <span className="block text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {score} / {totalQuestions}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                    Correct Answers
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/60">
                  <span
                    className={`block text-base font-bold ${
                      percentage >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : percentage >= 60
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {percentage >= 80 ? 'Mastery' : percentage >= 60 ? 'Proficient' : 'Learning'}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                    Performance Tier
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/60">
                  <span className="block text-base font-bold capitalize text-zinc-900 dark:text-zinc-100">
                    {difficulty}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                    Difficulty Level
                  </span>
                </div>
              </div>
            </div>

            {/* Saved to Profile & Quiz History status */}
            {user && (
              <div className="flex items-center justify-between w-full mb-4 px-3.5 py-2 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-medium truncate">
                    {hasSavedAttempt ? 'Saved to your Quiz History & Analytics' : 'Saving results to history...'}
                  </span>
                </div>
                <a
                  href="/quiz-history"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200 underline underline-offset-2 shrink-0 ml-2"
                >
                  <span>View Analytics</span>
                  <span>&rarr;</span>
                </a>
              </div>
            )}

            {/* Detailed Question Review List */}
            <div className="w-full space-y-3 mb-6 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 px-1">
                <span>Detailed Question Review</span>
                <span className="text-[11px] font-normal text-zinc-400">
                  {score} of {totalQuestions} correct
                </span>
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => {
                  const userAnswerIndex = selectedAnswers[idx];
                  const isCorrect = userAnswerIndex === q.correctOptionIndex;
                  const userAnswerText =
                    userAnswerIndex !== undefined ? q.options[userAnswerIndex] : 'Not answered';
                  const correctAnswerText = q.options[q.correctOptionIndex];

                  return (
                    <div
                      key={q.id || idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCorrect
                          ? 'bg-white dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800'
                          : 'bg-red-50/30 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40'
                      }`}
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-2.5 mb-2.5">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          {isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          )}
                          <div className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                            <span className="text-zinc-400 mr-1.5">Q{idx + 1}.</span>
                            <MarkdownRenderer content={q.question} onSeekToTime={onSeekToTime} inline />
                          </div>
                        </div>

                        {q.seconds !== undefined && onSeekToTime && (
                          <button
                            type="button"
                            onClick={() => onSeekToTime(q.seconds!)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 text-[10px] font-mono font-medium transition-colors cursor-pointer shrink-0 border border-zinc-200/60 dark:border-zinc-700/60"
                            title={`Jump to video at ${q.timestamp}`}
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>{q.timestamp || '0:00'}</span>
                          </button>
                        )}
                      </div>

                      {/* Answers Comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2.5">
                        <div
                          className={`p-2.5 rounded-xl border ${
                            isCorrect
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                              : 'bg-red-50/60 dark:bg-red-950/30 border-red-200/60 dark:border-red-800/40 text-red-900 dark:text-red-200'
                          }`}
                        >
                          <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-1">
                            Your Selection:
                          </span>
                          <MarkdownRenderer content={userAnswerText} onSeekToTime={onSeekToTime} inline />
                        </div>

                        {!isCorrect && (
                          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200">
                            <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-1">
                              Correct Answer:
                            </span>
                            <MarkdownRenderer content={correctAnswerText} onSeekToTime={onSeekToTime} inline />
                          </div>
                        )}
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/50 text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 block text-[11px]">
                            Explanation:
                          </span>
                          <MarkdownRenderer content={q.explanation} onSeekToTime={onSeekToTime} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sticky bottom-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md pt-3 pb-1 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleRestartQuiz}
                className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake This Quiz</span>
              </button>
              <button
                type="button"
                onClick={() => fetchQuiz(true)}
                className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate New Questions</span>
              </button>
            </div>
          </div>
        ) : currentQuestion ? (
          /* Active Question View */
          <div className="flex-1 flex flex-col justify-between">
            <div>
              {/* Question progress & timestamp tag & actions */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 tracking-wider uppercase whitespace-nowrap">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </span>
                  {currentQuestion.difficulty && (
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hidden xs:inline">
                      {currentQuestion.difficulty}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {currentQuestion.seconds !== undefined && onSeekToTime && (
                    <button
                      type="button"
                      onClick={() => onSeekToTime(currentQuestion.seconds!)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-[10px] font-mono font-medium transition-colors cursor-pointer"
                      title={`Jump video to timestamp ${currentQuestion.timestamp}`}
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{currentQuestion.timestamp || '0:00'}</span>
                    </button>
                  )}

                  {/* Difficulty selector */}
                  <select
                    aria-label="Quiz Difficulty"
                    value={difficulty}
                    onChange={(e) => {
                      const newDiff = e.target.value as QuizDifficulty;
                      setDifficulty(newDiff);
                      fetchQuiz(true, newDiff);
                    }}
                    disabled={isLoading || isRegenerating}
                    className="text-[11px] font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                  >
                    <option value="all">Balanced</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Challenging</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => fetchQuiz(true)}
                    disabled={isLoading || isRegenerating}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
                    title="Generate a fresh dynamic quiz"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin text-red-500' : ''}`} />
                    <span className="hidden sm:inline">New Quiz</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                />
              </div>

              {/* Question Text */}
              <div className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug mb-4">
                <MarkdownRenderer content={currentQuestion.question} onSeekToTime={onSeekToTime} inline />
              </div>

              {/* Options Grid */}
              <div className="space-y-2 mb-4">
                {currentQuestion.options.map((option, optIdx) => {
                  const hasAnswered = selectedAnswers[currentQuestionIndex] !== undefined;
                  const isSelected = selectedAnswers[currentQuestionIndex] === optIdx;
                  const isCorrect = optIdx === currentQuestion.correctOptionIndex;

                  let styleClass =
                    'border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200';

                  if (hasAnswered) {
                    if (isCorrect) {
                      styleClass =
                        'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500/50';
                    } else if (isSelected) {
                      styleClass =
                        'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-semibold ring-1 ring-red-500/50';
                    } else {
                      styleClass =
                        'opacity-50 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(optIdx)}
                      disabled={hasAnswered}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${styleClass}`}
                    >
                      <span
                        className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5 ${
                          hasAnswered && isCorrect
                            ? 'bg-emerald-600 text-white'
                            : hasAnswered && isSelected
                            ? 'bg-red-600 text-white'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <div className="flex-1 text-xs sm:text-sm leading-relaxed">
                        <MarkdownRenderer content={option} onSeekToTime={onSeekToTime} inline />
                      </div>
                      {hasAnswered && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      {hasAnswered && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Hint toggle if question not answered yet */}
              {selectedAnswers[currentQuestionIndex] === undefined && currentQuestion.hint && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowHint((prev) => ({
                        ...prev,
                        [currentQuestionIndex]: !prev[currentQuestionIndex],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showHint[currentQuestionIndex] ? 'Hide Hint' : 'Need a hint?'}</span>
                  </button>

                  {showHint[currentQuestionIndex] && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs">
                      <span className="font-semibold mr-1">Hint:</span>
                      <MarkdownRenderer content={currentQuestion.hint} onSeekToTime={onSeekToTime} inline />
                    </div>
                  )}
                </div>
              )}

              {/* Explanation card when answered */}
              {showExplanation[currentQuestionIndex] && currentQuestion.explanation && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
                    <Sparkles className="w-3.5 h-3.5 text-red-500" />
                    <span>Explanation:</span>
                  </div>
                  <MarkdownRenderer content={currentQuestion.explanation} onSeekToTime={onSeekToTime} />
                </div>
              )}
            </div>

            {/* Bottom Navigation (Next / Prev / Finish) */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 mt-4">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {questions.map((_, i) => {
                  const answered = selectedAnswers[i] !== undefined;
                  const isCurrent = currentQuestionIndex === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(i)}
                      aria-label={`Jump to question ${i + 1}`}
                      className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                        isCurrent
                          ? 'w-5 bg-red-600'
                          : answered
                          ? 'bg-zinc-400 dark:bg-zinc-600'
                          : 'bg-zinc-200 dark:bg-zinc-800'
                      }`}
                    />
                  );
                })}
              </div>

              {currentQuestionIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsQuizCompleted(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>See Results</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-3 border border-red-200 dark:border-red-900/50 shadow-2xs">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Quiz
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
              Test your understanding of key insights from this video.
            </p>
            <button
              type="button"
              onClick={() => fetchQuiz(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Quiz</span>
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default QuizPanel;
