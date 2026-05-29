import { useRef, useEffect, KeyboardEvent } from 'react';
import { Bot, X, Send, Maximize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useMate } from '../../context/MateContext';
import { cn } from '../../lib/utils';
import type { ChatMessage } from '../../api/assistant';

function BubbleMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs',
          isUser
            ? 'bg-indigo-600 text-white font-bold'
            : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300',
        )}
      >
        {isUser ? 'U' : <Bot className="h-3 w-3" />}
      </div>
      <div
        className={cn(
          'rounded-xl px-3 py-2 text-xs break-words max-w-[85%]',
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm whitespace-pre-wrap'
            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-tl-sm',
        )}
      >
        {isUser ? (
          message.content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="mb-1 pl-3 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="mb-1 pl-3 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              code: ({ children }) => (
                <code className="bg-gray-100 dark:bg-gray-600 rounded px-0.5 font-mono">
                  {children}
                </code>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export function MateBubble() {
  const { messages, loading, error, isOpen, setOpen, submitMessage } = useMate();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  async function handleSubmit() {
    const text = inputRef.current?.value.trim();
    if (!text || loading) return;
    inputRef.current!.value = '';
    inputRef.current!.style.height = 'auto';
    await submitMessage(text);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl flex items-center justify-center transition-colors"
          aria-label="Open Mate"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          style={{ maxHeight: 'min(520px, calc(100vh - 5rem))' }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="text-sm font-semibold">Mate</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Link
                to="/assistant"
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-indigo-500 rounded-lg transition-colors"
                title="Open full view"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-500 pt-6">
                Ask about invoices, payments, contacts, or take a billing action.
              </p>
            )}
            {messages.map((msg, i) => (
              <BubbleMessage key={i} message={msg} />
            ))}
            {loading && (
              <div className="flex gap-2 items-center">
                <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3 w-3 text-gray-500" />
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2">
                  <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            {error && (
              <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus-within:border-indigo-400 transition-colors">
              <textarea
                ref={inputRef}
                rows={1}
                onKeyDown={handleKeyDown}
                onChange={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                }}
                placeholder="Ask anything…"
                disabled={loading}
                className="flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none disabled:opacity-50 py-0.5 max-h-20"
              />
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="h-7 w-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
