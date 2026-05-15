import prisma from '../config/database';

/**
 * Returns the next globally unique invoice number (INV-NNNNN).
 * Finds the current highest numeric suffix across all orgs, increments it,
 * then scans forward until it finds a slot that isn't already taken.
 * This handles divergence between count-based and max-based numbering schemes
 * (e.g. manually created invoices vs billing-engine invoices) and retries
 * gracefully if a concurrent writer claimed the same number.
 */
export async function nextInvoiceNumber(): Promise<string> {
  const last = await prisma.invoice.findFirst({
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });
  const n = last ? parseInt(last.invoiceNumber.replace(/\D/g, ''), 10) : 0;
  let candidate = (isNaN(n) ? 0 : n) + 1;

  for (;;) {
    const num = `INV-${String(candidate).padStart(5, '0')}`;
    const exists = await prisma.invoice.findUnique({ where: { invoiceNumber: num } });
    if (!exists) return num;
    candidate++;
  }
}
