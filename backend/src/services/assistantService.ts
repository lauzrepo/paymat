import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import invoiceService from './invoiceService';
import paymentService from './paymentService';
import enrollmentService from './enrollmentService';
import { sendInvoiceGenerated } from './emailService';
import { config } from '../config/environment';

const PORTAL_URL = config.email.appUrl.replace('app.', 'portal.');

const anthropic = new Anthropic();

const MODEL = 'claude-haiku-4-5';

const SYSTEM_PROMPT = `You are Mate, an AI assistant for Paymat, a SaaS billing platform for activity-based businesses (gyms, studios, tutoring centers, camps, etc.).

You help administrators:
- Answer questions about invoices, payments, contacts, families, and programs using live data
- Provide revenue summaries and insights
- Take billing actions: create invoices, record manual payments, void invoices

Data model overview:
- Contact: an individual member/client (firstName, lastName, email, status: active/inactive)
- Family: a billing unit grouping multiple contacts (name, billingEmail)
- Program: a recurring or one-time service (name, price, billingFrequency)
- Enrollment: a contact enrolled in a program
- Invoice: a bill (status: draft/sent/paid/overdue/void; amountDue, amountPaid, dueDate)
- Payment: a recorded payment against an invoice (status: succeeded/failed/refunded; paymentMethodType: cash/check/bank_transfer/other/card)

Rules:
- Always query live data before answering data-specific questions
- For destructive actions (void, record payment), confirm once with the user before executing
- Format currency as USD (e.g. $99.00)
- Keep responses concise. Use bullet points for lists
- If a requested contact or invoice isn't found, say so and offer to search more broadly`;

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
];

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  organizationId: string,
  userId: string
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

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chat(
  messages: ChatMessage[],
  organizationId: string,
  userId: string
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
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages: anthropicMessages,
  });

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
            userId
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
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: anthropicMessages,
    });
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  return textBlock?.text ?? 'I was unable to generate a response.';
}
