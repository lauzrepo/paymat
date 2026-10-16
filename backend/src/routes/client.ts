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
import { Prisma } from '@prisma/client';
import sessionService from '../services/sessionService';
import enrollmentService from '../services/enrollmentService';
import { nextInvoiceNumber } from '../utils/invoiceNumber';
import { advanceBillingDate } from '../utils/billing';
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

// ── Family: children ──────────────────────────────────────────────────────────

/**
 * Resolves the contact an action applies to: the logged-in user's own contact,
 * or — if `targetId` is given — a dependent in the same family. Only guardians
 * may act on behalf of dependents.
 */
async function resolveActingContact(req: import('express').Request, targetId?: string) {
  const me = await prisma.contact.findFirst({
    where: { user: { id: req.user!.userId }, organizationId: req.organization!.id },
    select: { id: true, familyId: true, familyRole: true },
  });
  if (!me) throw new AppError(404, 'Contact not found');
  if (!targetId || targetId === me.id) return me;

  if (me.familyRole !== 'guardian' || !me.familyId) {
    throw new AppError(403, 'Only a guardian can act on behalf of a family member');
  }
  const child = await prisma.contact.findFirst({
    where: {
      id: targetId,
      organizationId: req.organization!.id,
      familyId: me.familyId,
      familyRole: 'dependent',
      status: 'active',
    },
    select: { id: true, familyId: true, familyRole: true },
  });
  if (!child) throw new AppError(404, 'Family member not found');
  return child;
}

// GET /api/client/children — dependents in the guardian's family
router.get('/children', asyncHandler(async (req, res) => {
  const me = await resolveActingContact(req);
  const children = me.familyRole === 'guardian' && me.familyId
    ? await prisma.contact.findMany({
        where: { organizationId: req.organization!.id, familyId: me.familyId, familyRole: 'dependent', status: 'active' },
        select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
        orderBy: { firstName: 'asc' },
      })
    : [];
  res.json({ status: 'success', data: { children } });
}));

// POST /api/client/children — add a dependent (no email or login needed)
router.post('/children', asyncHandler(async (req, res) => {
  const me = await resolveActingContact(req);
  if (me.familyRole !== 'guardian') throw new AppError(403, 'Only a guardian can add family members');

  const firstName = typeof req.body.firstName === 'string' ? req.body.firstName.trim() : '';
  const lastName = typeof req.body.lastName === 'string' ? req.body.lastName.trim() : '';
  if (!firstName || !lastName) throw new AppError(400, 'First and last name are required');

  let dateOfBirth: Date | undefined;
  if (req.body.dateOfBirth) {
    dateOfBirth = new Date(req.body.dateOfBirth);
    if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date()) {
      throw new AppError(400, 'Invalid date of birth');
    }
  }

  // Parents without a family yet get one created, so billing can be shared
  let familyId = me.familyId;
  if (!familyId) {
    const parent = await prisma.contact.findUnique({ where: { id: me.id }, select: { lastName: true } });
    const family = await prisma.family.create({
      data: { organizationId: req.organization!.id, name: `${parent?.lastName ?? lastName} Family` },
    });
    familyId = family.id;
    await prisma.contact.update({ where: { id: me.id }, data: { familyId } });
  }

  const child = await prisma.contact.create({
    data: { organizationId: req.organization!.id, familyId, familyRole: 'dependent', firstName, lastName, dateOfBirth },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
  });
  res.status(201).json({ status: 'success', data: { child } });
}));

// ── Self-enrollment ───────────────────────────────────────────────────────────

function requireClassBookingForEnroll(req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) {
  if (!req.organization!.classBookingEnabled) {
    throw new AppError(403, 'Class booking is not enabled for this organization');
  }
  next();
}

// GET /api/client/programs — programs open for self-enrollment the member isn't already in
router.get('/programs', requireClassBookingForEnroll, asyncHandler(async (req, res) => {
  const contact = await resolveActingContact(req, req.query.contactId as string | undefined);

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
router.post('/programs/:id/enroll', requireClassBookingForEnroll, asyncHandler(async (req, res) => {
  const contact = await resolveActingContact(req, req.body?.contactId as string | undefined);

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

  // Create enrollment. Catch P2002 (unique constraint) from concurrent requests
  // so the second request gets a clean 409 rather than a 500.
  let enrollment;
  try {
    enrollment = await enrollmentService.enroll({
      contactId: contact.id,
      programId: program.id,
      organizationId: req.organization!.id,
      startDate: new Date(),
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, 'Already enrolled in this program');
    }
    throw err;
  }

  // Create the invoice immediately so the member can pay via the portal
  const today = new Date();
  const invoiceNumber = await nextInvoiceNumber();
  const invoice = await prisma.invoice.create({
    data: {
      organizationId: req.organization!.id,
      // Dependents are billed to the family so the guardian can see and pay the invoice
      ...(contact.familyRole === 'dependent' ? { familyId: contact.familyId } : { contactId: contact.id }),
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
  const nextBillingDate = advanceBillingDate(today, program.billingFrequency);
  await prisma.enrollment.update({ where: { id: enrollment.id }, data: { nextBillingDate } });

  res.status(201).json({ status: 'success', data: { enrollment, invoice } });
}));

// ── Class sessions ────────────────────────────────────────────────────────────

function requireClassBooking(req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) {
  if (!req.organization!.classBookingEnabled) {
    throw new AppError(403, 'Class booking is not enabled for this organization');
  }
  next();
}

// GET /api/client/sessions/upcoming
router.get('/sessions/upcoming', requireClassBooking, asyncHandler(async (req, res) => {
  const contact = await prisma.contact.findFirst({
    where: { user: { id: req.user!.userId }, organizationId: req.organization!.id },
    select: { id: true },
  });
  if (!contact) throw new AppError(404, 'Contact not found');
  const sessions = await sessionService.getUpcomingSessions(req.organization!.id, contact.id);
  res.json({ status: 'success', data: sessions });
}));

// POST /api/client/sessions/:id/book
router.post('/sessions/:id/book', requireClassBooking, asyncHandler(async (req, res) => {
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
router.delete('/sessions/:id/book', requireClassBooking, asyncHandler(async (req, res) => {
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
