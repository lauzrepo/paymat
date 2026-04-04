import { useState } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'loading') return;

    setStatus('loading');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'https://api.cliqpaymat.app'}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error('Request failed');
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-medium"
        style={{
          color: 'var(--color-primary)',
          borderColor: 'rgba(99, 102, 241, 0.3)',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        You're on the list. We'll be in touch.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@yourbusiness.com"
        className="flex-1 px-4 py-3 rounded-xl text-sm outline-none border transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: status === 'error' ? '#ef4444' : 'var(--color-border)',
          color: 'var(--color-text)',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
        onBlur={e => (e.currentTarget.style.borderColor = status === 'error' ? '#ef4444' : 'var(--color-border)')}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
        style={{
          backgroundColor: status === 'loading' ? 'var(--color-primary-hover)' : 'var(--color-primary)',
          color: '#fff',
          opacity: status === 'loading' ? 0.7 : 1,
        }}
        onMouseEnter={e => { if (status !== 'loading') e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'; }}
        onMouseLeave={e => { if (status !== 'loading') e.currentTarget.style.backgroundColor = 'var(--color-primary)'; }}
      >
        {status === 'loading' ? 'Sending…' : 'Request access'}
      </button>
    </form>
  );
}
