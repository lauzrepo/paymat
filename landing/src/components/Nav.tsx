export default function Nav() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        backgroundColor: 'rgba(15, 15, 19, 0.85)',
        backdropFilter: 'blur(12px)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>
          Paymat
        </span>
        <a
          href="https://app.cliqpaymat.app"
          className="text-sm font-medium transition-colors"
          style={{ color: 'var(--color-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
        >
          Sign in
        </a>
      </div>
    </header>
  );
}
