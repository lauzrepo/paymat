const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: 'Recurring billing',
    description:
      'Set up weekly, monthly, or yearly billing per program. Invoices generate and send automatically. Families billed together, individuals billed separately.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: 'Member portal',
    description:
      'Each member gets their own portal to view invoices, pay online, and manage their account. Branded per organization, no shared login page.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12M12 12l-4-4M12 12l4-4" />
        <path d="M20 16.5A4 4 0 0 0 16 12H8a4 4 0 0 0-4 4.5" />
      </svg>
    ),
    title: 'Direct payouts',
    description:
      'Powered by Stripe Connect. Payments go directly to your bank account. Paymat takes a small platform fee — you keep the rest, instantly.',
  },
];

export default function Features() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
            style={{ color: 'var(--color-text)' }}
          >
            Everything you need. Nothing you don't.
          </h2>
          <p className="text-base max-w-lg mx-auto" style={{ color: 'var(--color-muted)' }}>
            No scheduling bloat. No attendance tracking. No 200-page manual.
            Just billing, payments, and a clean portal for your members.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {features.map(({ icon, title, description }) => (
            <div
              key={title}
              className="p-7 rounded-2xl border"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--color-primary)',
                }}
              >
                {icon}
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
