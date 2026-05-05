export interface Tip {
  title: string;
  body: string;
}

export const PAGE_TIPS: Record<string, Tip[]> = {
  '/': [
    {
      title: 'Key metrics at a glance',
      body: 'The dashboard shows active members, revenue this month, overdue invoices, and total collected — all updated each time you visit.',
    },
    {
      title: 'Act on overdue invoices fast',
      body: 'The overdue invoices table shows exactly who owes what. Click any row to open the invoice and record a payment directly.',
    },
    {
      title: 'Invoice summary by status',
      body: 'The Invoice Summary card breaks your invoices into Draft, Paid, Overdue, and Total so you always know the state of your billing at a glance.',
    },
  ],
  '/contacts': [
    {
      title: 'Collect a card when adding a contact',
      body: 'Check "Add card on file after saving" in the new contact form to collect their payment details in a single step.',
    },
    {
      title: "View a contact's full history",
      body: "Click any contact's name to open their detail page — you'll see all their enrollments, recent invoices, and card status in one place.",
    },
    {
      title: 'Search and filter',
      body: 'The search bar matches on name, email, and phone. Use the status filter to narrow results to active or inactive contacts.',
    },
  ],
  '/families': [
    {
      title: 'Families simplify billing',
      body: 'Assign a primary billing contact to a family so all invoices for family members roll up to one payer.',
    },
    {
      title: 'Enroll an entire family',
      body: 'From a family record, you can enrol all members into a program at once instead of enrolling each contact individually.',
    },
    {
      title: 'Family balance overview',
      body: 'The family detail page shows a combined balance across all members — great for spotting who has outstanding invoices.',
    },
  ],
  '/programs': [
    {
      title: 'Set enrollment capacity',
      body: "Add a max-enrollment limit to any program to automatically stop new sign-ups once it's full.",
    },
    {
      title: 'Recurring vs. one-time programs',
      body: 'Programs with a recurring billing cycle will automatically generate invoices on each cycle date for all active enrollees.',
    },
    {
      title: 'Cap billing with max payments',
      body: 'Set Max payments on a program to automatically stop billing after a fixed number of cycles — ideal for term-based courses.',
    },
    {
      title: 'Delete with care',
      body: 'Deleting a program is permanent and cannot be undone. Unenroll active contacts first to avoid leaving orphaned enrollment records.',
    },
  ],
  '/invoices': [
    {
      title: 'Record offline payments',
      body: 'Use Record Payment on any outstanding invoice to log cash, cheque, or bank transfer payments — not just Stripe transactions.',
    },
    {
      title: 'Partial payments',
      body: 'Enter any amount in the Record Payment form to log a partial payment. The invoice stays open until the full balance is covered.',
    },
    {
      title: 'Void to cancel cleanly',
      body: 'Voiding an invoice cancels it without removing the record. Use this when a service is cancelled or an invoice was raised in error.',
    },
    {
      title: 'Filter by status',
      body: 'Use the status dropdown to drill into Draft, Sent, Paid, Overdue, or Void invoices — useful for chasing specific payments.',
    },
  ],
  '/payments': [
    {
      title: 'Filter by payment status',
      body: 'Use the status filter to view only succeeded, failed, or refunded payments — useful for reconciliation or following up on failed charges.',
    },
    {
      title: 'Track your totals',
      body: 'The stat cards show your total payment count, number of successful charges, and total amount collected at a glance.',
    },
    {
      title: 'See how each payment was made',
      body: 'The Method column shows whether a payment came through Stripe or was recorded manually (cash, cheque, bank transfer, etc.).',
    },
  ],
  '/enrollments': [
    {
      title: 'Enrollment statuses explained',
      body: 'Enrollments are Active, Paused, or Cancelled. Active enrollments generate invoices on each billing cycle; Paused ones do not.',
    },
    {
      title: 'Pause instead of unenrolling',
      body: 'Use Pause to temporarily stop billing without losing the enrollment record. Resume it later to pick up where you left off.',
    },
    {
      title: 'Start date drives billing',
      body: 'The start date you set when enrolling a contact determines when the first invoice is generated for that program.',
    },
  ],
  '/billing': [
    {
      title: 'Run billing manually',
      body: 'The Run billing now button triggers invoice generation for all active enrollments — use it if the automatic cycle missed a run or you need an off-cycle bill.',
    },
    {
      title: 'Founding member rate',
      body: "Early accounts are locked in at the founding member rate of 0.05%. This rate is preserved as long as your subscription stays active.",
    },
    {
      title: 'Manage your subscription',
      body: 'Click Manage subscription to open the Stripe billing portal where you can update your payment method, view past invoices, and change your plan.',
    },
  ],
  '/settings': [
    {
      title: 'Branding customisation',
      body: 'Upload your organisation logo and set a primary colour. These appear on invoices and payment pages your families see.',
    },
    {
      title: 'Set the right business type',
      body: 'Your business type helps Paymat tailor terminology and defaults. Choose the closest match from the dropdown — it can be changed at any time.',
    },
    {
      title: 'Timezone matters for billing',
      body: "Set your organisation's timezone to ensure invoice due dates and billing schedules display correctly for your region.",
    },
  ],
  '/feedback': [
    {
      title: 'Send feedback to Paymat',
      body: 'Use Submit Feedback to send feature requests, bug reports, or questions directly to the Paymat team. We read every submission.',
    },
    {
      title: 'Track progress with statuses',
      body: 'Update the status on each submission as you monitor it — Open, In Progress, Resolved, or Closed — so you have a clear record of what has been addressed.',
    },
    {
      title: 'Filter by type or status',
      body: 'Use the type and status filters together to focus on unresolved bug reports or open questions without losing other entries.',
    },
  ],
};

export const PAGE_NAMES: Record<string, string> = {
  '/': 'Dashboard',
  '/contacts': 'Contacts',
  '/families': 'Families',
  '/programs': 'Programs',
  '/invoices': 'Invoices',
  '/payments': 'Payments',
  '/enrollments': 'Enrollments',
  '/billing': 'Billing',
  '/settings': 'Settings',
  '/feedback': 'Feedback',
};

export function getTipsForPath(pathname: string): { tips: Tip[]; pageName: string } {
  if (PAGE_TIPS[pathname]) {
    return { tips: PAGE_TIPS[pathname], pageName: PAGE_NAMES[pathname] ?? 'This page' };
  }
  const base = '/' + pathname.split('/')[1];
  if (PAGE_TIPS[base]) {
    return { tips: PAGE_TIPS[base], pageName: PAGE_NAMES[base] ?? 'This page' };
  }
  return { tips: PAGE_TIPS['/'] ?? [], pageName: 'Dashboard' };
}
