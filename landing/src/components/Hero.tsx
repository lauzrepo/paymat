import WaitlistForm from './WaitlistForm';

export default function Hero() {
  return (
    <section className="pt-40 pb-28 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div
          className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border mb-8"
          style={{
            color: 'var(--color-primary)',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          Now accepting early access requests
        </div>

        <h1
          className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6"
          style={{ color: 'var(--color-text)' }}
        >
          Billing and payments for{' '}
          <span style={{ color: 'var(--color-primary)' }}>activity businesses</span>
        </h1>

        <p className="text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto" style={{ color: 'var(--color-muted)' }}>
          Recurring invoices, member portals, and direct payouts —
          without the complexity of software built for someone else.
        </p>

        <WaitlistForm />

        <p className="mt-4 text-sm" style={{ color: 'var(--color-muted)' }}>
          Invite-only. No credit card required.
        </p>
      </div>
    </section>
  );
}
