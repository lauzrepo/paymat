import prisma from '../config/database';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export interface MonthlyStatement {
  orgName: string;
  year: number;
  month: number;
  monthName: string;
  summary: {
    invoicesCreated: number;
    totalInvoiced: number;
    totalCollected: number;
    totalRefunded: number;
    outstanding: number;
  };
  payments: {
    date: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
  }[];
  invoices: {
    date: string;
    invoiceNumber: string;
    amountDue: number;
    amountPaid: number;
    currency: string;
    status: string;
  }[];
}

export interface AnnualSummary {
  orgName: string;
  year: number;
  months: {
    month: number;
    monthName: string;
    grossCollected: number;
    refunded: number;
    netRevenue: number;
  }[];
  totals: {
    grossCollected: number;
    refunded: number;
    netRevenue: number;
  };
}

class ReportService {
  async getMonthlyStatement(organizationId: string, year: number, month: number): Promise<MonthlyStatement> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } });

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId, createdAt: { gte: start, lt: end } },
        orderBy: { createdAt: 'asc' },
        select: { invoiceNumber: true, amountDue: true, amountPaid: true, currency: true, status: true, createdAt: true },
      }),
      prisma.payment.findMany({
        where: { organizationId, createdAt: { gte: start, lt: end } },
        orderBy: { createdAt: 'asc' },
        include: { invoice: { select: { invoiceNumber: true } } },
      }),
    ]);

    const succeeded = payments.filter((p) => p.status === 'succeeded');
    const refunded = payments.filter((p) => p.status === 'refunded');
    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amountDue), 0);
    const totalCollected = succeeded.reduce((s, p) => s + Number(p.amount), 0);
    const totalRefunded = refunded.reduce((s, p) => s + Number(p.amount), 0);
    const totalPaid = invoices.reduce((s, i) => s + Number(i.amountPaid), 0);
    const outstanding = Math.max(0, totalInvoiced - totalPaid);

    return {
      orgName: org.name,
      year,
      month,
      monthName: MONTH_NAMES[month - 1],
      summary: { invoicesCreated: invoices.length, totalInvoiced, totalCollected, totalRefunded, outstanding },
      payments: payments.map((p) => ({
        date: p.createdAt.toISOString().split('T')[0],
        invoiceNumber: p.invoice?.invoiceNumber ?? '—',
        amount: Number(p.amount),
        currency: p.currency,
        method: p.paymentMethodType,
        status: p.status,
      })),
      invoices: invoices.map((i) => ({
        date: i.createdAt.toISOString().split('T')[0],
        invoiceNumber: i.invoiceNumber,
        amountDue: Number(i.amountDue),
        amountPaid: Number(i.amountPaid),
        currency: i.currency,
        status: i.status,
      })),
    };
  }

  async getAnnualSummary(organizationId: string, year: number): Promise<AnnualSummary> {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } });

    const payments = await prisma.payment.findMany({
      where: { organizationId, createdAt: { gte: start, lt: end }, status: { in: ['succeeded', 'refunded'] } },
      select: { amount: true, status: true, createdAt: true },
    });

    const monthMap = new Map<number, { grossCollected: number; refunded: number }>();
    for (let m = 1; m <= 12; m++) monthMap.set(m, { grossCollected: 0, refunded: 0 });

    for (const p of payments) {
      const m = p.createdAt.getMonth() + 1;
      const entry = monthMap.get(m)!;
      if (p.status === 'succeeded') entry.grossCollected += Number(p.amount);
      else if (p.status === 'refunded') entry.refunded += Number(p.amount);
    }

    const months = Array.from(monthMap.entries()).map(([m, data]) => ({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      grossCollected: data.grossCollected,
      refunded: data.refunded,
      netRevenue: data.grossCollected - data.refunded,
    }));

    const totals = months.reduce(
      (acc, m) => ({ grossCollected: acc.grossCollected + m.grossCollected, refunded: acc.refunded + m.refunded, netRevenue: acc.netRevenue + m.netRevenue }),
      { grossCollected: 0, refunded: 0, netRevenue: 0 }
    );

    return { orgName: org.name, year, months, totals };
  }

  generateMonthlyCsv(stmt: MonthlyStatement): string {
    const fmt = (n: number) => `$${n.toFixed(2)}`;
    const lines: string[] = [
      `Monthly Statement — ${stmt.orgName}`,
      `Period: ${stmt.monthName} ${stmt.year}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      'SUMMARY',
      `Invoices created,${stmt.summary.invoicesCreated}`,
      `Total invoiced,${fmt(stmt.summary.totalInvoiced)}`,
      `Total collected,${fmt(stmt.summary.totalCollected)}`,
      `Total refunded,${fmt(stmt.summary.totalRefunded)}`,
      `Outstanding,${fmt(stmt.summary.outstanding)}`,
      '',
      'PAYMENTS',
      'Date,Invoice,Amount,Method,Status',
      ...stmt.payments.map((p) => `${p.date},${p.invoiceNumber},${fmt(p.amount)},${p.method},${p.status}`),
      '',
      'INVOICES CREATED',
      'Date,Invoice,Amount Due,Amount Paid,Status',
      ...stmt.invoices.map((i) => `${i.date},${i.invoiceNumber},${fmt(i.amountDue)},${fmt(i.amountPaid)},${i.status}`),
    ];
    return lines.join('\n');
  }

  generateAnnualCsv(summary: AnnualSummary): string {
    const fmt = (n: number) => `$${n.toFixed(2)}`;
    const lines: string[] = [
      `Annual Revenue Summary — ${summary.orgName}`,
      `Year: ${summary.year}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      `Note: This is not an official IRS 1099 form. It is provided for reference only.`,
      '',
      'MONTHLY BREAKDOWN',
      'Month,Gross Collected,Refunds,Net Revenue',
      ...summary.months.map((m) => `${m.monthName} ${summary.year},${fmt(m.grossCollected)},${fmt(m.refunded)},${fmt(m.netRevenue)}`),
      '',
      'ANNUAL TOTALS',
      `Gross collected,${fmt(summary.totals.grossCollected)}`,
      `Total refunded,${fmt(summary.totals.refunded)}`,
      `Net revenue,${fmt(summary.totals.netRevenue)}`,
    ];
    return lines.join('\n');
  }
}

export default new ReportService();
