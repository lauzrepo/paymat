import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings, Users, UsersRound, BookOpen, FileText, CreditCard, Receipt, Mail, HelpCircle, Zap } from 'lucide-react';
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
        q: 'How do I set up my organization?',
        steps: [
          'Go to Settings in the sidebar.',
          'Enter your organization name, business type, and timezone — this controls when billing invoices are sent (8am in your local time).',
          'Optionally add a logo URL and primary color to brand the member portal.',
          'Click Save changes.',
        ],
      },
      {
        q: 'How do I start accepting payments?',
        steps: [
          'Go to Settings and scroll to the Stripe Connect section.',
          'Click Connect Stripe to begin the onboarding flow.',
          'Complete the Stripe Express onboarding (business details, bank account).',
          'Once approved, Stripe Connect status shows as Active and you can charge members.',
          'While Stripe is pending, you can still create invoices and mark them paid manually.',
        ],
      },
      {
        q: 'What is sandbox mode?',
        steps: [
          'Sandbox mode uses Stripe test keys so no real money is moved.',
          'It is on by default for new organizations.',
          'To go live, complete Stripe onboarding and disable sandbox mode in Settings.',
          'In sandbox mode, use Stripe test card numbers (e.g. 4242 4242 4242 4242) to simulate payments.',
        ],
      },
    ],
  },
  {
    icon: Users,
    title: 'Contacts',
    items: [
      {
        q: 'How do I add a contact?',
        steps: [
          'Go to Contacts and click New contact.',
          'Enter the member\'s name, email, phone, and date of birth.',
          'Click Save — the contact is now ready to be enrolled in programs.',
        ],
      },
      {
        q: 'How do I bulk import contacts?',
        steps: [
          'Go to Contacts and click Import.',
          'Download the CSV template and fill it in with your member data.',
          'Upload the completed CSV.',
          'Review the preview and confirm the import.',
          'Contacts that already exist (matched by email) are updated; new ones are created.',
        ],
      },
      {
        q: 'How do I save a payment method for a contact?',
        steps: [
          'Open the contact\'s detail page.',
          'Click Save card in the Payment method section.',
          'The member is prompted to enter their card via a secure Stripe form.',
          'Once saved, the card is used automatically for billing on their enrollments.',
        ],
      },
    ],
  },
  {
    icon: UsersRound,
    title: 'Families',
    items: [
      {
        q: 'What is a family?',
        steps: [
          'A family groups multiple contacts under one billing unit.',
          'All enrollments belonging to contacts in the family are combined onto a single invoice.',
          'The family can have its own saved payment method and billing email.',
        ],
      },
      {
        q: 'How do I create a family?',
        steps: [
          'Go to Families and click New family.',
          'Enter the family name and optional billing email.',
          'Add existing contacts to the family from the detail page.',
          'Save a card on the family to enable auto-pay for the whole group.',
        ],
      },
    ],
  },
  {
    icon: BookOpen,
    title: 'Programs & Enrollments',
    items: [
      {
        q: 'How do I create a program?',
        steps: [
          'Go to Programs and click New program.',
          'Enter the name, description, price, and billing frequency (weekly / monthly).',
          'Optionally set a max billing cycles limit — enrollments auto-cancel when reached.',
          'Toggle Active to make the program available for enrollment.',
        ],
      },
      {
        q: 'How do I enroll a contact?',
        steps: [
          'Open the contact\'s detail page and click Enroll.',
          'Select the program and set the start date.',
          'Set the first billing date — billing will generate invoices from that date forward.',
          'Save the enrollment.',
        ],
      },
      {
        q: 'How do I cancel an enrollment?',
        steps: [
          'Open the enrollment from the Enrollments page or the contact\'s detail page.',
          'Click Cancel enrollment.',
          'The enrollment status changes to Cancelled and no further invoices are generated.',
        ],
      },
    ],
  },
  {
    icon: FileText,
    title: 'Invoices',
    items: [
      {
        q: 'How does automatic billing work?',
        steps: [
          'Every day at 8am in your organization\'s timezone, Paymat checks for enrollments due for billing.',
          'For each due enrollment, an invoice is created and emailed to the member.',
          'If the contact or family has a saved card, the invoice is charged immediately and a receipt is sent.',
          'The enrollment\'s next billing date is advanced by one billing cycle.',
        ],
      },
      {
        q: 'How do I create an invoice manually?',
        steps: [
          'Go to Invoices and click New invoice.',
          'Select the contact or family, set a due date, and add line items.',
          'Save — the invoice is created in Draft status.',
          'Change the status to Sent to notify the member.',
        ],
      },
      {
        q: 'How do I mark an invoice as paid?',
        steps: [
          'Open the invoice from the Invoices page.',
          'Click Mark as paid — use this for cash or check payments processed outside Paymat.',
          'The invoice status updates to Paid and the payment is recorded.',
        ],
      },
      {
        q: 'How do I void an invoice?',
        steps: [
          'Open the invoice and click Void.',
          'Voided invoices are excluded from totals and cannot be paid.',
          'Use this for invoices created in error.',
        ],
      },
    ],
  },
  {
    icon: Receipt,
    title: 'Billing & Auto-Pay',
    items: [
      {
        q: 'How do I run billing manually?',
        steps: [
          'Go to Billing in the sidebar.',
          'Click Run billing now to immediately process all due enrollments for your organization.',
          'Results show how many invoices were created and how many auto-charges succeeded.',
        ],
      },
      {
        q: 'How does auto-pay work for members?',
        steps: [
          'Members can save a card from their Member Portal account page.',
          'When billing runs, any contact or family with a saved card is charged automatically.',
          'An itemized receipt is emailed to the member after each successful charge.',
          'If a charge fails, the invoice remains open and the member is notified.',
        ],
      },
      {
        q: 'What fees does Paymat charge?',
        steps: [
          'Paymat charges a platform fee on each payment (visible in Settings → Stripe section).',
          'Stripe also charges its standard processing fee (typically 2.9% + 30¢ per transaction).',
          'Both fees are shown in the receipt sent to your organization after each payment.',
        ],
      },
    ],
  },
  {
    icon: CreditCard,
    title: 'Payments',
    items: [
      {
        q: 'How do I view payment history?',
        steps: [
          'Go to Payments in the sidebar to see all payments across your organization.',
          'Each row shows the amount, status, payment method type, and the invoice it applies to.',
          'Click a payment to see full details.',
        ],
      },
      {
        q: 'How do I issue a refund?',
        steps: [
          'Refunds must currently be processed directly in your Stripe Dashboard.',
          'Log in to Stripe, find the charge, and issue a full or partial refund from there.',
          'The invoice status will not update automatically — mark it manually if needed.',
        ],
      },
    ],
  },
  {
    icon: Mail,
    title: 'Member Invitations',
    items: [
      {
        q: 'How do I invite a member to the portal?',
        steps: [
          'Open the contact\'s detail page.',
          'Click Send invite — an email is sent with a link to create their portal account.',
          'You can set a custom pricing tier (founding member rate) on the invite.',
          'Members use the link to register and then access their invoices, enrollments, and payment history.',
        ],
      },
      {
        q: 'What is the founding member rate?',
        steps: [
          'The founding member rate is a discounted platform fee for early members.',
          'Set it when sending the invite — it applies to all future payments from that member.',
          'Default is 0.05%. Standard rate is 2%.',
        ],
      },
    ],
  },
  {
    icon: Settings,
    title: 'Settings',
    items: [
      {
        q: 'How do I change my organization\'s timezone?',
        steps: [
          'Go to Settings.',
          'Select your timezone from the dropdown.',
          'Click Save — billing will now run at 8am in the selected timezone.',
        ],
      },
      {
        q: 'How do I customize the member portal branding?',
        steps: [
          'Go to Settings.',
          'Upload a logo URL and choose a primary color.',
          'Members will see your logo and brand color when they log in to the portal.',
        ],
      },
    ],
  },
  {
    icon: HelpCircle,
    title: 'Feedback & Support',
    items: [
      {
        q: 'How do I view member feedback?',
        steps: [
          'Go to Feedback in the sidebar.',
          'All submissions from members are listed with their message, rating, and timestamp.',
          'Click a submission to see the full details and mark it as resolved.',
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
          Step-by-step instructions for managing your organization. Click a section to expand it, then click a question to see the steps.
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
