'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  Play,
  RotateCcw,
  Copy,
  Check,
  AlertCircle,
  Maximize2,
  Minimize2,
  MessageSquare,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Square,
  Clock,
} from 'lucide-react';
import { ChatMessage, VideoItem } from '@/types/video';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatPanelProps {
  videoId: string;
  video: VideoItem | null;
  onSeekToTime: (seconds: number) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  messages?: ChatMessage[];
  onMessagesChange?: React.Dispatch<React.SetStateAction<ChatMessage[]>> | ((messages: ChatMessage[]) => void);
  inputValue?: string;
  onInputChange?: (value: string) => void;
  isLoading?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

// Pre-configured questions requested by user
const PRE_QUESTIONS = [
  'Summarize the video',
  'Explain the video',
  'Summarize key idea with timestamp',
];

let nextMsgId = 1;
function createChatMessage(
  role: 'user' | 'model',
  content: string,
  followUpQuestions?: string[]
): ChatMessage {
  const id = `${role}-${Date.now()}-${nextMsgId++}`;
  return {
    id,
    role,
    content,
    createdAt: Date.now(),
    followUpQuestions,
  };
}

export function ChatPanel({
  videoId,
  video,
  onSeekToTime,
  isFullScreen = false,
  onToggleFullScreen,
  messages: controlledMessages,
  onMessagesChange,
  inputValue: controlledInputValue,
  onInputChange,
  isLoading: controlledIsLoading,
  onLoadingChange,
}: ChatPanelProps) {
  // Start with clean messages state or load from sessionStorage
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined' && videoId) {
      try {
        const saved = sessionStorage.getItem(`askthevideo_chat_${videoId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.warn('Failed to load chat from storage', e);
      }
    }
    return [];
  });
  const [internalInputValue, setInternalInputValue] = useState('');
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const [loadingStatusMessage, setLoadingStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>('');

  const messages = controlledMessages !== undefined ? controlledMessages : internalMessages;
  const inputValue = controlledInputValue !== undefined ? controlledInputValue : internalInputValue;
  const isLoading = controlledIsLoading !== undefined ? controlledIsLoading : internalIsLoading;

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const setMessages = (update: React.SetStateAction<ChatMessage[]>) => {
    if (onMessagesChange) {
      onMessagesChange(update);
    }
    setInternalMessages(update);
    // When uncontrolled, write to sessionStorage
    if (!onMessagesChange && typeof window !== 'undefined' && videoId) {
      try {
        const next = typeof update === 'function' ? update(messages) : update;
        if (next.length > 0) {
          sessionStorage.setItem(`askthevideo_chat_${videoId}`, JSON.stringify(next));
        } else {
          sessionStorage.removeItem(`askthevideo_chat_${videoId}`);
        }
      } catch (e) {
        console.warn('Failed to save chat to storage', e);
      }
    }
  };

  const setInputValue = (val: string) => {
    if (onInputChange) {
      onInputChange(val);
    }
    setInternalInputValue(val);
  };

  const setIsLoading = (loading: boolean) => {
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
    setInternalIsLoading(loading);
  };

  // Scroll to bottom smoothly on new messages or view expansion
  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      const timer = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [messages, isLoading, isFullScreen]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue || lastQuery).trim();
    if (!query || isLoading) return;

    // Abort any existing in-flight stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setErrorMessage(null);
    setLoadingStatusMessage(null);
    setLastQuery(query);
    setInputValue('');

    const userMessage = createChatMessage('user', query);
    const assistantMessage = createChatMessage('model', '');
    const assistantId = assistantMessage.id;

    const baseHistory = [...messages, userMessage];
    // Immediately display user message and empty model card so suggestions vanish and don't re-appear
    setMessages([...baseHistory, assistantMessage]);
    setIsLoading(true);

    let accumulatedText = '';

    try {
      const res = await fetch(`/api/video/${videoId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          message: query,
          history: baseHistory,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.status === 'fallback' && parsed.statusMessage) {
                setLoadingStatusMessage(parsed.statusMessage);
              }
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulatedText } : m
                  )
                );
              }
              if (parsed.done) {
                const followUps = Array.isArray(parsed.followUpQuestions)
                  ? parsed.followUpQuestions
                  : [];
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: accumulatedText || 'Completed video analysis.',
                          followUpQuestions: followUps,
                        }
                      : m
                  )
                );
              }
            } catch (jsonErr) {
              // Ignore non-json lines
            }
          }
        }
      } else {
        const data = await res.json();
        accumulatedText = data.response || 'I analyzed the video but received an empty response.';
        const followUps = Array.isArray(data.followUpQuestions) ? data.followUpQuestions : [];
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: accumulatedText,
                  followUpQuestions: followUps,
                }
              : m
          )
        );
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }

      console.error('Chat error:', err);
      const rawMsg = err instanceof Error ? err.message : 'Failed to connect to Gemini.';
      
      // If we already received partial content, keep it and add an explanatory note
      if (accumulatedText.trim().length > 0) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: accumulatedText + '\n\n*(Note: Generation paused due to network status)*',
                }
              : m
          )
        );
      } else {
        // Grounded fallback answer so assistant card is never blank
        const fallbackText = `I analyzed this video for: **"${query}"**.\n\nThe server connection experienced a momentary delay. Please click **Retry** below to regenerate the response.`;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fallbackText } : m
          )
        );
      }

      if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
        setErrorMessage('The model is experiencing peak demand. Click Retry to re-run.');
      } else {
        setErrorMessage(rawMsg);
      }
    } finally {
      setIsLoading(false);
      setLoadingStatusMessage(null);
      abortControllerRef.current = null;
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 100);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setErrorMessage(null);
    setLoadingStatusMessage(null);
  };

  const quickPrompts = PRE_QUESTIONS;

  return (
    <div id="chat-panel-root" className="flex flex-col h-full w-full">
      {/* Header bar with Expand Fullscreen and Clean Actions */}
      <div className="h-11 flex items-center justify-between px-3.5 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 text-xs shrink-0">
        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
            Video Chat
          </span>
          <span className="text-[11px] text-zinc-400 hidden xs:inline">
            &bull; Multimodal Grounded
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Expand Full Screen Toggle Button */}
          {onToggleFullScreen && (
            <button
              type="button"
              onClick={onToggleFullScreen}
              title={isFullScreen ? 'Exit full screen view' : 'Expand chat over video on full screen'}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-[11px] font-medium"
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Side-by-Side</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Full Screen</span>
                </>
              )}
            </button>
          )}

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              title="Reset conversation"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-[11px] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area - Full width with no halfway cutoff */}
      <div
        id="chat-messages-container"
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 scrollbar-thin"
      >
        {messages.length === 0 && (
          <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-4 sm:p-6 text-zinc-400 dark:text-zinc-500">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-500 dark:text-zinc-400 mb-2.5 border border-zinc-200/60 dark:border-zinc-700/60">
              <MessageSquare className="w-5 h-5 stroke-[1.75]" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Ask anything about this video
            </p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 max-w-sm mb-4">
              Responses cite exact moments with interactive seek timestamps.
            </p>

            {/* Quick pre-questions cards in empty state */}
            <div className="w-full max-w-md flex flex-col gap-2 text-left">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center mb-0.5">
                Quick Start Questions:
              </span>
              {PRE_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendMessage(q)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800/90 hover:bg-red-50/70 dark:hover:bg-red-950/40 border border-zinc-200 dark:border-zinc-700/80 hover:border-red-300 dark:hover:border-red-800 text-zinc-800 dark:text-zinc-200 hover:text-red-600 dark:hover:text-red-400 text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                >
                  <span className="font-medium">{q}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-500 transition-transform group-hover:translate-x-0.5 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`w-full flex flex-col ${isUser ? 'items-end' : 'items-stretch'}`}
            >
              <div
                className={`group relative text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'max-w-[85%] sm:max-w-[75%] bg-red-600 text-white rounded-2xl rounded-br-xs px-4 py-2.5 shadow-xs'
                    : 'w-full bg-white dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 sm:p-5 shadow-2xs'
                }`}
              >
                {!isUser && (
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(msg.id, msg.content)}
                    className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-all cursor-pointer"
                    title="Copy response"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {isUser ? (
                  <div className="leading-relaxed font-normal text-white">
                    <MarkdownRenderer
                      content={msg.content}
                      onSeekToTime={onSeekToTime}
                      inline
                      className="text-white"
                    />
                  </div>
                ) : (
                  <div className="w-full">
                    {!msg.content && isLoading ? (
                      <div className="py-1 space-y-2 text-xs">
                        <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-300">
                          <Loader2 className="w-4 h-4 animate-spin text-red-600 dark:text-red-400 shrink-0" />
                          <span className="font-medium animate-pulse">
                            Analyzing video speech & visuals...
                          </span>
                        </div>
                        {loadingStatusMessage && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>{loadingStatusMessage}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <MarkdownRenderer
                          content={msg.content}
                          onSeekToTime={onSeekToTime}
                        />
                        {isLoading && messages[messages.length - 1]?.id === msg.id && (
                          <span className="inline-block w-1.5 h-4 ml-1 bg-red-600 dark:bg-red-400 animate-pulse align-middle rounded-xs" />
                        )}
                      </>
                    )}

                    {/* Interactive Follow-up Questions for this response */}
                    {msg.followUpQuestions && msg.followUpQuestions.length > 0 && !isLoading && (
                      <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-700/80">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" />
                          <span>Follow-up questions related to the video:</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5">
                          {msg.followUpQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleSendMessage(q)}
                              className="text-left px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-750/70 hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-700 dark:text-zinc-200 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200/80 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-700 transition-all cursor-pointer flex items-center justify-between gap-2 group disabled:opacity-50"
                            >
                              <span>{q}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-500 transition-transform group-hover:translate-x-0.5 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {errorMessage && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to process message</p>
              <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => handleSendMessage(lastQuery)}
              className="px-2 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        id="chat-input-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="w-full h-[70px] px-3.5 sm:px-4 flex items-center border-t border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0"
      >
        <div className="relative flex items-center w-full">
          <input
            ref={inputRef}
            id="chat-message-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isLoading ? 'Generating response...' : 'Ask about video'}
            disabled={isLoading}
            className="w-full pl-3.5 pr-20 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 text-zinc-900 dark:text-white rounded-xl text-xs sm:text-sm border border-zinc-200/80 dark:border-zinc-700/80 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all placeholder:text-zinc-400"
          />
          {isLoading ? (
            <button
              id="chat-stop-btn"
              type="button"
              onClick={handleStopGeneration}
              className="absolute right-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-750 dark:hover:bg-zinc-650 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Stop generating"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              id="chat-send-btn"
              type="submit"
              disabled={!inputValue.trim()}
              className="absolute right-1.5 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default ChatPanel;
