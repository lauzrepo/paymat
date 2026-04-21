export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
            style={{ color: 'var(--color-text)' }}
          >
            Simple, transparent pricing
          </h2>
          <p className="text-base max-w-md mx-auto" style={{ color: 'var(--color-muted)' }}>
            No monthly fees during early access. You only pay when your members pay you.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Early Beta Card */}
          <div
            className="relative p-8 rounded-2xl border-2"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-primary)',
            }}
          >
            <div
              className="absolute -top-3 left-8 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
              Early Beta
            </div>

            <div className="mt-2 mb-6">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold" style={{ color: 'var(--color-text)' }}>
                  0.05%
                </span>
                <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  per transaction
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Locked in for life — never increases as long as your account is active.
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                'Unlimited members & enrollments',
                'Recurring billing on autopilot',
                'Branded member portal',
                'Direct payouts via Stripe Connect',
                'Family billing accounts',
                'Automatic invoices & receipts',
                'Email notifications',
                'Priority early-access support',
              ].map(feature => (
                <li key={feature} className="flex items-start gap-3 text-sm">
                  <span
                    className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span style={{ color: 'var(--color-text)' }}>{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href="#waitlist"
              onClick={e => {
                e.preventDefault();
                document.querySelector('#waitlist-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="block w-full text-center text-sm font-semibold py-3 px-6 rounded-xl transition-colors"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
            >
              Join early access
            </a>
            <p className="mt-3 text-xs text-center" style={{ color: 'var(--color-muted)' }}>
              Limited spots. No credit card required.
            </p>
          </div>

          {/* Standard Card */}
          <div
            className="p-8 rounded-2xl border"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-muted)' }}>
                Standard
              </p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold" style={{ color: 'var(--color-text)' }}>
                  1%
                </span>
                <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  per transaction
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                For organizations that join after early access closes.
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                'Unlimited members & enrollments',
                'Recurring billing on autopilot',
                'Branded member portal',
                'Direct payouts via Stripe Connect',
                'Family billing accounts',
                'Automatic invoices & receipts',
                'Email notifications',
                'Standard support',
              ].map(feature => (
                <li key={feature} className="flex items-start gap-3 text-sm">
                  <span
                    className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(113, 113, 122, 0.15)', color: 'var(--color-muted)' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span style={{ color: 'var(--color-muted)' }}>{feature}</span>
                </li>
              ))}
            </ul>

            <div
              className="block w-full text-center text-sm font-semibold py-3 px-6 rounded-xl border cursor-default"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-muted)',
              }}
            >
              Coming soon
            </div>
          </div>
        </div>

        {/* Stripe note */}
        <p className="text-center text-xs mt-10" style={{ color: 'var(--color-muted)' }}>
          Stripe processing fees (typically 2.9% + 30¢ per card transaction) are separate and billed by Stripe directly.
          Paymat's fee is charged on top of, and independently from, Stripe's fees.
        </p>
      </div>
    </section>
  );
}
