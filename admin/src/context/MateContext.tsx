import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { sendMessage, ChatMessage } from '../api/assistant';

interface MateContextValue {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  submitMessage: (text: string) => Promise<void>;
  clearHistory: () => void;
}

const MateContext = createContext<MateContextValue | null>(null);

export function MateProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const submitMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMessage: ChatMessage = { role: 'user', content: trimmed };
      const next = [...messages, userMessage];

      setMessages(next);
      setError(null);
      setLoading(true);

      try {
        const reply = await sendMessage(next);
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        setError(e.response?.data?.message ?? e.message ?? 'Something went wrong');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, loading],
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <MateContext.Provider
      value={{ messages, loading, error, isOpen, setOpen: setIsOpen, submitMessage, clearHistory }}
    >
      {children}
    </MateContext.Provider>
  );
}

export function useMate() {
  const ctx = useContext(MateContext);
  if (!ctx) throw new Error('useMate must be used within MateProvider');
  return ctx;
}
