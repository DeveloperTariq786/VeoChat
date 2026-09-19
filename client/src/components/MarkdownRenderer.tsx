'use client';

import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
// Ensure mhchem is available for KaTeX chemistry formulas (\ce{...})
if (typeof window !== 'undefined') {
  try {
    require('katex/contrib/mhchem');
  } catch {
    // mhchem extension optional fallback
  }
}
import { Play, Copy, Check, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  onSeekToTime?: (seconds: number) => void;
  className?: string;
  inline?: boolean;
}

// Convert MM:SS or HH:MM:SS string to seconds
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.replace(/[^\d:]/g, '');
  const parts = clean.split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

/**
 * Preprocesses markdown text to ensure chemical equations and math formulas
 * (e.g. \(...\), \[...\], \ce{...}, $Mg^{2+}$, etc.) are formatted for remark-math & KaTeX.
 */
export function normalizeMathAndFormulas(text: string): string {
  if (!text) return '';

  let processed = text;

  // 1. Convert display math: \[ ... \] -> $$ ... $$
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`);

  // 2. Convert inline math: \( ... \) -> $ ... $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

  // 3. Auto-wrap raw chemical formula \ce{...} not already wrapped in $
  // Example: \ce{H2O} -> $\ce{H2O}$
  processed = processed.replace(/(^|[^\$])\\ce\{([^}]+)\}([^\$]|$)/g, '$1$\\ce{$2$}$3');

  return processed;
}

/**
 * Recursively parses children of markdown elements to detect timestamp patterns
 * like [02:15], (02:15), or standalone 02:15, turning them into interactive seek buttons.
 * Guarantees that interactive elements (buttons, links, code) AND KaTeX elements are preserved.
 */
export function renderChildrenWithTimestamps(
  children: React.ReactNode,
  onSeek?: (seconds: number) => void,
  insideInteractive: boolean = false
): React.ReactNode {
  if (!children || !onSeek) return children;

  if (typeof children === 'string') {
    if (insideInteractive) return children;

    const regex = /(\[?\b(?:[0-9]{1,2}:)?[0-5]?[0-9]:[0-5][0-9]\b\]?)/g;
    const parts = children.split(regex);
    if (parts.length === 1) return children;

    return parts.map((part, idx) => {
      const match = part.match(/\[?((?:[0-9]{1,2}:)?[0-5]?[0-9]:[0-5][0-9])\]?/);
      if (match) {
        const timeCode = match[1];
        const seconds = parseTimeToSeconds(timeCode);
        return (
          <button
            key={idx}
            type="button"
            data-timestamp-btn="true"
            onClick={(e) => {
              e.stopPropagation();
              onSeek(seconds);
            }}
            title={`Seek video to ${timeCode}`}
            className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/30 border border-red-500/25 transition-all cursor-pointer align-baseline select-none"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>{timeCode}</span>
          </button>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  }

  if (Array.isArray(children)) {
    return React.Children.map(children, (child) =>
      renderChildrenWithTimestamps(child, onSeek, insideInteractive)
    );
  }

  if (React.isValidElement(children)) {
    const element = children as React.ReactElement<Record<string, unknown>>;
    const className = typeof element.props?.className === 'string' ? element.props.className : '';
    
    // Do NOT alter KaTeX math/formula components or interactive elements
    const isProtected =
      className.includes('katex') ||
      className.includes('math') ||
      element.type === 'button' ||
      element.type === 'a' ||
      element.type === 'code' ||
      element.type === 'pre' ||
      Boolean(element.props?.['data-timestamp-btn']);

    if (isProtected || insideInteractive) {
      return children;
    }

    if (
      element.props &&
      typeof element.props === 'object' &&
      'children' in element.props
    ) {
      return React.cloneElement(element, {
        ...element.props,
        children: renderChildrenWithTimestamps(
          element.props.children as React.ReactNode,
          onSeek,
          false
        ),
      });
    }
  }

  return children;
}

function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const codeContent = String(children || '').replace(/\n$/, '');
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 text-xs font-mono shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5 font-medium">
          <Terminal className="w-3 h-3 text-red-400" />
          <span>{language || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto">
        <code>{codeContent}</code>
      </pre>
    </div>
  );
}

export function MarkdownRenderer({
  content,
  onSeekToTime,
  className = '',
  inline = false,
}: MarkdownRendererProps) {
  const normalized = normalizeMathAndFormulas(content);

  if (inline) {
    return (
      <span className={`inline-markdown align-baseline ${className}`}>
        <Markdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
          components={{
            p: ({ children }) => (
              <span className="inline">
                {renderChildrenWithTimestamps(children, onSeekToTime)}
              </span>
            ),
            code: ({ children }) => (
              <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-red-600 dark:text-red-400 font-mono text-[0.9em] border border-zinc-200/60 dark:border-zinc-700/60 font-medium">
                {children}
              </code>
            ),
          }}
        >
          {normalized}
        </Markdown>
      </span>
    );
  }

  return (
    <div className={`markdown-body text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={{
          p: ({ children }) => (
            <p className="leading-relaxed mb-3 last:mb-0">
              {renderChildrenWithTimestamps(children, onSeekToTime)}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-5 space-y-1.5 my-2.5 text-zinc-800 dark:text-zinc-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-5 space-y-1.5 my-2.5 text-zinc-800 dark:text-zinc-200">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">
              {renderChildrenWithTimestamps(children, onSeekToTime)}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-950 dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => (
            <h1 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white mt-4 mb-2 pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
              {renderChildrenWithTimestamps(children, onSeekToTime)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 mt-3.5 mb-1.5 pb-1 border-b border-zinc-100 dark:border-zinc-800">
              {renderChildrenWithTimestamps(children, onSeekToTime)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide mt-3 mb-1">
              {renderChildrenWithTimestamps(children, onSeekToTime)}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-red-500 pl-3 my-2.5 text-zinc-600 dark:text-zinc-400 italic text-xs sm:text-sm leading-relaxed">
              {renderChildrenWithTimestamps(children, onSeekToTime)}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-zinc-200 dark:border-zinc-800" />,
          code: ({ children, className }) => {
            const isBlock = Boolean(className && className.includes('language-'));
            if (isBlock) {
              return <CodeBlock className={className}>{children}</CodeBlock>;
            }
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-red-600 dark:text-red-400 font-mono text-[11px] sm:text-xs border border-zinc-200/60 dark:border-zinc-700/60 font-medium">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <div className="my-2">{children}</div>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="min-w-full text-xs divide-y divide-zinc-200 dark:divide-zinc-700">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 font-semibold text-left text-zinc-800 dark:text-zinc-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
              {renderChildrenWithTimestamps(children, onSeekToTime)}
            </td>
          ),
        }}
      >
        {normalized}
      </Markdown>
    </div>
  );
}

export default MarkdownRenderer;
