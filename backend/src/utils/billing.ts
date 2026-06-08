export function advanceBillingDate(date: Date, frequency: string): Date | null {
  const next = new Date(date);
  if (frequency === 'monthly') { next.setUTCMonth(next.getUTCMonth() + 1); return next; }
  if (frequency === 'weekly') { next.setUTCDate(next.getUTCDate() + 7); return next; }
  if (frequency === 'yearly') { next.setUTCFullYear(next.getUTCFullYear() + 1); return next; }
  return null; // one_time — no next billing date
}
