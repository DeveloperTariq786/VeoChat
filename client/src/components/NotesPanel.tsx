'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Download,
  Code,
  Eye,
  RotateCw,
  Play,
  CheckCircle2,
  AlertCircle,
  Terminal,
} from 'lucide-react';
import { NotesData, VideoItem } from '@/types/video';
import { MarkdownRenderer } from './MarkdownRenderer';

interface NotesPanelProps {
  videoId: string;
  video: VideoItem | null;
  onSeekToTime: (seconds: number) => void;
  onNotesLoaded?: (hasNotes: boolean) => void;
}

/**
 * Strips accidental triple-backtick wrappers from model responses
 */
function cleanMarkdownContent(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  if (cleaned.startsWith('```markdown')) {
    cleaned = cleaned.replace(/^```markdown\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```md')) {
    cleaned = cleaned.replace(/^```md\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

export function NotesPanel({
  videoId,
  video,
  onSeekToTime,
  onNotesLoaded,
}: NotesPanelProps) {
  const [notes, setNotes] = useState<NotesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'code'>('rendered');
  const [editableMarkdown, setEditableMarkdown] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-fetch cached notes on mount if available
  useEffect(() => {
    let isMounted = true;
    async function loadCachedNotes() {
      try {
        const res = await fetch(`/api/video/${videoId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceRegenerate: false }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.notes) {
            setNotes(data.notes);
            setEditableMarkdown(cleanMarkdownContent(data.notes.markdown || ''));
            onNotesLoaded?.(true);
          }
        }
      } catch (err) {
        console.debug('No cached notes yet', err);
      }
    }
    loadCachedNotes();
    return () => {
      isMounted = false;
    };
  }, [videoId, onNotesLoaded]);

  const handleGenerateNotes = async (force: boolean = false) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/video/${videoId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate: force }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      if (!data.notes) {
        throw new Error('No notes returned from service');
      }

      setNotes(data.notes);
      setEditableMarkdown(cleanMarkdownContent(data.notes.markdown || ''));
      setViewMode('rendered');
      onNotesLoaded?.(true);
    } catch (err) {
      console.error('Notes generation error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to generate study notes.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMarkdown = () => {
    const fullContent = editableMarkdown || cleanMarkdownContent(notes?.markdown || '');
    navigator.clipboard.writeText(fullContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const fullContent = editableMarkdown || cleanMarkdownContent(notes?.markdown || '');
    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(video?.title || 'video-notes')
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="notes-panel-root" className="flex flex-col h-full w-full">
      {/* Top Action Controls */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 text-xs">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {notes ? 'Study Notes' : 'Structured Notes'}
          </span>
          {notes && (
            <span className="text-[10px] text-zinc-400 hidden xs:inline">
              &bull; Markdown Grounded
            </span>
          )}
        </div>

        {notes && (
          <div className="flex items-center gap-1">
            {/* View Mode Toggle: Rendered vs Raw Markdown Code */}
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80">
              <button
                type="button"
                onClick={() => setViewMode('rendered')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  viewMode === 'rendered'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
                title="View formatted markdown rendering"
              >
                <Eye className="w-3 h-3" />
                <span>Rendered</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('code')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  viewMode === 'code'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
                title="View / edit raw markdown code"
              >
                <Code className="w-3 h-3" />
                <span>MD Code</span>
              </button>
            </div>

            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-[11px]"
              title="Copy markdown code"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-[11px]"
              title="Export as .md file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              type="button"
              onClick={() => handleGenerateNotes(true)}
              disabled={isLoading}
              className="flex items-center gap-1 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50 text-[11px]"
              title="Regenerate notes"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Regenerate</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {errorMessage && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Notes Generation Failed</p>
              <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => handleGenerateNotes(true)}
              className="px-2 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State: Prompt to Generate */}
        {!notes && !isLoading && (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-3.5 border border-red-200 dark:border-red-900/50 shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Generate Structured Study Notes
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mb-5 leading-relaxed">
              Synthesizes an executive summary, key definitions, timestamped takeaways, and complete markdown notes.
            </p>
            <button
              id="generate-notes-btn"
              type="button"
              onClick={() => handleGenerateNotes(false)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Notes with Gemini</span>
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-600 dark:text-red-400 mb-3" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              Synthesizing structured notes from video...
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
              Extracting core topics, timestamp anchors, and rendering comprehensive markdown notes.
            </p>
          </div>
        )}

        {/* Generated Notes Content */}
        {notes && !isLoading && (
          <div className="space-y-4 w-full">
            {/* Executive Summary Card */}
            {notes.summary && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Executive Summary</span>
                </div>
                <MarkdownRenderer
                  content={notes.summary}
                  onSeekToTime={onSeekToTime}
                  inline
                  className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"
                />
              </div>
            )}

            {/* Key Takeaways */}
            {notes.keyTakeaways && notes.keyTakeaways.length > 0 && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Key Takeaways
                </h4>
                <div className="space-y-1.5">
                  {notes.keyTakeaways.map((takeaway, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <MarkdownRenderer
                        content={takeaway}
                        onSeekToTime={onSeekToTime}
                        inline
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamp Highlights */}
            {notes.timestamps && notes.timestamps.length > 0 && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60">
                <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                  Key Moments & Chapters
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {notes.timestamps.map((ts, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSeekToTime(ts.seconds)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Play className="w-2.5 h-2.5 fill-current text-red-600 dark:text-red-400" />
                      <span className="font-mono font-semibold text-[11px]">{ts.time}</span>
                      <span className="text-zinc-400 dark:text-zinc-500">|</span>
                      <span>{ts.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Markdown View or Code Editor */}
            {viewMode === 'code' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
                  <span className="font-medium flex items-center gap-1">
                    <Terminal className="w-3 h-3" />
                    Markdown Source Code Editor
                  </span>
                  <span>Directly edit markdown syntax below</span>
                </div>
                <textarea
                  value={editableMarkdown}
                  onChange={(e) => setEditableMarkdown(e.target.value)}
                  rows={16}
                  className="w-full p-3.5 font-mono text-xs sm:text-sm bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 leading-relaxed scrollbar-thin"
                  placeholder="Enter markdown notes..."
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setViewMode('rendered')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Apply & Render View</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs">
                <MarkdownRenderer
                  content={editableMarkdown || cleanMarkdownContent(notes.markdown)}
                  onSeekToTime={onSeekToTime}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotesPanel;

