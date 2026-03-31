import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../../../src/config/database';
import { AppError } from '../../../src/middleware/errorHandler';
import invoiceService from '../../../src/services/invoiceService';

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const ORG_ID = 'org-1';
const INVOICE_ID = 'inv-1';
const CONTACT_ID = 'contact-1';
const FAMILY_ID = 'family-1';

const makeInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: INVOICE_ID,
  organizationId: ORG_ID,
  contactId: CONTACT_ID,
  familyId: null,
  invoiceNumber: 'INV-00001',
  status: 'draft',
  amountDue: new Decimal(100),
  amountPaid: new Decimal(0),
  paidAt: null,
  dueDate: new Date('2026-04-30'),
  notes: null,
  lineItems: [],
  contact: null,
  family: null,
  payments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createInvoice
// ---------------------------------------------------------------------------

describe('invoiceService.createInvoice', () => {
  it('throws 400 if neither contactId nor familyId is provided', async () => {
    await expect(
      invoiceService.createInvoice({
        organizationId: ORG_ID,
        dueDate: new Date('2026-04-30'),
        lineItems: [{ description: 'Lesson', unitPrice: 50 }],
      })
    ).rejects.toMatchObject({ statusCode: 400, message: 'Invoice must be assigned to a contact or family' });

    expect(prisma.invoice.create).not.toHaveBeenCalled();
  });

  it('calculates amountDue as sum of quantity * unitPrice across all line items', async () => {
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
    const expectedAmount = 50 * 2 + 30 * 1; // 130
    const createdInvoice = makeInvoice({ amountDue: new Decimal(expectedAmount) });
    (prisma.invoice.create as jest.Mock).mockResolvedValue(createdInvoice);

    await invoiceService.createInvoice({
      organizationId: ORG_ID,
      contactId: CONTACT_ID,
      dueDate: new Date('2026-04-30'),
      lineItems: [
        { description: 'Swim class', quantity: 2, unitPrice: 50 },
        { description: 'Equipment', quantity: 1, unitPrice: 30 },
      ],
    });

    const callArg = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
    expect(callArg.data.amountDue.toNumber()).toBe(130);
  });

  it('generates invoice number as INV-00001 when count is 0', async () => {
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice({ invoiceNumber: 'INV-00001' }));

    await invoiceService.createInvoice({
      organizationId: ORG_ID,
      contactId: CONTACT_ID,
      dueDate: new Date('2026-04-30'),
      lineItems: [{ description: 'Lesson', unitPrice: 50 }],
    });

    const callArg = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
    expect(callArg.data.invoiceNumber).toBe('INV-00001');
  });

  it('generates a padded invoice number based on count + 1', async () => {
    (prisma.invoice.count as jest.Mock).mockResolvedValue(99);
    (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice({ invoiceNumber: 'INV-00100' }));

    await invoiceService.createInvoice({
      organizationId: ORG_ID,
      contactId: CONTACT_ID,
      dueDate: new Date('2026-04-30'),
      lineItems: [{ description: 'Lesson', unitPrice: 50 }],
    });

    const callArg = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
    expect(callArg.data.invoiceNumber).toBe('INV-00100');
  });

  it('creates line items with correct quantities and totals', async () => {
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice());

    await invoiceService.createInvoice({
      organizationId: ORG_ID,
      contactId: CONTACT_ID,
      dueDate: new Date('2026-04-30'),
      lineItems: [{ description: 'Swim class', quantity: 3, unitPrice: 25 }],
    });

    const callArg = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
    const lineItem = callArg.data.lineItems.create[0];
    expect(lineItem.description).toBe('Swim class');
    expect(lineItem.quantity).toBe(3);
    expect(lineItem.unitPrice.toNumber()).toBe(25);
    expect(lineItem.total.toNumber()).toBe(75); // 3 * 25
  });

  it('defaults quantity to 1 when not provided', async () => {
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice());

    await invoiceService.createInvoice({
      organizationId: ORG_ID,
      contactId: CONTACT_ID,
      dueDate: new Date('2026-04-30'),
      lineItems: [{ description: 'One-off fee', unitPrice: 40 }],
    });

    const callArg = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
    const lineItem = callArg.data.lineItems.create[0];
    expect(lineItem.quantity).toBe(1);
    expect(lineItem.total.toNumber()).toBe(40);
    // amountDue should also reflect quantity=1
    expect(callArg.data.amountDue.toNumber()).toBe(40);
  });

  it('accepts familyId instead of contactId', async () => {
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (prisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice({ contactId: null, familyId: FAMILY_ID }));

    await expect(
      invoiceService.createInvoice({
        organizationId: ORG_ID,
        familyId: FAMILY_ID,
        dueDate: new Date('2026-04-30'),
        lineItems: [{ description: 'Fee', unitPrice: 20 }],
      })
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getInvoiceById
// ---------------------------------------------------------------------------

describe('invoiceService.getInvoiceById', () => {
  it('returns the invoice when found', async () => {
    const invoice = makeInvoice();
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(invoice);

    const result = await invoiceService.getInvoiceById(INVOICE_ID, ORG_ID);

    expect(result).toEqual(invoice);
    const callArg = (prisma.invoice.findFirst as jest.Mock).mock.calls[0][0];
    expect(callArg.where).toMatchObject({ id: INVOICE_ID, organizationId: ORG_ID });
  });

  it('throws AppError 404 when invoice is not found', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(invoiceService.getInvoiceById(INVOICE_ID, ORG_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Invoice not found',
    });
  });
});

// ---------------------------------------------------------------------------
// markAsPaid
// ---------------------------------------------------------------------------

describe('invoiceService.markAsPaid', () => {
  it('throws 400 if the invoice is already paid', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(makeInvoice({ status: 'paid' }));

    await expect(invoiceService.markAsPaid(INVOICE_ID, ORG_ID)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invoice is already paid',
    });

    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });

  it('updates status to paid, sets amountPaid equal to amountDue, and sets paidAt', async () => {
    const amountDue = new Decimal(150);
    const draftInvoice = makeInvoice({ status: 'draft', amountDue });
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(draftInvoice);
    const paidInvoice = makeInvoice({ status: 'paid', amountPaid: amountDue, paidAt: new Date() });
    (prisma.invoice.update as jest.Mock).mockResolvedValue(paidInvoice);

    const result = await invoiceService.markAsPaid(INVOICE_ID, ORG_ID);

    expect(prisma.invoice.update).toHaveBeenCalledTimes(1);
    const callArg = (prisma.invoice.update as jest.Mock).mock.calls[0][0];
    expect(callArg.where).toEqual({ id: INVOICE_ID });
    expect(callArg.data.status).toBe('paid');
    expect(callArg.data.amountPaid).toEqual(amountDue);
    expect(callArg.data.paidAt).toBeInstanceOf(Date);
    expect(result).toEqual(paidInvoice);
  });
});

