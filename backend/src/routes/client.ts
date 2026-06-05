import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getMe,
  getMyEnrollments,
  getMyInvoices,
  getMyInvoice,
  initializeInvoicePayment,
  confirmInvoicePayment,
  getMyPayments,
  getAutopayStatus,
  initializeAutopay,
  confirmAutopay,
  removeAutopay,
} from '../controllers/clientController';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import sessionService from '../services/sessionService';
import enrollmentService from '../services/enrollmentService';
import { nextInvoiceNumber } from '../utils/invoiceNumber';
import prisma from '../config/database';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('client', 'admin', 'staff')); // admins can test client views

router.get('/me', getMe);
router.get('/enrollments', getMyEnrollments);
router.get('/invoices', getMyInvoices);
router.get('/invoices/:id', getMyInvoice);
router.post('/invoices/:id/initialize-payment', initializeInvoicePayment);
router.post('/invoices/:id/confirm-payment', confirmInvoicePayment);
router.get('/payments', getMyPayments);

router.get('/autopay', getAutopayStatus);
router.post('/autopay/initialize', initializeAutopay);
router.post('/autopay/confirm', confirmAutopay);
router.delete('/autopay', removeAutopay);

// ── Self-enrollment ───────────────────────────────────────────────────────────

// GET /api/client/programs — programs open for self-enrollment the member isn't already in
router.get('/programs', asyncHandler(async (req, res) => {
  const contact = await prisma.contact.findFirst({
    where: { user: { id: req.user!.userId }, organizationId: req.organization!.id },
    select: { id: true },
  });
  if (!contact) throw new AppError(404, 'Contact not found');

  const activeEnrollments = await prisma.enrollment.findMany({
    where: { contactId: contact.id, status: 'active' },
    select: { programId: true },
  });
  const enrolledIds = activeEnrollments.map((e) => e.programId);

  const programs = await prisma.program.findMany({
    where: {
      organizationId: req.organization!.id,
      allowSelfEnrollment: true,
      isActive: true,
      ...(enrolledIds.length ? { id: { notIn: enrolledIds } } : {}),
    },
    select: { id: true, name: true, description: true, price: true, billingFrequency: true, maxClasses: true },
    orderBy: { name: 'asc' },
  });

  res.json({ status: 'success', data: { programs } });
}));

// POST /api/client/programs/:id/enroll — self-enroll in a program
router.post('/programs/:id/enroll', asyncHandler(async (req, res) => {
  const contact = await prisma.contact.findFirst({
    where: { user: { id: req.user!.userId }, organizationId: req.organization!.id },
    select: { id: true },
  });
  if (!contact) throw new AppError(404, 'Contact not found');

  const program = await prisma.program.findFirst({
    where: {
      id: req.params.id as string,
      organizationId: req.organization!.id,
      allowSelfEnrollment: true,
      isActive: true,
    },
  });
  if (!program) throw new AppError(404, 'Program not found or not open for self-enrollment');

  const existing = await prisma.enrollment.findFirst({
    where: { contactId: contact.id, programId: program.id, status: 'active' },
  });
  if (existing) throw new AppError(409, 'Already enrolled in this program');

  // Create enrollment — nextBillingDate starts as today; we'll null it out below
  // after creating the invoice so the billing cron doesn't double-bill.
  const enrollment = await enrollmentService.enroll({
    contactId: contact.id,
    programId: program.id,
    organizationId: req.organization!.id,
    startDate: new Date(),
  });

  // Create the invoice immediately so the member can pay via the portal
  const today = new Date();
  const invoiceNumber = await nextInvoiceNumber();
  const invoice = await prisma.invoice.create({
    data: {
      organizationId: req.organization!.id,
      contactId: contact.id,
      invoiceNumber,
      amountDue: program.price,
      dueDate: today,
      status: 'sent',
      notes: `Self-enrollment — ${program.name}`,
      lineItems: {
        create: [{
          description: program.name,
          quantity: 1,
          unitPrice: program.price,
          total: program.price,
          enrollmentId: enrollment.id,
        }],
      },
    },
    select: { id: true, invoiceNumber: true, amountDue: true },
  });

  // Advance nextBillingDate past today so the billing cron doesn't re-invoice
  const nextBillingDate = (() => {
    const d = new Date(today);
    if (program.billingFrequency === 'one_time') return null;
    if (program.billingFrequency === 'weekly') { d.setUTCDate(d.getUTCDate() + 7); return d; }
    if (program.billingFrequency === 'monthly') { d.setUTCMonth(d.getUTCMonth() + 1); return d; }
    if (program.billingFrequency === 'yearly') { d.setUTCFullYear(d.getUTCFullYear() + 1); return d; }
    return null;
  })();
  await prisma.enrollment.update({ where: { id: enrollment.id }, data: { nextBillingDate } });

  res.status(201).json({ status: 'success', data: { enrollment, invoice } });
}));

// ── Class sessions ────────────────────────────────────────────────────────────

// GET /api/client/sessions/upcoming
router.get('/sessions/upcoming', asyncHandler(async (req, res) => {
  const contact = await prisma.contact.findFirst({
    where: { user: { id: req.user!.userId }, organizationId: req.organization!.id },
    select: { id: true },
  });
  if (!contact) throw new AppError(404, 'Contact not found');
  const sessions = await sessionService.getUpcomingSessions(req.organization!.id, contact.id);
  res.json({ status: 'success', data: sessions });
}));

// POST /api/client/sessions/:id/book
router.post('/sessions/:id/book', asyncHandler(async (req, res) => {
  const contact = await prisma.contact.findFirst({
    where: { user: { id: req.user!.userId }, organizationId: req.organization!.id },
    select: { id: true },
  });
  if (!contact) throw new AppError(404, 'Contact not found');

  const [sessionRow] = await prisma.$queryRaw<{ program_id: string }[]>`
    SELECT program_id FROM class_sessions
    WHERE id = ${req.params.id as string}
      AND organization_id = ${req.organization!.id}
    LIMIT 1
  `;
  if (!sessionRow) throw new AppError(404, 'Session not found');

  const enrollment = await prisma.enrollment.findFirst({
    where: { contactId: contact.id, programId: sessionRow.program_id, status: 'active' },
  });
  if (!enrollment) throw new AppError(404, 'No active enrollment for this session');

  const booking = await sessionService.bookSession(
    req.params.id as string,
    enrollment.id,
    req.organization!.id,
  );
  res.status(201).json({ status: 'success', data: booking });
}));

// DELETE /api/client/sessions/:id/book
router.delete('/sessions/:id/book', asyncHandler(async (req, res) => {
  const contact = await prisma.contact.findFirst({
    where: { user: { id: req.user!.userId }, organizationId: req.organization!.id },
    select: { id: true },
  });
  if (!contact) throw new AppError(404, 'Contact not found');

  const [bookingRow] = await prisma.$queryRaw<{ id: string }[]>`
    SELECT sb.id FROM session_bookings sb
    JOIN enrollments e ON e.id = sb.enrollment_id
    WHERE sb.session_id = ${req.params.id as string}
      AND sb.organization_id = ${req.organization!.id}
      AND sb.status = 'confirmed'
      AND e.contact_id = ${contact.id}
    LIMIT 1
  `;
  if (!bookingRow) throw new AppError(404, 'Booking not found');

  await sessionService.cancelBooking(bookingRow.id, req.organization!.id);
  res.json({ status: 'success', message: 'Booking cancelled' });
}));

export default router;
