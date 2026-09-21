'use client';

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { SavedQuizAttempt } from '@/contexts/AuthContext';

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

interface QuizPerformanceChartProps {
  quizzes: SavedQuizAttempt[];
  overallAccuracy: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-xl bg-zinc-900/95 dark:bg-zinc-900/95 text-white border border-zinc-700/60 p-2.5 sm:p-3 shadow-xl backdrop-blur-md text-[11px] sm:text-xs w-48 sm:w-56 max-w-[calc(100vw-64px)] space-y-1 sm:space-y-1.5 z-50 pointer-events-none select-none">
      <div className="flex items-center justify-between gap-1.5 border-b border-zinc-800 pb-1">
        <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-zinc-400 truncate">
          Quiz #{data.attemptIndex} • {data.dateLabel}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold shrink-0 ${
            data.percentage >= 80
              ? 'bg-emerald-500/20 text-emerald-400'
              : data.percentage >= 60
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {data.percentage}%
        </span>
      </div>

      <div
        className="font-semibold text-zinc-100 text-[11px] sm:text-xs truncate block w-full"
        title={data.videoTitle}
      >
        {data.videoTitle}
      </div>

      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-400 pt-0.5">
        <span>Score:</span>
        <span className="font-mono text-zinc-200 font-medium">
          {data.score} / {data.totalQuestions}
        </span>
      </div>

      {data.movingAverage !== undefined && (
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-400">
          <span>Running Avg:</span>
          <span className="font-mono text-zinc-200 font-semibold">{data.movingAverage}%</span>
        </div>
      )}
    </div>
  );
}

