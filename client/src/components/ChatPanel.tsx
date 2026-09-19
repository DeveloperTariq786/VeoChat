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
  onMessagesChange?: (messages: ChatMessage[]) => void;
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

  // Clean up any ongoing stream request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const setMessages = (update: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    const newMsgs = typeof update === 'function' ? update(messages) : update;
    if (onMessagesChange) {
      onMessagesChange(newMsgs);
    } else {
      setInternalMessages(newMsgs);
    }
    if (typeof window !== 'undefined' && videoId) {
      try {
        // Persist clean conversation (do not persist empty in-flight stubs)
        const toSave = newMsgs
          .filter((m) => !m.isStreaming || (m.content && m.content.trim().length > 0))
          .map((m) => ({
            ...m,
            isStreaming: false,
            statusMessage: undefined,
          }));

        if (toSave.length > 0) {
          sessionStorage.setItem(`askthevideo_chat_${videoId}`, JSON.stringify(toSave));
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
    } else {
      setInternalInputValue(val);
    }
  };

  const setIsLoading = (loading: boolean) => {
    if (onLoadingChange) {
      onLoadingChange(loading);
    } else {
      setInternalIsLoading(loading);
    }
  };

  // Scroll to bottom smoothly on new messages, tokens, or view expansion
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

  // Stop generating in-flight response
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.isStreaming) {
          return {
            ...m,
            isStreaming: false,
            statusMessage: undefined,
            followUpQuestions:
              m.content && m.content.length > 30 ? PRE_QUESTIONS : undefined,
          };
        }
        return m;
      })
    );
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue || lastQuery).trim();
    if (!query || isLoading) return;

    setErrorMessage(null);
    setLastQuery(query);
    setInputValue('');

    const userMessage = createChatMessage('user', query);
    const modelMsgId = `model-${Date.now()}-${nextMsgId++}`;

    // Create an in-flight streaming model message with Gemini-style indicator
    const streamingModelMessage: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      content: '',
      createdAt: Date.now(),
      isStreaming: true,
      statusMessage: 'Analyzing video context and multimodal speech...',
    };

    const newHistory = [...messages, userMessage];
    setMessages([...newHistory, streamingModelMessage]);
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let accumulatedContent = '';

    try {
      const res = await fetch(`/api/video/${videoId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          message: query,
          history: newHistory,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            const trimmed = block.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const jsonStr = trimmed.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === 'status') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === modelMsgId
                      ? { ...m, statusMessage: event.message || 'Thinking...' }
                      : m
                  )
                );
              } else if (event.type === 'delta') {
                accumulatedContent += event.text;
                const currentText = accumulatedContent;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === modelMsgId
                      ? {
                          ...m,
                          content: currentText,
                          isStreaming: true,
                          statusMessage: undefined,
                        }
                      : m
                  )
                );
              } else if (event.type === 'done') {
                const finalContent = event.fullText || accumulatedContent;
                const followUpQuestions: string[] = Array.isArray(event.followUpQuestions)
                  ? event.followUpQuestions
                  : [];

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === modelMsgId
                      ? {
                          ...m,
                          content: finalContent,
                          isStreaming: false,
                          statusMessage: undefined,
                          followUpQuestions,
                        }
                      : m
                  )
                );
              } else if (event.type === 'error') {
                throw new Error(event.error || 'Streaming error');
              }
            } catch (parseErr) {
              console.warn('Error parsing SSE chunk:', parseErr);
            }
          }
        }
      } else {
        // Fallback standard JSON response
        const data = await res.json();
        const followUpQuestions: string[] = Array.isArray(data.followUpQuestions)
          ? data.followUpQuestions
          : [];

        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMsgId
              ? {
                  ...m,
                  content: data.response || 'I analyzed the video but received an empty response.',
                  isStreaming: false,
                  statusMessage: undefined,
                  followUpQuestions,
                }
              : m
          )
        );
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream stopped by user');
        return;
      }
      console.error('Chat error:', err);
      const rawMsg = err instanceof Error ? err.message : 'Failed to connect to Gemini.';

      if (accumulatedContent.trim().length > 0) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMsgId
              ? {
                  ...m,
                  content: accumulatedContent,
                  isStreaming: false,
                  statusMessage: undefined,
                }
              : m
          )
        );
        setErrorMessage(`Response partially generated: ${rawMsg}`);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== modelMsgId));
        if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
          setErrorMessage('The model is experiencing peak demand. Click Retry to re-run.');
        } else {
          setErrorMessage(rawMsg);
        }
      }
    } finally {
      setIsLoading(false);
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
    setMessages([]);
    setErrorMessage(null);
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
          const isMsgStreaming = msg.isStreaming;

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
                {!isUser && !isMsgStreaming && (
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
                    {/* Gemini-Style Professional Status Header & Shimmer when generating */}
                    {isMsgStreaming && (
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-zinc-100 dark:border-zinc-700/60">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-linear-to-tr from-blue-500/15 via-purple-500/15 to-red-500/15 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse text-red-500" />
                          </div>
                          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100/90 dark:bg-zinc-750/90 border border-zinc-200/80 dark:border-zinc-700/80 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span>
                              {msg.statusMessage || (msg.content ? 'Streaming response...' : 'Analyzing video...')}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleStopGenerating}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 bg-zinc-100 dark:bg-zinc-750 hover:bg-red-50 dark:hover:bg-red-950/40 border border-zinc-200/80 dark:border-zinc-700 transition-colors cursor-pointer"
                          title="Stop streaming"
                        >
                          <Square className="w-2.5 h-2.5 fill-red-500 text-red-500" />
                          <span className="text-[11px]">Stop</span>
                        </button>
                      </div>
                    )}

                    {/* Gemini Thinking / Shimmer Bars when waiting for initial tokens */}
                    {isMsgStreaming && !msg.content ? (
                      <div className="space-y-2.5 py-1">
                        <div className="h-3.5 bg-linear-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-750 dark:via-zinc-700 dark:to-zinc-750 rounded-full w-4/5 animate-pulse" />
                        <div className="h-3.5 bg-linear-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-750 dark:via-zinc-700 dark:to-zinc-750 rounded-full w-3/5 animate-pulse delay-75" />
                        <div className="h-3.5 bg-linear-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-750 dark:via-zinc-700 dark:to-zinc-750 rounded-full w-2/3 animate-pulse delay-150" />
                      </div>
                    ) : (
                      <>
                        <MarkdownRenderer
                          content={msg.content}
                          onSeekToTime={onSeekToTime}
                        />
                        {/* Gemini-like blinking streaming cursor */}
                        {isMsgStreaming && (
                          <span className="inline-block w-2 h-4 ml-1 align-middle bg-red-500 dark:bg-red-400 rounded-xs animate-pulse" />
                        )}
                      </>
                    )}

                    {/* Interactive Follow-up Questions for this response */}
                    {!isMsgStreaming && msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
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

        {/* Fallback indicator if isLoading is true but no streaming message exists */}
        {isLoading && !messages.some((m) => m.isStreaming) && (
          <div className="flex items-center gap-2.5 p-3 bg-zinc-100/90 dark:bg-zinc-800/90 rounded-2xl w-fit border border-zinc-200/70 dark:border-zinc-700/70 text-xs text-zinc-700 dark:text-zinc-200 shadow-2xs">
            <Sparkles className="w-4 h-4 animate-pulse text-red-600 dark:text-red-400" />
            <span className="font-medium animate-pulse">
              Analyzing video and reasoning with Gemini...
            </span>
          </div>
        )}

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
              onClick={handleStopGenerating}
              className="absolute right-1.5 flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg transition-colors cursor-pointer text-xs shadow-2xs"
              title="Stop generating"
            >
              <Square className="w-3 h-3 fill-red-400 text-red-400" />
              <span className="font-medium text-[11px]">Stop</span>
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
