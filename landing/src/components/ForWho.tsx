const categories = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L8 7H4l2 5-4 3 4 1 2 5 4-3 4 3 2-5 4-1-4-3 2-5h-4L12 2z" />
      </svg>
    ),
    label: 'Martial arts',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12c0-5 3.5-9 9-9s9 4 9 9" />
        <path d="M5 19c.5-1.5 2-3 4-3h6c2 0 3.5 1.5 4 3" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    label: 'Swim schools',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
    label: 'Gymnastics',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
    label: 'Dance studios',
  },
];

export default function ForWho() {
  return (
    <section className="py-20 px-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-sm font-medium mb-10" style={{ color: 'var(--color-muted)' }}>
          Built for businesses that run programs, classes, and memberships
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.map(({ icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-3 py-8 px-4 rounded-2xl border"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
