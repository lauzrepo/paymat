const steps = [
  {
    number: '01',
    title: 'Set up your organization',
    description:
      'Create your programs, set billing frequencies and prices, and connect your Stripe account to receive payouts.',
  },
  {
    number: '02',
    title: 'Invite your members',
    description:
      'Add contacts and enroll them in programs. Each member gets portal access to view and pay their invoices online.',
  },
  {
    number: '03',
    title: 'Billing runs itself',
    description:
      'Invoices generate automatically on schedule, auto-charge saved cards, and notify members of any issues — without you lifting a finger.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
            style={{ color: 'var(--color-text)' }}
          >
            Up and running in minutes
          </h2>
          <p className="text-base max-w-md mx-auto" style={{ color: 'var(--color-muted)' }}>
            No lengthy onboarding. No professional services fee. Just a few steps and billing is on autopilot.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 relative">
          {/* Connector line on desktop */}
          <div
            className="hidden sm:block absolute top-6 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />

          {steps.map(({ number, title, description }) => (
            <div key={number} className="relative flex flex-col items-start sm:items-center sm:text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold mb-5 border z-10"
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-primary)',
                }}
              >
                {number}
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