export function QuizPerformanceChart({ quizzes, overallAccuracy }: QuizPerformanceChartProps) {
  const isClient = useIsClient();
  const [selectedRange, setSelectedRange] = useState<'all' | '10' | '5'>('all');

  // Sort chronological from oldest to newest to show trajectory over time
  const chronologicalData = useMemo(() => {
    if (!quizzes || quizzes.length === 0) return [];

    const sorted = [...quizzes].sort((a, b) => {
      const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.createdAt || 0).getTime();
      const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    let cumulativeScore = 0;
    let cumulativeQuestions = 0;

    return sorted.map((q, idx) => {
      cumulativeScore += q.score;
      cumulativeQuestions += q.totalQuestions;
      const runningAvg =
        cumulativeQuestions > 0 ? Math.round((cumulativeScore / cumulativeQuestions) * 100) : q.percentage;

      const dateObj = q.timestamp
        ? new Date(typeof q.timestamp === 'number' ? q.timestamp : q.timestamp)
        : q.createdAt
        ? new Date(q.createdAt)
        : new Date();

      const dateLabel = isNaN(dateObj.getTime())
        ? `Q${idx + 1}`
        : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      return {
        attemptIndex: idx + 1,
        dateLabel,
        percentage: q.percentage,
        movingAverage: runningAvg,
        score: q.score,
        totalQuestions: q.totalQuestions,
        scoreFraction: `${q.score}/${q.totalQuestions}`,
        videoTitle: q.videoTitle || 'Quiz',
        difficulty: q.difficulty || 'balanced',
      };
    });
  }, [quizzes]);

  const displayData = useMemo(() => {
    if (selectedRange === '5') {
      return chronologicalData.slice(-5);
    }
    if (selectedRange === '10') {
      return chronologicalData.slice(-10);
    }
    return chronologicalData;
  }, [chronologicalData, selectedRange]);

  const trajectoryStats = useMemo(() => {
    if (chronologicalData.length === 0) return { delta: 0, trend: 'neutral' as const };
    if (chronologicalData.length === 1) return { delta: 0, trend: 'single' as const };

    const firstScore = chronologicalData[0].percentage;
    const latestScore = chronologicalData[chronologicalData.length - 1].percentage;
    const delta = latestScore - firstScore;

    return {
      delta,
      trend: delta > 0 ? ('up' as const) : delta < 0 ? ('down' as const) : ('flat' as const),
    };
  }, [chronologicalData]);

  if (!quizzes || quizzes.length === 0) return null;

  return (
    <div
      id="quiz-performance-chart-card"
      className="rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 p-4 sm:p-6 shadow-xs relative overflow-hidden space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                Performance Over Time
              </h3>
              {trajectoryStats.trend === 'up' && (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3" />
                  <span>+{trajectoryStats.delta}% trajectory</span>
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate sm:whitespace-normal">
              Tracking accuracy across {quizzes.length} completed session{quizzes.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Range controls */}
        {chronologicalData.length > 5 && (
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl self-start sm:self-auto text-xs font-medium w-full sm:w-auto justify-stretch sm:justify-start">
            <button
              type="button"
              onClick={() => setSelectedRange('all')}
              className={`flex-1 sm:flex-initial text-center px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedRange === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              All ({chronologicalData.length})
            </button>
            {chronologicalData.length >= 10 && (
              <button
                type="button"
                onClick={() => setSelectedRange('10')}
                className={`flex-1 sm:flex-initial text-center px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedRange === '10'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Last 10
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedRange('5')}
              className={`flex-1 sm:flex-initial text-center px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                selectedRange === '5'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Last 5
            </button>
          </div>
        )}
      </div>

      {/* Chart Canvas Area */}
      <div className="w-full h-56 sm:h-72 relative pt-1 sm:pt-2">
        {!isClient ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
            Rendering performance chart...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 12, right: 12, left: -20, bottom: 4 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="averageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#71717a"
                strokeOpacity={0.18}
              />

              <XAxis
                dataKey="attemptIndex"
                tickLine={false}
                axisLine={{ stroke: '#71717a', strokeOpacity: 0.2 }}
                tick={({ x, y, payload }) => {
                  const entry = displayData.find((d) => d.attemptIndex === payload.value);
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={0}
                        y={14}
                        textAnchor="middle"
                        fill="currentColor"
                        className="text-[10px] font-mono fill-zinc-400 dark:fill-zinc-500"
                      >
                        #{payload.value}
                      </text>
                      {entry?.dateLabel && (
                        <text
                          x={0}
                          y={26}
                          textAnchor="middle"
                          fill="currentColor"
                          className="text-[9px] fill-zinc-400 dark:fill-zinc-500 hidden sm:block"
                        >
                          {entry.dateLabel}
                        </text>
                      )}
                    </g>
                  );
                }}
                height={32}
              />

              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9, fill: '#71717a' }}
                tickFormatter={(val) => `${val}%`}
              />

              <Tooltip
                content={<CustomChartTooltip />}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ outline: 'none', zIndex: 50, pointerEvents: 'none' }}
              />

              {/* Target Passing Line */}
              <ReferenceLine
                y={70}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: 'Pass 70%',
                  position: 'insideTopRight',
                  fill: '#10b981',
                  fontSize: 9,
                  opacity: 0.8,
                }}
              />

              {/* Running Cumulative Average */}
              <Area
                type="monotone"
                dataKey="movingAverage"
                name="Running Average"
                stroke="#3b82f6"
                strokeWidth={1.75}
                strokeDasharray="3 3"
                fillOpacity={1}
                fill="url(#averageGradient)"
                dot={false}
              />

              {/* Primary Quiz Score Area */}
              <Area
                type="monotone"
                dataKey="percentage"
                name="Quiz Score"
                stroke="#dc2626"
                strokeWidth={2.25}
                fillOpacity={1}
                fill="url(#scoreGradient)"
                dot={{
                  r: 3.5,
                  strokeWidth: 1.5,
                  stroke: '#dc2626',
                  fill: '#ffffff',
                }}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: '#ffffff',
                  fill: '#dc2626',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend & Key Takeaway */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">Session Score</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-blue-500 inline-block shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">Running Avg</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-emerald-500 inline-block shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">Passing (70%)</span>
          </div>
        </div>

        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Avg Accuracy:{' '}
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{overallAccuracy}%</span>
        </div>
      </div>
    </div>
  );
}
