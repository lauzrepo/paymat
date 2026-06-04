import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addWeeks(date: Date, n: number): Date {
  return addDays(date, n * 7);
}

function buildSessionsInRange(
  series: {
    id: string;
    organizationId: string;
    programId: string;
    daysOfWeek: string[];
    timeOfDay: string;
    durationMinutes: number;
    location: string | null;
    capacity: number | null;
    notes: string | null;
  },
  from: Date,
  to: Date,
) {
  const sessions = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= to) {
    const dayKey = DAY_NAMES[cursor.getDay()];
    if (series.daysOfWeek.includes(dayKey)) {
      const [h, m] = series.timeOfDay.split(':').map(Number);
      const startsAt = new Date(cursor);
      startsAt.setHours(h, m, 0, 0);
      sessions.push({
        organizationId: series.organizationId,
        programId: series.programId,
        recurrenceSeriesId: series.id,
        startsAt,
        durationMinutes: series.durationMinutes,
        location: series.location,
        capacity: series.capacity,
        notes: series.notes,
        status: 'scheduled',
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return sessions;
}

class SessionService {
  // ── Single session ───────────────────────────────────────────────────────────

  async createSession(organizationId: string, data: {
    programId: string;
    startsAt: string;
    durationMinutes: number;
    location?: string;
    capacity?: number;
    notes?: string;
  }) {
    return prisma.classSession.create({
      data: {
        organizationId,
        programId: data.programId,
        startsAt: new Date(data.startsAt),
        durationMinutes: data.durationMinutes,
        location: data.location ?? null,
        capacity: data.capacity ?? null,
        notes: data.notes ?? null,
      },
    });
  }

  async getSessions(organizationId: string, programId: string, from: Date, to: Date) {
    return prisma.classSession.findMany({
      where: {
        organizationId,
        programId,
        startsAt: { gte: from, lte: to },
      },
      include: {
        _count: { select: { bookings: { where: { status: 'confirmed' } } } },
        recurrenceSeries: { select: { id: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async getSession(sessionId: string, organizationId: string) {
    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, organizationId },
      include: {
        bookings: {
          where: { status: { not: 'cancelled' } },
          include: {
            enrollment: {
              include: {
                contact: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
          orderBy: { bookedAt: 'asc' },
        },
        recurrenceSeries: true,
      },
    });
    if (!session) throw new AppError(404, 'Session not found');
    return session;
  }

  async updateSession(
    sessionId: string,
    organizationId: string,
    data: { startsAt?: string; durationMinutes?: number; location?: string | null; capacity?: number | null; notes?: string | null },
    scope: 'one' | 'future',
  ) {
    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, organizationId },
    });
    if (!session) throw new AppError(404, 'Session not found');

    const update = {
      ...(data.startsAt !== undefined && { startsAt: new Date(data.startsAt) }),
      ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
      ...(data.notes !== undefined && { notes: data.notes }),
    };

    if (scope === 'one' || !session.recurrenceSeriesId) {
      return prisma.classSession.update({ where: { id: sessionId }, data: update });
    }

    // future sessions in same series
    await prisma.classSession.updateMany({
      where: {
        recurrenceSeriesId: session.recurrenceSeriesId,
        startsAt: { gte: session.startsAt },
        status: 'scheduled',
      },
      data: update,
    });

    // also update the series template so new materialisations inherit the change
    if (data.durationMinutes !== undefined || data.location !== undefined || data.capacity !== undefined || data.notes !== undefined) {
      await prisma.recurrenceSeries.update({
        where: { id: session.recurrenceSeriesId },
        data: {
          ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
          ...(data.location !== undefined && { location: data.location }),
          ...(data.capacity !== undefined && { capacity: data.capacity }),
          ...(data.notes !== undefined && { notes: data.notes }),
        },
      });
    }
    return prisma.classSession.findUniqueOrThrow({ where: { id: sessionId } });
  }

  async cancelSession(sessionId: string, organizationId: string, scope: 'one' | 'future') {
    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, organizationId },
    });
    if (!session) throw new AppError(404, 'Session not found');

    if (scope === 'one' || !session.recurrenceSeriesId) {
      await prisma.classSession.update({ where: { id: sessionId }, data: { status: 'cancelled' } });
      return;
    }

    await prisma.classSession.updateMany({
      where: {
        recurrenceSeriesId: session.recurrenceSeriesId,
        startsAt: { gte: session.startsAt },
        status: 'scheduled',
      },
      data: { status: 'cancelled' },
    });
  }

  // ── Series ───────────────────────────────────────────────────────────────────

  async createSeries(organizationId: string, data: {
    programId: string;
    daysOfWeek: string[];
    timeOfDay: string;
    durationMinutes: number;
    location?: string;
    capacity?: number;
    notes?: string;
    seriesStartDate: string;
    seriesEndDate?: string;
  }) {
    const seriesStart = new Date(data.seriesStartDate);
    const seriesEnd = data.seriesEndDate
      ? new Date(data.seriesEndDate)
      : addWeeks(seriesStart, 12);

    const series = await prisma.recurrenceSeries.create({
      data: {
        organizationId,
        programId: data.programId,
        daysOfWeek: data.daysOfWeek,
        timeOfDay: data.timeOfDay,
        durationMinutes: data.durationMinutes,
        location: data.location ?? null,
        capacity: data.capacity ?? null,
        notes: data.notes ?? null,
        seriesStartDate: seriesStart,
        seriesEndDate: data.seriesEndDate ? new Date(data.seriesEndDate) : null,
      },
    });

    const sessionData = buildSessionsInRange(series, seriesStart, seriesEnd);
    if (sessionData.length > 0) {
      await prisma.classSession.createMany({ data: sessionData });
    }
    return series;
  }

  // Extend open-ended series that are running out of materialised sessions (12-week window)
  async expandRecurringSeries(organizationId?: string) {
    const where = {
      seriesEndDate: null,
      deletedAt: null,
      ...(organizationId && { organizationId }),
    };
    const openSeries = await prisma.recurrenceSeries.findMany({ where });

    const horizon = addWeeks(new Date(), 12);

    for (const series of openSeries) {
      const lastSession = await prisma.classSession.findFirst({
        where: { recurrenceSeriesId: series.id },
        orderBy: { startsAt: 'desc' },
      });

      const from = lastSession
        ? addDays(lastSession.startsAt, 1)
        : new Date();

      if (from >= horizon) continue;

      const newSessions = buildSessionsInRange(series, from, horizon);
      if (newSessions.length > 0) {
        await prisma.classSession.createMany({ data: newSessions, skipDuplicates: true });
      }
    }
  }

  // ── Booking ──────────────────────────────────────────────────────────────────

  async bookSession(sessionId: string, enrollmentId: string, organizationId: string) {
    const [session, enrollment] = await Promise.all([
      prisma.classSession.findFirst({ where: { id: sessionId, organizationId } }),
      prisma.enrollment.findFirst({
        where: { id: enrollmentId, status: 'active' },
        include: { program: true },
      }),
    ]);

    if (!session) throw new AppError(404, 'Session not found');
    if (session.status === 'cancelled') throw new AppError(400, 'Session is cancelled');
    if (enrollment?.programId !== session.programId) throw new AppError(400, 'Enrollment does not match session program');

    if (enrollment!.program.maxClasses !== null) {
      if (enrollment!.classesBooked >= enrollment!.program.maxClasses) {
        throw new AppError(400, 'No class credits remaining');
      }
    }

    if (session.capacity !== null) {
      const confirmed = await prisma.sessionBooking.count({
        where: { sessionId, status: 'confirmed' },
      });
      if (confirmed >= session.capacity) throw new AppError(400, 'Session is at capacity');
    }

    const [booking] = await prisma.$transaction([
      prisma.sessionBooking.create({
        data: { organizationId, sessionId, enrollmentId, status: 'confirmed' },
      }),
      prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { classesBooked: { increment: 1 } },
      }),
    ]);
    return booking;
  }

  async cancelBooking(bookingId: string, organizationId: string) {
    const booking = await prisma.sessionBooking.findFirst({
      where: { id: bookingId, organizationId, status: 'confirmed' },
    });
    if (!booking) throw new AppError(404, 'Booking not found');

    await prisma.$transaction([
      prisma.sessionBooking.update({ where: { id: bookingId }, data: { status: 'cancelled' } }),
      prisma.enrollment.update({
        where: { id: booking.enrollmentId },
        data: { classesBooked: { decrement: 1 } },
      }),
    ]);
  }

  async getUpcomingSessions(organizationId: string, contactId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { contact: { id: contactId, organizationId }, status: 'active' },
      select: { id: true, programId: true, classesBooked: true, program: { select: { maxClasses: true, allowSelfEnrollment: true } } },
    });

    const programIds = enrollments
      .filter((e) => e.program.allowSelfEnrollment)
      .map((e) => e.programId);

    if (!programIds.length) return [];

    const now = new Date();
    const sessions = await prisma.classSession.findMany({
      where: {
        organizationId,
        programId: { in: programIds },
        startsAt: { gte: now },
        status: 'scheduled',
      },
      include: {
        _count: { select: { bookings: { where: { status: 'confirmed' } } } },
        bookings: {
          where: {
            enrollmentId: { in: enrollments.map((e) => e.id) },
            status: 'confirmed',
          },
          select: { id: true, enrollmentId: true },
        },
      },
      orderBy: { startsAt: 'asc' },
      take: 50,
    });

    return sessions.map((s) => {
      const enrollment = enrollments.find((e) => e.programId === s.programId)!;
      const myBooking = s.bookings[0] ?? null;
      const creditsLeft = enrollment.program.maxClasses !== null
        ? enrollment.program.maxClasses - enrollment.classesBooked
        : null;
      return {
        ...s,
        enrollment: { id: enrollment.id, creditsLeft },
        myBooking,
      };
    });
  }
}

export default new SessionService();
