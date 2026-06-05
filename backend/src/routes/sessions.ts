import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import sessionService from '../services/sessionService';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'staff'));

// GET /api/sessions?programId=&from=&to=
router.get('/', asyncHandler(async (req, res) => {
  const { programId, from, to } = req.query;
  if (!programId || !from || !to) throw new AppError(400, 'programId, from, and to are required');
  const fromDate = new Date(from as string);
  const toDate = new Date(to as string);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw new AppError(400, 'from and to must be valid ISO date strings');
  }
  const sessions = await sessionService.getSessions(
    req.organization!.id,
    programId as string,
    fromDate,
    toDate,
  );
  res.json({ status: 'success', data: sessions });
}));

// POST /api/sessions — create one-off session
router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const { programId, startsAt, durationMinutes, location, capacity, notes } = req.body;
  if (!programId || !startsAt || !durationMinutes) throw new AppError(400, 'programId, startsAt, and durationMinutes are required');
  const session = await sessionService.createSession(req.organization!.id, {
    programId, startsAt, durationMinutes, location, capacity, notes,
  });
  res.status(201).json({ status: 'success', data: session });
}));

// POST /api/sessions/series — create recurring series
router.post('/series', requireRole('admin'), asyncHandler(async (req, res) => {
  const { programId, daysOfWeek, timeOfDay, durationMinutes, location, capacity, notes, seriesStartDate, seriesEndDate } = req.body;
  if (!programId || !daysOfWeek?.length || !timeOfDay || !durationMinutes || !seriesStartDate) {
    throw new AppError(400, 'programId, daysOfWeek, timeOfDay, durationMinutes, and seriesStartDate are required');
  }
  const series = await sessionService.createSeries(req.organization!.id, {
    programId, daysOfWeek, timeOfDay, durationMinutes, location, capacity, notes, seriesStartDate, seriesEndDate,
  });
  res.status(201).json({ status: 'success', data: series });
}));

// GET /api/sessions/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const session = await sessionService.getSession(req.params.id as string, req.organization!.id);
  res.json({ status: 'success', data: session });
}));

// PUT /api/sessions/:id?scope=one|future
router.put('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const scope = (req.query.scope as string) === 'future' ? 'future' : 'one';
  const session = await sessionService.updateSession(
    req.params.id as string,
    req.organization!.id,
    req.body,
    scope,
  );
  res.json({ status: 'success', data: session });
}));

// DELETE /api/sessions/:id?scope=one|future
router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const scope = (req.query.scope as string) === 'future' ? 'future' : 'one';
  await sessionService.cancelSession(req.params.id as string, req.organization!.id, scope);
  res.json({ status: 'success', message: 'Session cancelled' });
}));

// DELETE /api/sessions/:id/bookings/:bookingId — admin cancel a booking
router.delete('/:id/bookings/:bookingId', requireRole('admin'), asyncHandler(async (req, res) => {
  await sessionService.cancelBooking(req.params.bookingId as string, req.organization!.id);
  res.json({ status: 'success', message: 'Booking cancelled' });
}));

export default router;
