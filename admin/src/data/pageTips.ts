export interface Tip {
  title: string;
  body: string;
}

export const PAGE_TIPS: Record<string, Tip[]> = {
  '/': [
    {
      title: 'Check your revenue at a glance',
      body: 'The dashboard shows total collected payments, pending invoices, and active enrollments for the current month.',
    },
    {
      title: 'Recent activity feed',
      body: 'The activity feed highlights the latest payments and new contacts added to your organisation.',
    },
    {
      title: 'Sandbox vs. live mode',
      body: "While in sandbox mode, all payment amounts are test data. Switch to live mode from the Settings page when you're ready to go live.",
    },
  ],
  '/contacts': [
    {
      title: 'Import contacts in bulk',
      body: 'Use the CSV import button to upload hundreds of contacts at once. Download the template first to get the right column format.',
    },
    {
      title: 'Link contacts to families',
      body: 'Open a contact record and use "Add to family" to group parents and children together for unified billing.',
    },
    {
      title: 'Search and filter',
      body: 'The search bar matches on name, email, and phone. Use the status filter to narrow results to active, inactive, or archived contacts.',
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
      title: 'Archive vs. delete',
      body: 'Archiving a program keeps its enrollment and payment history intact. Deletion is permanent — archive first if in doubt.',
    },
    {
      title: 'Custom fields',
      body: 'Attach custom fields to programs to capture program-specific information from families during enrollment.',
    },
  ],
  '/invoices': [
    {
      title: 'Send reminders automatically',
      body: 'Enable auto-reminders in Settings to have Paymat send email nudges 7 and 3 days before an invoice due date.',
    },
    {
      title: 'Partial payments',
      body: 'Contacts can pay invoices in multiple instalments. The invoice detail page shows all partial payments received so far.',
    },
    {
      title: 'Bulk void',
      body: 'Select multiple invoices and use the bulk action menu to void them all at once — useful when a program is cancelled.',
    },
    {
      title: 'PDF export',
      body: 'Each invoice has a "Download PDF" option you can share directly with parents who prefer paper records.',
    },
  ],
  '/payments': [
    {
      title: 'Filter by date range',
      body: 'Use the date-range picker to export or review payments for a specific pay period or reporting window.',
    },
    {
      title: 'Refund from this page',
      body: 'Click any payment row to open its detail view, then use the Refund button to issue a full or partial refund through Stripe.',
    },
    {
      title: 'Stripe fee breakdown',
      body: "Each payment row shows the gross amount, Stripe fee, and your net payout so you always know exactly what you'll receive.",
    },
  ],
  '/enrollments': [
    {
      title: 'Enrollment status lifecycle',
      body: 'Enrollments move from Pending → Active → Completed (or Cancelled). Only Active enrollments generate recurring invoices.',
    },
    {
      title: 'Bulk enrol from a program',
      body: 'Navigate to a program and use "Enrol contacts" to add multiple people at once rather than one at a time.',
    },
    {
      title: 'Cancel vs. withdraw',
      body: 'Cancelling an enrollment voids future invoices. Withdrawing marks the enrollment as ended but keeps billing history.',
    },
  ],
  '/billing': [
    {
      title: 'Upgrade at any time',
      body: 'You can upgrade your plan mid-cycle — the price difference is prorated automatically for the remainder of the billing period.',
    },
    {
      title: 'Founding member rate',
      body: "Early accounts are locked in at the founding member rate of 0.05%. This rate is preserved as long as your subscription stays active.",
    },
    {
      title: 'Download invoices',
      body: 'All past Paymat subscription invoices are available to download as PDFs from the Billing page for your records.',
    },
  ],
  '/settings': [
    {
      title: 'Go live when ready',
      body: "Flip the sandbox toggle off in Settings once you've finished testing. You'll be prompted to complete Stripe onboarding to start accepting real payments.",
    },
    {
      title: 'Branding customisation',
      body: 'Upload your organisation logo and set a primary colour. These appear on invoices and payment pages your families see.',
    },
    {
      title: 'Notification preferences',
      body: 'Choose which events trigger email notifications to you and to your contacts — new invoices, payment confirmations, and reminders.',
    },
  ],
  '/feedback': [
    {
      title: 'Feedback from families',
      body: 'Families can submit feedback directly from their portal. All submissions appear here so you can review and respond.',
    },
    {
      title: 'Mark as reviewed',
      body: "Click a feedback item to open it, then mark it as reviewed once you've addressed it so your team knows it's been handled.",
    },
    {
      title: 'Filter by status',
      body: 'Use the status filter to see only unreviewed items and stay on top of new feedback without losing older entries.',
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
