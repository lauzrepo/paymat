import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { Send, Bot, User, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { sendMessage, ChatMessage } from '../../api/assistant';

const SUGGESTIONS = [
  'Show me overdue invoices',
  'How much revenue have we collected this month?',
  'Find contact John Smith',
  'What are our outstanding invoices?',
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap break-words',
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-sm'
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        <Bot className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
      </div>
    </div>
  );
}

export function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function submit() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const next = [...messages, userMessage];

    setMessages(next);
    setInput('');
    setError(null);
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const reply = await sendMessage(next);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message ?? e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Payments Assistant</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Ask questions about invoices, payments, and revenue — or take billing actions.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center">
              <Bot className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-gray-900 dark:text-gray-100">How can I help you today?</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                I can look up invoices, payments, contacts, and more.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                  className="text-left text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {loading && <TypingIndicator />}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleFormSubmit} className="mt-2">
        <div className="flex items-end gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-2 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-colors shadow-sm">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your payments…"
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none disabled:opacity-50 py-1 max-h-40"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-8 w-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors flex-shrink-0 mb-0.5"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
