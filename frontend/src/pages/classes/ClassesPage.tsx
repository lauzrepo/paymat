import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTenantBranding } from '../../hooks/useClient';
import { Calendar, MapPin, Clock, CheckCircle2, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import {
  useUpcomingSessions,
  useBookSession,
  useCancelSessionBooking,
  useEnrollablePrograms,
  useSelfEnroll,
} from '../../hooks/useClient';
import type { UpcomingSession, EnrollableProgram } from '../../api/client';
import { useOrgSlug } from '../../context/OrgSlugContext';

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

function formatFrequency(f: string) {
  if (f === 'one_time') return 'One-time';
  return f.charAt(0).toUpperCase() + f.slice(1);
}

function capacityColor(booked: number, capacity: number | null): string {
  if (capacity === null) return 'bg-green-400';
  const ratio = booked / capacity;
  if (ratio >= 1) return 'bg-red-500';
  if (ratio >= 0.5) return 'bg-yellow-400';
  return 'bg-green-400';
}

function capacityLabel(booked: number, capacity: number | null): string {
  if (capacity === null) return 'Open';
  if (booked >= capacity) return 'Full';
  return `${capacity - booked} spot${capacity - booked !== 1 ? 's' : ''} left`;
}

function SessionCard({ session }: { session: UpcomingSession }) {
  const book = useBookSession();
  const cancel = useCancelSessionBooking();

  const isBooked = !!session.myBooking;
  const isFull = session.capacity !== null && session._count.bookings >= session.capacity && !isBooked;
  const noCredits = session.enrollment.creditsLeft !== null && session.enrollment.creditsLeft <= 0 && !isBooked;
  const canBook = !isBooked && !isFull && !noCredits;

  const dotColor = capacityColor(session._count.bookings, session.capacity);
  const spotsLabel = capacityLabel(session._count.bookings, session.capacity);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex">
        {/* Capacity strip */}
        <div className={`w-1 shrink-0 ${dotColor}`} />

        <div className="flex-1 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Calendar className="h-4 w-4 shrink-0 text-indigo-500" />
                {formatDateTime(session.startsAt)}
              </div>
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
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
                  <span className={`flex items-center gap-1 font-medium ${
                    isFull ? 'text-red-500' : session._count.bookings / session.capacity >= 0.5 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                    {spotsLabel}
                  </span>
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
      </div>

      {session.enrollment.creditsLeft !== null && (
        <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          {session.enrollment.creditsLeft} credit{session.enrollment.creditsLeft !== 1 ? 's' : ''} remaining
        </div>
      )}
    </div>
  );
}

function ProgramCard({ program }: { program: EnrollableProgram }) {
  const enroll = useSelfEnroll();
  const navigate = useNavigate();
  const orgSlug = useOrgSlug();
  const [done, setDone] = useState(false);

  const handleEnroll = async () => {
    try {
      const result = await enroll.mutateAsync(program.id);
      setDone(true);
      // Give React Query a tick to invalidate, then redirect to the invoice
      setTimeout(() => navigate(`/${orgSlug}/invoices/${result.invoice.id}`), 400);
    } catch {
      // error surfaced by mutation state
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4 flex items-start justify-between gap-4">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 shrink-0 text-indigo-400" />
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{program.name}</span>
        </div>
        {program.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{program.description}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ${program.price} · {formatFrequency(program.billingFrequency)}
          {program.maxClasses !== null && ` · ${program.maxClasses} classes`}
        </p>
      </div>
      <button
        onClick={handleEnroll}
        disabled={enroll.isPending || done}
        className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 transition-colors"
      >
        {done ? 'Enrolled!' : enroll.isPending ? 'Enrolling…' : 'Enroll'}
      </button>
    </div>
  );
}

function ExploreSection() {
  const { data: programs, isLoading } = useEnrollablePrograms();
  const [open, setOpen] = useState(false);

  if (isLoading || !programs?.length) return null;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Explore programs ({programs.length})
      </button>
      {open && (
        <div className="space-y-3">
          {programs.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ClassesPage() {
  const { data: branding } = useTenantBranding();
  const { data: sessions, isLoading } = useUpcomingSessions();

  if (branding && !branding.classBookingEnabled) {
    return <Navigate to=".." replace />;
  }

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

      <ExploreSection />
    </div>
  );
}
