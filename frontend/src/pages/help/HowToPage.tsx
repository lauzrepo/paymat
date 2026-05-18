import { useState } from 'react';
import { ChevronDown, ChevronUp, Zap, BookOpen, FileText, Receipt, CreditCard, MessageSquare, User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Section {
  icon: React.ElementType;
  title: string;
  items: { q: string; steps: string[] }[];
}

const SECTIONS: Section[] = [
  {
    icon: Zap,
    title: 'Getting Started',
    items: [
      {
        q: 'How do I log in?',
        steps: [
          'Go to the login page for your organization\'s portal.',
          'Enter the email address your organization has on file for you.',
          'Enter your password and click Sign in.',
          'If you haven\'t set a password yet, check your email for an invite link from your organization.',
        ],
      },
      {
        q: 'I forgot my password. How do I reset it?',
        steps: [
          'On the login page, click Forgot password.',
          'Enter your email address and click Send reset link.',
          'Check your inbox for a reset email and click the link inside.',
          'Choose a new password — it must be at least 8 characters and include uppercase, lowercase, and a number.',
        ],
      },
    ],
  },
  {
    icon: BookOpen,
    title: 'My Programs',
    items: [
      {
        q: 'How do I view my enrollments?',
        steps: [
          'Click My Programs in the sidebar.',
          'Each active enrollment is listed with the program name, start date, and next billing date.',
          'Contact your organization if you believe an enrollment is missing or incorrect.',
        ],
      },
      {
        q: 'What does the next billing date mean?',
        steps: [
          'The next billing date is when your organization will generate the next invoice for that program.',
          'If you have auto-pay set up, your saved card will be charged on or shortly after that date.',
          'You\'ll receive an email notification with the invoice details.',
        ],
      },
    ],
  },
  {
    icon: FileText,
    title: 'Invoices',
    items: [
      {
        q: 'How do I view my invoices?',
        steps: [
          'Click Invoices in the sidebar.',
          'All your invoices are listed with their amount, due date, and status.',
          'Click any invoice to see the full breakdown including line items and payment history.',
        ],
      },
      {
        q: 'How do I pay an invoice?',
        steps: [
          'Open the invoice you want to pay.',
          'Click Pay now at the bottom of the invoice.',
          'Enter your card details in the secure Stripe payment form.',
          'Click Pay — you\'ll receive a receipt by email once the payment is confirmed.',
        ],
      },
      {
        q: 'What do the invoice statuses mean?',
        steps: [
          'Draft — the invoice has been created but not yet sent to you.',
          'Sent — the invoice is open and waiting for payment.',
          'Overdue — the due date has passed and payment has not been received.',
          'Paid — payment has been received in full.',
          'Void — the invoice was cancelled by your organization.',
        ],
      },
    ],
  },
  {
    icon: CreditCard,
    title: 'Auto-Pay',
    items: [
      {
        q: 'What is auto-pay?',
        steps: [
          'Auto-pay allows your organization to automatically charge your saved card when invoices are generated.',
          'Instead of logging in to pay each invoice, your card is charged and you receive a receipt by email.',
          'You can remove your card at any time from My Account.',
        ],
      },
      {
        q: 'How do I set up auto-pay?',
        steps: [
          'Go to My Account in the sidebar.',
          'Scroll to the Auto-Pay section and click Enable auto-pay.',
          'Enter your card details in the secure Stripe form.',
          'Check the consent box to authorize automatic charges, then click Save card & enable auto-pay.',
          'Your card details are stored securely by Stripe — Paymat never sees your full card number.',
        ],
      },
      {
        q: 'How do I remove my saved card?',
        steps: [
          'Go to My Account.',
          'In the Auto-Pay section, click Remove next to your saved card.',
          'Your card is immediately detached. Future invoices will need to be paid manually.',
        ],
      },
      {
        q: 'Will I be notified when my card is charged?',
        steps: [
          'Yes — an itemized receipt is sent to your email address after every successful auto-pay charge.',
          'The receipt includes the program name, amount charged, and the last 4 digits of the card used.',
          'If a charge fails, you\'ll receive a notification and the invoice will remain open for manual payment.',
        ],
      },
    ],
  },
  {
    icon: Receipt,
    title: 'Payment History',
    items: [
      {
        q: 'How do I see my past payments?',
        steps: [
          'Click Payment History in the sidebar.',
          'All completed payments are listed with the date, amount, and the invoice they apply to.',
          'Payments made by auto-pay and manual card payments both appear here.',
        ],
      },
      {
        q: 'I was charged but my invoice still shows as unpaid. What do I do?',
        steps: [
          'Wait a few minutes and refresh — payments can take a moment to process and sync.',
          'If the invoice still shows unpaid after 10 minutes, contact your organization with the date and amount of the charge.',
          'Your organization can manually mark the invoice as paid if needed.',
        ],
      },
    ],
  },
  {
    icon: MessageSquare,
    title: 'Support',
    items: [
      {
        q: 'How do I contact my organization?',
        steps: [
          'Click Support in the sidebar.',
          'Click New request to submit a message to your organization.',
          'Include as much detail as possible — billing questions, enrollment changes, or general inquiries.',
          'Your organization will follow up directly.',
        ],
      },
      {
        q: 'How do I leave feedback?',
        steps: [
          'Click Support in the sidebar, then New request.',
          'You can rate your experience and leave a message.',
          'Feedback is sent directly to your organization\'s admin team.',
        ],
      },
    ],
  },
  {
    icon: User,
    title: 'My Account',
    items: [
      {
        q: 'How do I view my profile?',
        steps: [
          'Click My Account in the sidebar.',
          'Your profile shows your name, email, contact details, and family (if applicable).',
          'Contact your organization to update your name, phone number, or date of birth.',
        ],
      },
    ],
  },
];

function AccordionItem({ item }: { item: Section['items'][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.q}</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 ml-3" />
          : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-3" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
          <ol className="space-y-2">
            {item.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function SectionBlock({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-5 py-4 text-left transition-colors',
          open ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn('h-5 w-5 flex-shrink-0', open ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500')} />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{section.title}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{section.items.length} topic{section.items.length !== 1 ? 's' : ''}</span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 pt-3 space-y-2 border-t border-gray-100 dark:border-gray-700">
          {section.items.map((item, i) => (
            <AccordionItem key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HowToPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">How-To Guide</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Answers to common questions about using the member portal. Click a section to expand it.
        </p>
      </div>
      <div className="space-y-3">
        {SECTIONS.map((section, i) => (
          <SectionBlock key={i} section={section} />
        ))}
      </div>
    </div>
  );
}