// ---------------------------------------------------------------------------
// voidInvoice
// ---------------------------------------------------------------------------

describe('invoiceService.voidInvoice', () => {
  it('throws 400 if the invoice is already paid', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(makeInvoice({ status: 'paid' }));

    await expect(invoiceService.voidInvoice(INVOICE_ID, ORG_ID)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Cannot void a paid invoice',
    });

    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });

  it('updates status to void for an unpaid invoice', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(makeInvoice({ status: 'draft' }));
    const voidedInvoice = makeInvoice({ status: 'void' });
    (prisma.invoice.update as jest.Mock).mockResolvedValue(voidedInvoice);

    const result = await invoiceService.voidInvoice(INVOICE_ID, ORG_ID);

    expect(prisma.invoice.update).toHaveBeenCalledTimes(1);
    const callArg = (prisma.invoice.update as jest.Mock).mock.calls[0][0];
    expect(callArg.where).toEqual({ id: INVOICE_ID });
    expect(callArg.data).toEqual({ status: 'void' });
    expect(result).toEqual(voidedInvoice);
  });

  it('voids a sent (non-paid) invoice', async () => {
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(makeInvoice({ status: 'sent' }));
    (prisma.invoice.update as jest.Mock).mockResolvedValue(makeInvoice({ status: 'void' }));

    await expect(invoiceService.voidInvoice(INVOICE_ID, ORG_ID)).resolves.toBeDefined();
    const callArg = (prisma.invoice.update as jest.Mock).mock.calls[0][0];
    expect(callArg.data.status).toBe('void');
  });
});

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------

describe('invoiceService.getStats', () => {
  it('returns total, paid, overdue, draft, totalAmountDue, and totalAmountPaid', async () => {
    (prisma.invoice.count as jest.Mock)
      .mockResolvedValueOnce(50)  // total
      .mockResolvedValueOnce(20)  // paid
      .mockResolvedValueOnce(5)   // overdue
      .mockResolvedValueOnce(10); // draft

    (prisma.invoice.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { amountDue: new Decimal(5000) } })  // amtDue
      .mockResolvedValueOnce({ _sum: { amountPaid: new Decimal(2000) } }); // amtPaid

    const result = await invoiceService.getStats(ORG_ID);

    expect(result).toEqual({
      total: 50,
      paid: 20,
      overdue: 5,
      draft: 10,
      totalAmountDue: 5000,
      totalAmountPaid: 2000,
    });
  });

  it('handles null aggregate sums by returning 0', async () => {
    (prisma.invoice.count as jest.Mock)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    (prisma.invoice.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { amountDue: null } })
      .mockResolvedValueOnce({ _sum: { amountPaid: null } });

    const result = await invoiceService.getStats(ORG_ID);

    expect(result.totalAmountDue).toBe(0);
    expect(result.totalAmountPaid).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// markOverdueInvoices
// ---------------------------------------------------------------------------

describe('invoiceService.markOverdueInvoices', () => {
  it('calls updateMany with status filter for draft and sent, and dueDate < today', async () => {
    (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

    const result = await invoiceService.markOverdueInvoices();

    expect(prisma.invoice.updateMany).toHaveBeenCalledTimes(1);
    const callArg = (prisma.invoice.updateMany as jest.Mock).mock.calls[0][0];
    expect(callArg.where.status).toEqual({ in: ['draft', 'sent'] });
    expect(callArg.where.dueDate).toHaveProperty('lt');
    expect(callArg.where.dueDate.lt).toBeInstanceOf(Date);
    expect(callArg.data).toEqual({ status: 'overdue' });
    expect(result).toBe(3);
  });

  it('returns 0 when no invoices are overdue', async () => {
    (prisma.invoice.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const result = await invoiceService.markOverdueInvoices();

    expect(result).toBe(0);
  });
});
