export default function Footer() {
  return (
    <footer className="border-t py-10 px-6" style={{ borderColor: 'var(--color-border)' }}>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Paymat
        </span>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          © {new Date().getFullYear()} Paymat. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <a
            href="mailto:hello@cliqpaymat.app"
            className="text-sm transition-colors"
            style={{ color: 'var(--color-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
          >
            Contact
          </a>
          <a
            href="/privacy"
            className="text-sm transition-colors"
            style={{ color: 'var(--color-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
          >
            Privacy
          </a>
          <a
            href="/terms"
            className="text-sm transition-colors"
            style={{ color: 'var(--color-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
          >
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
