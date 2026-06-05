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
