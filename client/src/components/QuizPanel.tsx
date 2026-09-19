'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { VideoItem, QuizData, QuizQuestion } from '@/types/video';
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

  const questions: QuizQuestion[] = quiz?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

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
    <div id="quiz-panel-container" className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-900">
      {/* Top Controls Header */}
      <div className="px-3.5 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <BrainCircuit className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              Dynamic Quiz
            </h3>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
              {modelSource ? `Engine: ${modelSource}` : 'Interactive Comprehension Test'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
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
            className="text-[11px] font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
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
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Generate a fresh dynamic quiz"
          >
            <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin text-red-500' : ''}`} />
            <span className="hidden sm:inline">New Quiz</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col justify-between">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center animate-pulse">
                <BrainCircuit className="w-6 h-6 animate-bounce" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Generating Dynamic Quiz...
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
                Gemini is analyzing the key concepts, timecodes, and arguments to formulate deep comprehension questions.
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
          /* Quiz Results View */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4 px-2 max-w-md mx-auto w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 ring-8 ring-amber-500/5">
              <Trophy className="w-8 h-8" />
            </div>

            <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Quiz Completed!
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
              {percentage >= 80
                ? 'Outstanding mastery of this video’s core concepts!'
                : percentage >= 60
                ? 'Good work! Review missed sections with timestamp links below.'
                : 'Keep learning! Re-watch key timestamps to strengthen your understanding.'}
            </p>

            {/* Score Ring / Card */}
            <div className="w-full bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-700/80 mb-5">
              <div className="flex items-center justify-around">
                <div>
                  <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                    {score}/{totalQuestions}
                  </span>
                  <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-0.5">
                    Correct Answers
                  </span>
                </div>
                <div className="h-10 w-px bg-zinc-200 dark:bg-zinc-700" />
                <div>
                  <span
                    className={`text-3xl font-black ${
                      percentage >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : percentage >= 50
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {percentage}%
                  </span>
                  <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-0.5">
                    Accuracy
                  </span>
                </div>
              </div>
            </div>

            {/* Summary breakdown of questions */}
            <div className="w-full space-y-2 mb-6 text-left max-h-48 overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isCorrect = selectedAnswers[idx] === q.correctOptionIndex;
                return (
                  <div
                    key={q.id}
                    className="p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        {isCorrect ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                        )}
                        <span className="text-xs font-medium text-zinc-900 dark:text-zinc-200 truncate">
                          Q{idx + 1}: {q.question}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                        Correct: {q.options[q.correctOptionIndex]}
                      </p>
                    </div>

                    {q.seconds !== undefined && onSeekToTime && (
                      <button
                        type="button"
                        onClick={() => onSeekToTime(q.seconds!)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-[10px] font-mono font-medium cursor-pointer shrink-0"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>{q.timestamp || '0:00'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2.5 w-full">
              <button
                type="button"
                onClick={handleRestartQuiz}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Quiz</span>
              </button>
              <button
                type="button"
                onClick={() => fetchQuiz(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>New Questions</span>
              </button>
            </div>
          </div>
        ) : currentQuestion ? (
          /* Active Question View */
          <div className="flex-1 flex flex-col justify-between">
            <div>
              {/* Question progress & timestamp tag */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 tracking-wider uppercase">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </span>
                  {currentQuestion.difficulty && (
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {currentQuestion.difficulty}
                    </span>
                  )}
                </div>

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
        ) : null}
      </div>
    </div>
  );
}

export default QuizPanel;
