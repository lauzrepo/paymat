import { Calendar, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { useUpcomingSessions, useBookSession, useCancelSessionBooking } from '../../hooks/useClient';
import type { UpcomingSession } from '../../api/client';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SessionCard({ session }: { session: UpcomingSession }) {
  const book = useBookSession();
  const cancel = useCancelSessionBooking();

  const isBooked = !!session.myBooking;
  const isFull = session.capacity !== null && session._count.bookings >= session.capacity && !isBooked;
  const noCredits = session.enrollment.creditsLeft !== null && session.enrollment.creditsLeft <= 0 && !isBooked;
  const canBook = !isBooked && !isFull && !noCredits;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Calendar className="h-4 w-4 shrink-0 text-indigo-500" />
              {formatDateTime(session.startsAt)}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {session.durationMinutes} min
              </span>
              {session.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {session.location}
                </span>
              )}
              {session.capacity !== null && (
                <span>{session._count.bookings} / {session.capacity} spots taken</span>
              )}
            </div>
            {session.notes && (
              <p className="text-xs text-gray-400 dark:text-gray-500 pt-0.5">{session.notes}</p>
            )}
          </div>

          {isBooked ? (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Booked
              </span>
              <button
                onClick={() => cancel.mutate(session.id)}
                disabled={cancel.isPending}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                {cancel.isPending ? 'Cancelling…' : 'Cancel'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => book.mutate(session.id)}
              disabled={!canBook || book.isPending}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                canBook
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              {book.isPending
                ? 'Joining…'
                : isFull
                ? 'Full'
                : noCredits
                ? 'No credits'
                : 'Join'}
            </button>
          )}
        </div>
      </div>

      {session.enrollment.creditsLeft !== null && (
        <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          {session.enrollment.creditsLeft} credit{session.enrollment.creditsLeft !== 1 ? 's' : ''} remaining
        </div>
      )}
    </div>
  );
}

export function ClassesPage() {
  const { data: sessions, isLoading } = useUpcomingSessions();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Classes</h1>

      {isLoading && <div className="text-sm text-gray-400">Loading…</div>}

      {!isLoading && !sessions?.length && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming classes available to book.</p>
        </div>
      )}

      {sessions?.map((s) => (
        <SessionCard key={s.id} session={s} />
      ))}
    </div>
  );
}
