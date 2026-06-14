import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import invoiceService from './invoiceService';
import paymentService from './paymentService';
import enrollmentService from './enrollmentService';
import contactService from './contactService';
import familyService from './familyService';
import programService from './programService';
import billingService from './billingService';
import feedbackService from './feedbackService';
import sessionService from './sessionService';
import { sendInvoiceGenerated, sendPaymentReminder, sendMemberPortalInvite } from './emailService';
import { config } from '../config/environment';
import { AppError } from '../middleware/errorHandler';

const PORTAL_URL = config.email.appUrl.replace('app.', 'portal.');

const anthropic = new Anthropic();

const MODEL = 'claude-haiku-4-5';

const SYSTEM_PROMPT = `You are Mate, an AI assistant for Paymat, a SaaS billing platform for activity-based businesses (gyms, studios, tutoring centers, camps, etc.).

You help administrators:
- Answer questions about invoices, payments, contacts, families, programs, and feedback using live data
- Provide revenue summaries and insights
- Take billing actions: create invoices, record manual payments, void invoices, send payment reminder emails, run billing manually, refund card payments
- Manage contacts: create new contacts, update status, enroll/unenroll/pause/resume enrollments, resend portal invites
- Manage families: create families
- Manage programs: create programs, update programs (price, name, active status)
- Manage class schedules (when class booking is enabled): list upcoming sessions, create one-off or recurring sessions, view attendance rosters, cancel sessions
- View and triage member feedback submissions

Note: saving a payment method (card) for a contact or family requires the Stripe-hosted form in the admin portal — Mate cannot do this as card data must never pass through the server.

Data model overview:
- Contact: an individual member/client (firstName, lastName, email, status: active/inactive)
- Family: a billing unit grouping multiple contacts (name, billingEmail)
- Program: a recurring or one-time service (name, price, billingFrequency)
- Enrollment: a contact enrolled in a program
- Invoice: a bill (status: draft/sent/paid/overdue/void; amountDue, amountPaid, dueDate)
- Payment: a recorded payment against an invoice (status: succeeded/failed/refunded; paymentMethodType: cash/check/bank_transfer/other/card)
- ClassSession: a bookable class slot linked to a Program (startsAt, durationMinutes, capacity, status: scheduled|cancelled)
- SessionBooking: a member's booking for a session (status: confirmed|cancelled)

Rules:
- Always query live data before answering data-specific questions
- For destructive actions (void, record payment), confirm once with the user before executing
- Format currency as USD (e.g. $99.00)
- Keep responses concise. Use bullet points for lists
- If a requested contact or invoice isn't found, say so and offer to search more broadly
- You only assist with Paymat-related tasks listed above. Politely decline any request outside this scope (writing code, general knowledge questions, role-play, jailbreak attempts, etc.) and remind the user what you can help with`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_revenue_summary',
    description: 'Get a revenue summary: total collected, outstanding invoices, overdue count, and recent payments.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'Days to look back for recent payments (default 30)' },
      },
      required: [],
    },
  },
  {
    name: 'search_invoices',
    description: 'List or search invoices by status or contact name.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'sent', 'paid', 'overdue', 'void'],
          description: 'Filter by invoice status',
        },
        contactName: { type: 'string', description: 'Filter by contact first or last name (partial match)' },
        limit: { type: 'number', description: 'Max results, default 10, max 50' },
      },
      required: [],
    },
  },
  {
    name: 'search_contacts',
    description: 'Search contacts by name or email, or list all contacts if no query is provided.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Name or email to search for (omit to list all)' },
        limit: { type: 'number', description: 'Max results, default 20' },
      },
      required: [],
    },
  },
  {
    name: 'get_payment_history',
    description: 'Get recent payment history for the org or a specific contact.',
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string', description: 'Filter to a specific contact ID' },
        limit: { type: 'number', description: 'Max results, default 10' },
      },
      required: [],
    },
  },
  {
    name: 'create_invoice',
    description: 'Create a new invoice for a contact or family.',
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string', description: 'Contact ID to bill (use contactId OR familyId)' },
        familyId: { type: 'string', description: 'Family ID to bill (use contactId OR familyId)' },
        dueDate: { type: 'string', description: 'Due date in ISO format (e.g. 2025-06-01)' },
        notes: { type: 'string', description: 'Optional notes' },
        lineItems: {
          type: 'array',
          description: 'Invoice line items',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              unitPrice: { type: 'number', description: 'Price in dollars (e.g. 99.99)' },
            },
            required: ['description', 'unitPrice'],
          },
        },
      },
      required: ['dueDate', 'lineItems'],
    },
  },
  {
    name: 'record_payment',
    description: 'Record a manual payment (cash/check/bank transfer) against an invoice.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: { type: 'string', description: 'Invoice ID to apply the payment to' },
        amount: { type: 'number', description: 'Payment amount in dollars' },
        paymentMethodType: {
          type: 'string',
          enum: ['cash', 'check', 'bank_transfer', 'other'],
          description: 'Payment method (default: cash)',
        },
        notes: { type: 'string', description: 'Optional notes' },
      },
      required: ['invoiceId', 'amount'],
    },
  },
  {
    name: 'get_invoice_details',
    description: 'Get full details for a specific invoice, including line items and payment history.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: { type: 'string', description: 'Invoice ID' },
      },
      required: ['invoiceId'],
    },
  },
  {
    name: 'send_invoice',
    description: 'Mark a draft invoice as sent and email it to the contact or family billing address.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: { type: 'string', description: 'Invoice ID to send' },
      },
      required: ['invoiceId'],
    },
  },
  {
    name: 'list_programs',
    description: 'List active programs for the organization, including name and price.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Optional name search (partial match)' },
      },
      required: [],
    },
  },
  {
    name: 'get_contact_enrollments',
    description: "Get a contact's active program enrollments, including program name and price. Use this before creating an invoice when the user says 'bill for current enrollments' or similar.",
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string', description: 'The contact ID to look up enrollments for' },
      },
      required: ['contactId'],
    },
  },
  {
    name: 'get_family_details',
    description: "Get a family's members, their active enrollments, and outstanding invoice balance.",
    input_schema: {
      type: 'object' as const,
      properties: {
        familyId: { type: 'string', description: 'Family ID' },
      },
      required: ['familyId'],
    },
  },
  {
    name: 'create_enrollment',
    description: 'Enroll a contact in a program. Handles capacity checks and re-activating cancelled enrollments.',
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string', description: 'Contact ID to enroll' },
        programId: { type: 'string', description: 'Program ID to enroll in' },
        startDate: { type: 'string', description: 'Start date in ISO format (defaults to today)' },
      },
      required: ['contactId', 'programId'],
    },
  },
  {
    name: 'unenroll_contact',
    description: 'Cancel a contact\'s enrollment in a program.',
    input_schema: {
      type: 'object' as const,
      properties: {
        enrollmentId: { type: 'string', description: 'Enrollment ID to cancel' },
      },
      required: ['enrollmentId'],
    },
  },
  {
    name: 'update_contact_status',
    description: "Update a contact's status to active or inactive.",
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string', description: 'Contact ID' },
        status: { type: 'string', enum: ['active', 'inactive'], description: 'New status' },
      },
      required: ['contactId', 'status'],
    },
  },
  {
    name: 'void_invoice',
    description: 'Void an unpaid invoice (marks it cancelled). Cannot void paid invoices.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: { type: 'string', description: 'Invoice ID to void' },
      },
      required: ['invoiceId'],
    },
  },
  {
    name: 'send_payment_reminder',
    description: 'Send a payment reminder email to the contact or family for a specific invoice.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: { type: 'string', description: 'Invoice ID to send the reminder for' },
      },
      required: ['invoiceId'],
    },
  },
  {
    name: 'create_family',
    description: 'Create a new family (billing group) in the organization.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Family name' },
        billingEmail: { type: 'string', description: 'Billing email address (optional)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_program',
    description: 'Create a new program (service/class) with pricing and billing frequency.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Program name' },
        price: { type: 'number', description: 'Price per billing cycle in USD' },
        billingFrequency: { type: 'string', enum: ['monthly', 'weekly', 'yearly', 'one_time'], description: 'How often to bill' },
        description: { type: 'string', description: 'Optional description' },
        capacity: { type: 'number', description: 'Max enrollments (optional)' },
        maxBillingCycles: { type: 'number', description: 'Auto-cancel after this many billing cycles (optional)' },
      },
      required: ['name', 'price', 'billingFrequency'],
    },
  },
  {
    name: 'update_program',
    description: 'Update an existing program — change price, name, status, or billing frequency.',
    input_schema: {
      type: 'object' as const,
      properties: {
        programId: { type: 'string', description: 'Program ID to update' },
        name: { type: 'string', description: 'New name (optional)' },
        price: { type: 'number', description: 'New price in USD (optional)' },
        billingFrequency: { type: 'string', enum: ['monthly', 'weekly', 'yearly', 'one_time'], description: 'New billing frequency (optional)' },
        description: { type: 'string', description: 'New description (optional)' },
        isActive: { type: 'boolean', description: 'Set to false to deactivate (optional)' },
        capacity: { type: 'number', description: 'New capacity limit (optional)' },
      },
      required: ['programId'],
    },
  },
  {
    name: 'pause_enrollment',
    description: 'Pause an active enrollment — stops billing until resumed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        enrollmentId: { type: 'string', description: 'Enrollment ID to pause' },
      },
      required: ['enrollmentId'],
    },
  },
  {
    name: 'resume_enrollment',
    description: 'Resume a paused enrollment.',
    input_schema: {
      type: 'object' as const,
      properties: {
        enrollmentId: { type: 'string', description: 'Enrollment ID to resume' },
      },
      required: ['enrollmentId'],
    },
  },
  {
    name: 'run_billing',
    description: 'Manually trigger the billing run for this organization — generates invoices for all due enrollments and auto-charges saved cards.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'refund_payment',
    description: 'Refund a card payment that was processed through Stripe.',
    input_schema: {
      type: 'object' as const,
      properties: {
        paymentId: { type: 'string', description: 'Payment ID to refund' },
      },
      required: ['paymentId'],
    },
  },
  {
    name: 'list_feedback',
    description: 'List feedback submissions from members, with optional status or type filter.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'], description: 'Filter by status (optional)' },
        type: { type: 'string', enum: ['feedback', 'bug', 'question'], description: 'Filter by type (optional)' },
        limit: { type: 'number', description: 'Max results, default 20' },
      },
      required: [],
    },
  },
  {
    name: 'update_feedback_status',
    description: 'Update the status of a feedback submission.',
    input_schema: {
      type: 'object' as const,
      properties: {
        feedbackId: { type: 'string', description: 'Feedback submission ID' },
        status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'], description: 'New status' },
      },
      required: ['feedbackId', 'status'],
    },
  },
  {
    name: 'resend_portal_invite',
    description: 'Resend a member portal invite email to a contact. Creates a new invite token if one does not exist or the previous one was already used.',
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string', description: 'Contact ID to resend the invite to' },
      },
      required: ['contactId'],
    },
  },
  {
    name: 'create_contact',
    description: 'Create a new contact (member/client) in the organization.',
    input_schema: {
      type: 'object' as const,
      properties: {
        firstName: { type: 'string', description: 'First name' },
        lastName: { type: 'string', description: 'Last name' },
        email: { type: 'string', description: 'Email address (optional)' },
        phone: { type: 'string', description: 'Phone number (optional)' },
        familyId: { type: 'string', description: 'Family ID to link the contact to (optional)' },
        dateOfBirth: { type: 'string', description: 'Date of birth in ISO format e.g. 2010-03-15 (optional)' },
        notes: { type: 'string', description: 'Internal notes (optional)' },
      },
      required: ['firstName', 'lastName'],
    },
  },
  {
    name: 'filter_invoices_by_card_status',
    description: 'List invoices filtered by whether the billed contact or family has a card on file (saved payment method). Use this to find members who need manual follow-up because they have no autopay set up, or to identify who can be auto-charged.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hasCard: {
          type: 'boolean',
          description: 'true = only invoices where the billed party has a card on file; false = only invoices where they do not',
        },
        status: {
          type: 'string',
          enum: ['draft', 'sent', 'paid', 'overdue', 'void'],
          description: 'Filter by invoice status (optional — omit for all statuses)',
        },
        limit: { type: 'number', description: 'Max results, default 20, max 50' },
      },
      required: ['hasCard'],
    },
  },
  {
    name: 'list_sessions',
    description: 'List upcoming class sessions for a program, or all programs in the org. Returns start time, duration, location, capacity, and confirmed booking count.',
    input_schema: {
      type: 'object' as const,
      properties: {
        programId: { type: 'string', description: 'Filter to a specific program ID (optional — omit to see all programs)' },
        days: { type: 'number', description: 'How many days ahead to look (default 14, max 90)' },
      },
      required: [],
    },
  },
  {
    name: 'create_session',
    description: 'Create a one-off class session for a program.',
    input_schema: {
      type: 'object' as const,
      properties: {
        programId: { type: 'string', description: 'Program ID this session belongs to' },
        startsAt: { type: 'string', description: 'ISO datetime when the session starts (e.g. 2026-06-10T09:00:00)' },
        durationMinutes: { type: 'number', description: 'Duration of the session in minutes' },
        location: { type: 'string', description: 'Location or room (optional)' },
        capacity: { type: 'number', description: 'Max number of bookings (optional — omit for unlimited)' },
        notes: { type: 'string', description: 'Notes visible to members (optional)' },
      },
      required: ['programId', 'startsAt', 'durationMinutes'],
    },
  },
  {
    name: 'create_recurring_series',
    description: 'Create a recurring class schedule for a program — e.g. every Mon/Wed/Fri at 9 AM. Sessions are materialised automatically.',
    input_schema: {
      type: 'object' as const,
      properties: {
        programId: { type: 'string', description: 'Program ID this series belongs to' },
        daysOfWeek: {
          type: 'array',
          items: { type: 'string', enum: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] },
          description: 'Days of the week the session repeats',
        },
        timeOfDay: { type: 'string', description: 'Time in HH:MM format (e.g. 09:00)' },
        durationMinutes: { type: 'number', description: 'Duration of each session in minutes' },
        seriesStartDate: { type: 'string', description: 'Date the series begins in YYYY-MM-DD format' },
        seriesEndDate: { type: 'string', description: 'Date the series ends in YYYY-MM-DD format (optional — leave blank for open-ended)' },
        location: { type: 'string', description: 'Location or room (optional)' },
        capacity: { type: 'number', description: 'Max bookings per session (optional)' },
        notes: { type: 'string', description: 'Notes visible to members (optional)' },
      },
      required: ['programId', 'daysOfWeek', 'timeOfDay', 'durationMinutes', 'seriesStartDate'],
    },
  },
  {
    name: 'get_session_roster',
    description: 'Get the attendance roster for a specific session — who has booked, their status, and when they booked.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: { type: 'string', description: 'Session ID to fetch the roster for' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'cancel_session',
    description: 'Cancel a class session. For recurring sessions, choose whether to cancel only this occurrence or this and all future sessions in the series.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: { type: 'string', description: 'Session ID to cancel' },
        scope: {
          type: 'string',
          enum: ['one', 'future'],
          description: '"one" cancels only this session; "future" cancels this and all future sessions in the same series',
        },
      },
      required: ['sessionId', 'scope'],
    },
  },
];

function toTitleCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  organizationId: string,
  userId: string,
  classBookingEnabled: boolean
): Promise<string> {
  switch (name) {
    case 'get_revenue_summary': {
      const days = (input.days as number) ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [collected, outstanding, overdueCount, recentPayments] = await Promise.all([
        prisma.payment.aggregate({
          where: { organizationId, status: 'succeeded' },
          _sum: { amount: true },
        }),
        prisma.invoice.aggregate({
          where: { organizationId, status: { in: ['sent', 'draft', 'overdue'] } },
          _sum: { amountDue: true, amountPaid: true },
        }),
        prisma.invoice.count({ where: { organizationId, status: 'overdue' } }),
        prisma.payment.findMany({
          where: { organizationId, status: 'succeeded', createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            invoice: { select: { invoiceNumber: true } },
          },
        }),
      ]);

      const outstandingBalance =
        Number(outstanding._sum.amountDue ?? 0) - Number(outstanding._sum.amountPaid ?? 0);

      return JSON.stringify({
        totalCollectedAllTime: Number(collected._sum.amount ?? 0),
        outstandingBalance,
        overdueInvoiceCount: overdueCount,
        periodDays: days,
        recentPayments: recentPayments.map((p) => ({
          amount: Number(p.amount),
          currency: p.currency,
          method: p.paymentMethodType,
          date: p.createdAt,
          invoiceNumber: p.invoice?.invoiceNumber,
        })),
      });
    }

    case 'search_invoices': {
      const limit = Math.min((input.limit as number) ?? 10, 50);
      const status = input.status as string | undefined;
      const contactName = input.contactName as string | undefined;

      const where: Prisma.InvoiceWhereInput = {
        organizationId,
        ...(status && { status }),
        ...(contactName && {
          OR: [
            { contact: { firstName: { contains: contactName, mode: 'insensitive' } } },
            { contact: { lastName: { contains: contactName, mode: 'insensitive' } } },
          ],
        }),
      };

      const invoices = await prisma.invoice.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          family: { select: { id: true, name: true } },
        },
      });

      return JSON.stringify(
        invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          amountDue: Number(inv.amountDue),
          amountPaid: Number(inv.amountPaid),
          dueDate: inv.dueDate,
          billedTo: inv.contact
            ? { type: 'contact', id: inv.contact.id, name: `${inv.contact.firstName} ${inv.contact.lastName}` }
            : inv.family
            ? { type: 'family', id: inv.family.id, name: inv.family.name }
            : null,
        }))
      );
    }

    case 'search_contacts': {
      const query = input.query as string | undefined;
      const limit = (input.limit as number) ?? 20;

      const contacts = await prisma.contact.findMany({
        where: {
          organizationId,
          ...(query && {
            OR: [
              ...query.trim().split(/\s+/).flatMap((word) => [
                { firstName: { contains: word, mode: 'insensitive' as const } },
                { lastName: { contains: word, mode: 'insensitive' as const } },
              ]),
              { email: { contains: query, mode: 'insensitive' as const } },
            ],
          }),
        },
        take: limit,
        orderBy: { firstName: 'asc' },
        select: { id: true, firstName: true, lastName: true, email: true, status: true, familyId: true },
      });

      return JSON.stringify(contacts);
    }

    case 'get_payment_history': {
      const limit = (input.limit as number) ?? 10;
      const contactId = input.contactId as string | undefined;

      const payments = await prisma.payment.findMany({
        where: {
          organizationId,
          ...(contactId && { invoice: { contactId } }),
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              contact: { select: { firstName: true, lastName: true } },
              family: { select: { name: true } },
            },
          },
        },
      });

      return JSON.stringify(
        payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          currency: p.currency,
          status: p.status,
          method: p.paymentMethodType,
          date: p.createdAt,
          invoiceNumber: p.invoice.invoiceNumber,
          billedTo: p.invoice.contact
            ? `${p.invoice.contact.firstName} ${p.invoice.contact.lastName}`
            : (p.invoice.family?.name ?? 'Unknown'),
        }))
      );
    }

    case 'create_invoice': {
      const invoice = await invoiceService.createInvoice({
        organizationId,
        contactId: input.contactId as string | undefined,
        familyId: input.familyId as string | undefined,
        dueDate: new Date(input.dueDate as string),
        notes: input.notes as string | undefined,
        lineItems: input.lineItems as Array<{ description: string; quantity?: number; unitPrice: number }>,
      });

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ASSISTANT_CREATE_INVOICE',
          metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
        },
      });

      return JSON.stringify({
        success: true,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amountDue: Number(invoice.amountDue),
      });
    }

    case 'record_payment': {
      const payment = await paymentService.processPayment({
        organizationId,
        invoiceId: input.invoiceId as string,
        userId,
        amount: input.amount as number,
        paymentMethodType: (input.paymentMethodType as string) ?? 'cash',
        notes: input.notes as string | undefined,
      });

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ASSISTANT_RECORD_PAYMENT',
          metadata: { paymentId: payment.id, invoiceId: input.invoiceId as string, amount: input.amount as number },
        },
      });

      return JSON.stringify({ success: true, paymentId: payment.id, amount: Number(payment.amount) });
    }

    case 'get_invoice_details': {
      const invoice = await prisma.invoice.findFirst({
        where: { id: input.invoiceId as string, organizationId },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          family: { select: { id: true, name: true, billingEmail: true } },
          lineItems: { select: { id: true, description: true, quantity: true, unitPrice: true, total: true } },
          payments: {
            select: { id: true, amount: true, status: true, paymentMethodType: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!invoice) return JSON.stringify({ error: 'Invoice not found' });

      return JSON.stringify({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        amountDue: Number(invoice.amountDue),
        amountPaid: Number(invoice.amountPaid),
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        notes: invoice.notes,
        billedTo: invoice.contact
          ? { type: 'contact', id: invoice.contact.id, name: `${invoice.contact.firstName} ${invoice.contact.lastName}`, email: invoice.contact.email }
          : invoice.family
          ? { type: 'family', id: invoice.family.id, name: invoice.family.name, email: invoice.family.billingEmail }
          : null,
        lineItems: invoice.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: Number(li.unitPrice),
          total: Number(li.total),
        })),
        payments: invoice.payments.map((p) => ({
          amount: Number(p.amount),
          status: p.status,
          method: p.paymentMethodType,
          date: p.createdAt,
        })),
      });
    }

    case 'send_invoice': {
      const invoice = await prisma.invoice.findFirst({
        where: { id: input.invoiceId as string, organizationId },
        include: {
          contact: { select: { firstName: true, lastName: true, email: true } },
          family: { select: { name: true, billingEmail: true } },
          lineItems: { select: { description: true } },
          organization: { select: { name: true, slug: true } },
        },
      });

      if (!invoice) return JSON.stringify({ error: 'Invoice not found' });
      if (invoice.status !== 'draft') return JSON.stringify({ error: `Invoice is already ${invoice.status}` });

      await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'sent' } });

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ASSISTANT_SEND_INVOICE',
          metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
        },
      });

      const recipientEmail = invoice.contact?.email ?? invoice.family?.billingEmail;
      const recipientName = invoice.contact
        ? `${invoice.contact.firstName} ${invoice.contact.lastName}`.trim()
        : (invoice.family?.name ?? 'Customer');

      if (recipientEmail) {
        sendInvoiceGenerated(recipientEmail, {
          recipientName,
          orgName: invoice.organization.name,
          invoiceNumber: invoice.invoiceNumber,
          amount: Number(invoice.amountDue),
          currency: invoice.currency,
          dueDate: invoice.dueDate,
          programName: invoice.lineItems[0]?.description ?? 'Services',
          portalUrl: `${PORTAL_URL}/${invoice.organization.slug}/invoices/${invoice.id}`,
        }).catch(() => {});
      }

      return JSON.stringify({
        success: true,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        emailedTo: recipientEmail ?? null,
      });
    }

    case 'list_programs': {
      const query = input.query as string | undefined;

      const programs = await prisma.program.findMany({
        where: {
          organizationId,
          isActive: true,
          ...(query && { name: { contains: query, mode: 'insensitive' } }),
        },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, description: true, price: true, billingFrequency: true, capacity: true },
      });

      return JSON.stringify(
        programs.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: Number(p.price),
          billingFrequency: p.billingFrequency,
          capacity: p.capacity,
        }))
      );
    }

    case 'get_contact_enrollments': {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          contact: { organizationId },
          contactId: input.contactId as string,
          status: 'active',
        },
        include: {
          program: { select: { id: true, name: true, price: true, billingFrequency: true } },
        },
        orderBy: { startDate: 'asc' },
      });

      return JSON.stringify(
        enrollments.map((e) => ({
          enrollmentId: e.id,
          programId: e.program.id,
          programName: e.program.name,
          price: Number(e.program.price),
          billingFrequency: e.program.billingFrequency,
          startDate: e.startDate,
        }))
      );
    }

    case 'get_family_details': {
      const family = await prisma.family.findFirst({
        where: { id: input.familyId as string, organizationId },
        include: {
          contacts: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              status: true,
              enrollments: {
                where: { status: 'active' },
                include: { program: { select: { name: true, price: true, billingFrequency: true } } },
              },
            },
          },
          invoices: {
            where: { status: { in: ['draft', 'sent', 'overdue'] } },
            select: { id: true, invoiceNumber: true, status: true, amountDue: true, amountPaid: true, dueDate: true },
          },
        },
      });

      if (!family) return JSON.stringify({ error: 'Family not found' });

      const outstandingBalance = family.invoices.reduce(
        (sum, inv) => sum + Number(inv.amountDue) - Number(inv.amountPaid),
        0
      );

      return JSON.stringify({
        id: family.id,
        name: family.name,
        billingEmail: family.billingEmail,
        outstandingBalance,
        members: family.contacts.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          email: c.email,
          status: c.status,
          activeEnrollments: c.enrollments.map((e) => ({
            enrollmentId: e.id,
            program: e.program.name,
            price: Number(e.program.price),
            billingFrequency: e.program.billingFrequency,
          })),
        })),
        openInvoices: family.invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          amountDue: Number(inv.amountDue),
          amountPaid: Number(inv.amountPaid),
          dueDate: inv.dueDate,
        })),
      });
    }

    case 'create_enrollment': {
      const startDate = input.startDate ? new Date(input.startDate as string) : new Date();
      const enrollment = await enrollmentService.enroll({
        contactId: input.contactId as string,
        programId: input.programId as string,
        organizationId,
        startDate,
      });

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ASSISTANT_CREATE_ENROLLMENT',
          metadata: {
            enrollmentId: enrollment.id,
            contactId: enrollment.contactId,
            programId: enrollment.programId,
          },
        },
      });

      return JSON.stringify({
        success: true,
        enrollmentId: enrollment.id,
        contactName: `${enrollment.contact.firstName} ${enrollment.contact.lastName}`,
        programName: enrollment.program.name,
        startDate: enrollment.startDate,
      });
    }

    case 'unenroll_contact': {
      const enrollment = await enrollmentService.unenroll(input.enrollmentId as string, organizationId);

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ASSISTANT_UNENROLL_CONTACT',
          metadata: { enrollmentId: enrollment.id, contactId: enrollment.contactId, programId: enrollment.programId },
        },
      });

      return JSON.stringify({
        success: true,
        enrollmentId: enrollment.id,
        contactName: `${enrollment.contact.firstName} ${enrollment.contact.lastName}`,
        programName: enrollment.program.name,
        endDate: enrollment.endDate,
      });
    }

    case 'update_contact_status': {
      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId as string, organizationId },
      });
      if (!contact) return JSON.stringify({ error: 'Contact not found' });

      const updated = await prisma.contact.update({
        where: { id: contact.id },
        data: { status: input.status as string },
        select: { id: true, firstName: true, lastName: true, status: true },
      });

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ASSISTANT_UPDATE_CONTACT_STATUS',
          metadata: { contactId: contact.id, oldStatus: contact.status, newStatus: input.status as string },
        },
      });

      return JSON.stringify({
        success: true,
        contactId: updated.id,
        name: `${updated.firstName} ${updated.lastName}`,
        status: updated.status,
      });
    }

    case 'void_invoice': {
      const invoice = await prisma.invoice.findFirst({
        where: { id: input.invoiceId as string, organizationId },
      });
      if (!invoice) return JSON.stringify({ error: 'Invoice not found' });
      if (invoice.status === 'paid') return JSON.stringify({ error: 'Cannot void a paid invoice' });
      if (invoice.status === 'void') return JSON.stringify({ error: 'Invoice is already void' });

      await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'void' } });

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ASSISTANT_VOID_INVOICE',
          metadata: { invoiceId: invoice.id },
        },
      });

      return JSON.stringify({ success: true, invoiceId: invoice.id });
    }

    case 'send_payment_reminder': {
      const invoice = await prisma.invoice.findFirst({
        where: { id: input.invoiceId as string, organizationId },
        include: {
          contact: { select: { firstName: true, lastName: true, email: true } },
          family: { select: { name: true, billingEmail: true } },
          organization: { select: { name: true, slug: true } },
        },
      });

      if (!invoice) return JSON.stringify({ error: 'Invoice not found' });
      if (invoice.status === 'paid') return JSON.stringify({ error: 'Invoice is already paid — no reminder needed' });
      if (invoice.status === 'void') return JSON.stringify({ error: 'Cannot send reminder for a voided invoice' });

      const recipientEmail = invoice.contact?.email ?? invoice.family?.billingEmail;
      const recipientName = invoice.contact
        ? `${invoice.contact.firstName} ${invoice.contact.lastName}`
        : (invoice.family?.name ?? 'Valued Member');

      if (!recipientEmail) {
        return JSON.stringify({ error: 'No email address on file for this contact or family' });
      }

      const portalUrl = `${PORTAL_URL}/${invoice.organization.slug}/invoices/${invoice.id}`;

      await sendPaymentReminder(recipientEmail, {
        recipientName,
        orgName: invoice.organization.name,
        invoiceNumber: invoice.invoiceNumber,
        amountDue: Number(invoice.amountDue) - Number(invoice.amountPaid),
        currency: 'USD',
        dueDate: invoice.dueDate,
        portalUrl,
      });

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ASSISTANT_SEND_REMINDER',
          metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, sentTo: recipientEmail },
        },
      });

      return JSON.stringify({ success: true, sentTo: recipientEmail, invoiceNumber: invoice.invoiceNumber });
    }

    case 'create_family': {
      const family = await familyService.createFamily({
        organizationId,
        name: input.name as string,
        billingEmail: input.billingEmail as string | undefined,
      });
      await prisma.auditLog.create({
        data: { organizationId, userId, action: 'ASSISTANT_CREATE_FAMILY', metadata: { familyId: family.id, name: family.name } },
      });
      return JSON.stringify({ success: true, familyId: family.id, name: family.name });
    }

    case 'create_program': {
      const program = await programService.createProgram({
        organizationId,
        name: input.name as string,
        price: input.price as number,
        billingFrequency: input.billingFrequency as string,
        description: input.description as string | undefined,
        capacity: input.capacity as number | undefined,
      });
      await prisma.auditLog.create({
        data: { organizationId, userId, action: 'ASSISTANT_CREATE_PROGRAM', metadata: { programId: program.id, name: program.name } },
      });
      return JSON.stringify({ success: true, programId: program.id, name: program.name, price: Number(program.price), billingFrequency: program.billingFrequency });
    }

    case 'update_program': {
      const updated = await programService.updateProgram(input.programId as string, organizationId, {
        name: input.name as string | undefined,
        price: input.price as number | undefined,
        billingFrequency: input.billingFrequency as string | undefined,
        description: input.description as string | undefined,
        isActive: input.isActive as boolean | undefined,
        capacity: input.capacity as number | undefined,
      });
      await prisma.auditLog.create({
        data: { organizationId, userId, action: 'ASSISTANT_UPDATE_PROGRAM', metadata: { programId: updated.id } },
      });
      return JSON.stringify({ success: true, programId: updated.id, name: updated.name, isActive: updated.isActive, price: Number(updated.price) });
    }

    case 'pause_enrollment': {
      const paused = await enrollmentService.pauseEnrollment(input.enrollmentId as string, organizationId);
      await prisma.auditLog.create({
        data: { organizationId, userId, action: 'ASSISTANT_PAUSE_ENROLLMENT', metadata: { enrollmentId: paused.id } },
      });
      return JSON.stringify({ success: true, enrollmentId: paused.id, status: paused.status });
    }

    case 'resume_enrollment': {
      const resumed = await enrollmentService.resumeEnrollment(input.enrollmentId as string, organizationId);
      await prisma.auditLog.create({
        data: { organizationId, userId, action: 'ASSISTANT_RESUME_ENROLLMENT', metadata: { enrollmentId: resumed.id } },
      });
      return JSON.stringify({ success: true, enrollmentId: resumed.id, status: resumed.status });
    }

    case 'run_billing': {
      const result = await billingService.generateDueInvoices(organizationId);
      await prisma.auditLog.create({
        data: { organizationId, userId, action: 'ASSISTANT_RUN_BILLING', metadata: JSON.parse(JSON.stringify(result)) },
      });
      return JSON.stringify({ success: true, ...result });
    }

    case 'refund_payment': {
      const paymentId = input.paymentId as string;
      await paymentService.refundPayment(paymentId, organizationId);
      await prisma.auditLog.create({
        data: { organizationId, userId, action: 'ASSISTANT_REFUND_PAYMENT', metadata: { paymentId } },
      });
      return JSON.stringify({ success: true, paymentId, status: 'refunded' });
    }

    case 'list_feedback': {
      const result = await feedbackService.list(organizationId, {
        status: input.status as string | undefined,
        type: input.type as string | undefined,
        limit: (input.limit as number | undefined) ?? 20,
      });
      return JSON.stringify({
        total: result.total,
        items: result.items.map((s: { id: string; subject: string; name: string; type: string; status: string; createdAt: Date; contact?: { firstName: string; lastName: string } | null }) => ({
          id: s.id,
          subject: s.subject,
          from: s.contact ? `${s.contact.firstName} ${s.contact.lastName}` : s.name,
          type: s.type,
          status: s.status,
          submitted: s.createdAt,
        })),
      });
    }

    case 'update_feedback_status': {
      const submission = await feedbackService.updateStatus(input.feedbackId as string, organizationId, input.status as string);
      await prisma.auditLog.create({
        data: { organizationId, userId, action: 'ASSISTANT_UPDATE_FEEDBACK_STATUS', metadata: { feedbackId: submission.id, status: submission.status } },
      });
      return JSON.stringify({ success: true, feedbackId: submission.id, status: submission.status });
    }

    case 'resend_portal_invite': {
      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId as string, organizationId },
        select: { id: true, firstName: true, email: true },
      });

      if (!contact) return JSON.stringify({ error: 'Contact not found' });
      if (!contact.email) return JSON.stringify({ error: 'Contact has no email address — add one first' });

      const existingUser = await prisma.user.findFirst({
        where: { organizationId, email: contact.email, deletedAt: null },
      });
      if (existingUser) return JSON.stringify({ error: 'Contact already has a portal account' });

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, slug: true },
      });
      if (!org) return JSON.stringify({ error: 'Organization not found' });

      const invite = await prisma.memberPortalInvite.create({
        data: { contactId: contact.id, email: contact.email },
      });

      await sendMemberPortalInvite(contact.email, {
        firstName: contact.firstName,
        orgName: org.name,
        orgSlug: org.slug,
        token: invite.token,
        baseDomain: config.multiTenant.baseDomain,
      });

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ASSISTANT_RESEND_PORTAL_INVITE',
          metadata: { contactId: contact.id, email: contact.email },
        },
      });

      return JSON.stringify({ success: true, sentTo: contact.email });
    }

    case 'create_contact': {
      const contact = await contactService.createContact({
        organizationId,
        firstName: toTitleCase(input.firstName as string),
        lastName: toTitleCase(input.lastName as string),
        email: input.email as string | undefined,
        phone: input.phone as string | undefined,
        familyId: input.familyId as string | undefined,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth as string) : undefined,
        notes: input.notes as string | undefined,
      });

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ASSISTANT_CREATE_CONTACT',
          metadata: { contactId: contact.id, name: `${contact.firstName} ${contact.lastName}` },
        },
      });

      return JSON.stringify({
        success: true,
        contactId: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        email: contact.email,
        status: contact.status,
      });
    }

    case 'filter_invoices_by_card_status': {
      const hasCard = input.hasCard as boolean;
      const status = input.status as string | undefined;
      const limit = Math.min((input.limit as number) ?? 20, 50);

      // Push the card-on-file filter to the DB so large orgs never get silently
      // truncated results. hasCard=true: either billed party has a saved method.
      // hasCard=false: NOT (contact has card) AND NOT (family has card).
      const cardFilter = hasCard
        ? {
            OR: [
              { contact: { stripeDefaultPaymentMethodId: { not: null } } },
              { family: { stripeDefaultPaymentMethodId: { not: null } } },
            ],
          }
        : {
            NOT: [
              { contact: { stripeDefaultPaymentMethodId: { not: null } } },
              { family: { stripeDefaultPaymentMethodId: { not: null } } },
            ],
          };

      const invoices = await prisma.invoice.findMany({
        where: { organizationId, ...(status && { status }), ...cardFilter },
        orderBy: { dueDate: 'asc' },
        take: limit,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          family: { select: { id: true, name: true } },
        },
      });

      return JSON.stringify({
        count: invoices.length,
        hasCard,
        invoices: invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          amountDue: Number(inv.amountDue),
          amountPaid: Number(inv.amountPaid),
          dueDate: inv.dueDate,
          billedTo: inv.contact
            ? { type: 'contact', id: inv.contact.id, name: `${inv.contact.firstName} ${inv.contact.lastName}` }
            : inv.family
            ? { type: 'family', id: inv.family.id, name: inv.family.name }
            : null,
        })),
      });
    }

    case 'list_sessions': {
      if (!classBookingEnabled) return JSON.stringify({ error: 'Class booking is not enabled for this organization.' });
      const days = Math.min((input.days as number) ?? 14, 90);
      const from = new Date();
      const to = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const programId = input.programId as string | undefined;

      const sessions = await prisma.classSession.findMany({
        where: {
          organizationId,
          ...(programId ? { programId } : {}),
          startsAt: { gte: from, lte: to },
          status: 'scheduled',
        },
        include: {
          program: { select: { name: true } },
          _count: { select: { bookings: { where: { status: 'confirmed' } } } },
        },
        orderBy: { startsAt: 'asc' },
        take: 50,
      });

      return JSON.stringify(
        sessions.map((s) => ({
          id: s.id,
          program: s.program.name,
          startsAt: s.startsAt,
          durationMinutes: s.durationMinutes,
          location: s.location,
          capacity: s.capacity,
          confirmed: s._count.bookings,
          spotsLeft: s.capacity !== null ? s.capacity - s._count.bookings : null,
          isRecurring: !!s.recurrenceSeriesId,
        }))
      );
    }

    case 'create_session': {
      if (!classBookingEnabled) return JSON.stringify({ error: 'Class booking is not enabled for this organization.' });
      const session = await sessionService.createSession(organizationId, {
        programId: input.programId as string,
        startsAt: input.startsAt as string,
        durationMinutes: input.durationMinutes as number,
        location: input.location as string | undefined,
        capacity: input.capacity as number | undefined,
        notes: input.notes as string | undefined,
      });

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ASSISTANT_CREATE_SESSION',
          metadata: { sessionId: session.id, programId: session.programId, startsAt: session.startsAt },
        },
      });

      return JSON.stringify({
        success: true,
        sessionId: session.id,
        startsAt: session.startsAt,
        durationMinutes: session.durationMinutes,
        location: session.location,
      });
    }

    case 'create_recurring_series': {
      if (!classBookingEnabled) return JSON.stringify({ error: 'Class booking is not enabled for this organization.' });
      const series = await sessionService.createSeries(organizationId, {
        programId: input.programId as string,
        daysOfWeek: input.daysOfWeek as string[],
        timeOfDay: input.timeOfDay as string,
        durationMinutes: input.durationMinutes as number,
        seriesStartDate: input.seriesStartDate as string,
        seriesEndDate: input.seriesEndDate as string | undefined,
        location: input.location as string | undefined,
        capacity: input.capacity as number | undefined,
        notes: input.notes as string | undefined,
      });

      const sessionCount = await prisma.classSession.count({
        where: { recurrenceSeriesId: series.id },
      });

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ASSISTANT_CREATE_SERIES',
          metadata: { seriesId: series.id, programId: series.programId, daysOfWeek: series.daysOfWeek, sessionsCreated: sessionCount },
        },
      });

      return JSON.stringify({
        success: true,
        seriesId: series.id,
        daysOfWeek: series.daysOfWeek,
        timeOfDay: series.timeOfDay,
        seriesStartDate: series.seriesStartDate,
        seriesEndDate: series.seriesEndDate,
        sessionsCreated: sessionCount,
      });
    }

    case 'get_session_roster': {
      if (!classBookingEnabled) return JSON.stringify({ error: 'Class booking is not enabled for this organization.' });
      const session = await sessionService.getSession(input.sessionId as string, organizationId);
      const confirmed = session.bookings.filter((b) => b.status === 'confirmed');

      return JSON.stringify({
        sessionId: session.id,
        startsAt: session.startsAt,
        durationMinutes: session.durationMinutes,
        location: session.location,
        capacity: session.capacity,
        confirmedCount: confirmed.length,
        roster: confirmed.map((b) => ({
          name: `${b.enrollment.contact.firstName} ${b.enrollment.contact.lastName}`,
          email: b.enrollment.contact.email,
          bookedAt: b.bookedAt,
        })),
      });
    }

    case 'cancel_session': {
      if (!classBookingEnabled) return JSON.stringify({ error: 'Class booking is not enabled for this organization.' });
      const scope = (input.scope as string) === 'future' ? 'future' : 'one';
      await sessionService.cancelSession(input.sessionId as string, organizationId, scope);

      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'ASSISTANT_CANCEL_SESSION',
          metadata: { sessionId: input.sessionId as string, scope },
        },
      });

      return JSON.stringify({
        success: true,
        sessionId: input.sessionId as string,
        scope,
        message: scope === 'future' ? 'This session and all future sessions in the series have been cancelled.' : 'Session cancelled.',
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function rethrowIfUnavailable(err: unknown): never {
  if (err instanceof APIError && (err.status === 429 || err.status === 402 || err.status === 529)) {
    throw new AppError(503, 'Mate is temporarily unavailable. Please try again later.');
  }
  throw err;
}

export async function chat(
  messages: ChatMessage[],
  organizationId: string,
  userId: string,
  classBookingEnabled = false
): Promise<string> {
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const MAX_ITERATIONS = 8;
  let iterations = 0;

  let response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    cache_control: { type: 'ephemeral' },
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages: anthropicMessages,
  }).catch(rethrowIfUnavailable);

  while (response.stop_reason === 'tool_use' && iterations < MAX_ITERATIONS) {
    iterations++;
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        let content: string;
        try {
          content = await executeTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            organizationId,
            userId,
            classBookingEnabled
          );
        } catch (err) {
          content = JSON.stringify({ error: (err as Error).message });
        }
        return { type: 'tool_result' as const, tool_use_id: toolUse.id, content };
      })
    );

    anthropicMessages.push({ role: 'assistant', content: response.content });
    anthropicMessages.push({ role: 'user', content: toolResults });

    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      cache_control: { type: 'ephemeral' },
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: anthropicMessages,
    }).catch(rethrowIfUnavailable);
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  return textBlock?.text ?? 'I was unable to generate a response.';
}
