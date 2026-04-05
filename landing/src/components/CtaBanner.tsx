import WaitlistForm from './WaitlistForm';

export default function CtaBanner() {
  return (
    <section className="py-24 px-6">
      <div
        className="max-w-3xl mx-auto rounded-3xl border p-8 sm:p-12 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h2
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
          style={{ color: 'var(--color-text)' }}
        >
          Ready to simplify billing?
        </h2>
        <p className="text-base mb-8 max-w-sm mx-auto" style={{ color: 'var(--color-muted)' }}>
          Join the waitlist. We're onboarding businesses now.
        </p>
        <WaitlistForm />
        <p className="mt-4 text-sm" style={{ color: 'var(--color-muted)' }}>
          Invite-only. No credit card required.
        </p>
      </div>
    </section>
  );
}
