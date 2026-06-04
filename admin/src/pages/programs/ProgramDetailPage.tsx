import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer, type SlotInfo, type Event } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ArrowLeft, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProgram } from '../../hooks/usePrograms';
import { useSessions, useCreateSession, useCreateSeries, useCancelSession, useCancelBooking, useSession } from '../../hooks/useSessions';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import type { ClassSession } from '../../api/sessions';

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { 'en-US': enUS } });

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS: Record<string, string> = { SUN: 'Sun', MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat' };

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── Session form ──────────────────────────────────────────────────────────────

interface SessionFormProps {
  programId: string;
  defaultDate?: Date;
  onDone: () => void;
}

function SessionForm({ programId, defaultDate, onDone }: SessionFormProps) {
  const [repeat, setRepeat] = useState(false);
  const [form, setForm] = useState({
    date: defaultDate ? toYMD(defaultDate) : toYMD(new Date()),
    time: '09:00',
    duration: '60',
    location: '',
    capacity: '',
    notes: '',
    daysOfWeek: defaultDate ? [DAYS[defaultDate.getDay()]] : [] as string[],
    seriesEndDate: '',
  });
  const [error, setError] = useState('');

  const createSession = useCreateSession(programId);
  const createSeries = useCreateSeries(programId);

  const toggleDay = (day: string) =>
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (repeat) {
        if (!form.daysOfWeek.length) { setError('Select at least one day'); return; }
        await createSeries.mutateAsync({
          programId,
          daysOfWeek: form.daysOfWeek,
          timeOfDay: form.time,
          durationMinutes: parseInt(form.duration),
          location: form.location || undefined,
          capacity: form.capacity ? parseInt(form.capacity) : undefined,
          notes: form.notes || undefined,
          seriesStartDate: form.date,
          seriesEndDate: form.seriesEndDate || undefined,
        });
      } else {
        const startsAt = new Date(`${form.date}T${form.time}`).toISOString();
        await createSession.mutateAsync({
          programId,
          startsAt,
          durationMinutes: parseInt(form.duration),
          location: form.location || undefined,
          capacity: form.capacity ? parseInt(form.capacity) : undefined,
          notes: form.notes || undefined,
        });
      }
      onDone();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Failed to save session');
    }
  };

  const isPending = createSession.isPending || createSeries.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Date" id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        <Input label="Time" id="time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
        <Input label="Duration (min)" id="duration" type="number" min="5" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required />
        <Input label="Capacity (optional)" id="capacity" type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        <div className="col-span-2">
          <Input label="Location (optional)" id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Input label="Notes (optional)" id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="repeat"
          checked={repeat}
          onChange={(e) => setRepeat(e.target.checked)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="repeat" className="text-sm font-medium text-gray-700 dark:text-gray-300">Repeat</label>
      </div>

      {repeat && (
        <div className="space-y-3 pl-2 border-l-2 border-indigo-200 dark:border-indigo-700">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Days of week</p>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    form.daysOfWeek.includes(d)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {DAY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="End date (leave blank for open-ended)"
            id="seriesEndDate"
            type="date"
            value={form.seriesEndDate}
            onChange={(e) => setForm({ ...form, seriesEndDate: e.target.value })}
          />
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={isPending}>Save session</Button>
      </div>
    </form>
  );
}

// ── Scope prompt ──────────────────────────────────────────────────────────────

function ScopePrompt({ onSelect, onCancel, action }: { onSelect: (scope: 'one' | 'future') => void; onCancel: () => void; action: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{action} recurring session:</p>
      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={() => onSelect('one')}>This session only</Button>
        <Button variant="secondary" onClick={() => onSelect('future')}>This and all future sessions</Button>
      </div>
      <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

// ── Attendance roster ─────────────────────────────────────────────────────────

function AttendanceRoster({ sessionId, programId }: { sessionId: string; programId: string }) {
  const { data: session, isLoading } = useSession(sessionId);
  const cancelBooking = useCancelBooking(sessionId);

  if (isLoading) return <div className="py-4 flex justify-center"><Spinner /></div>;
  if (!session) return null;

  const confirmed = session.bookings.filter((b) => b.status === 'confirmed');

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Attendance ({confirmed.length}{session.capacity ? ` / ${session.capacity}` : ''})
      </h3>
      {!confirmed.length ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">No bookings yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="py-2 text-left">Name</th>
              <th className="py-2 text-left">Email</th>
              <th className="py-2 text-left">Booked</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {confirmed.map((b) => (
              <tr key={b.id}>
                <td className="py-2 dark:text-gray-100">
                  {b.enrollment.contact.firstName} {b.enrollment.contact.lastName}
                </td>
                <td className="py-2 text-gray-500 dark:text-gray-400">{b.enrollment.contact.email ?? '—'}</td>
                <td className="py-2 text-gray-400 dark:text-gray-500">
                  {new Date(b.bookedAt).toLocaleDateString()}
                </td>
                <td className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    loading={cancelBooking.isPending && cancelBooking.variables === b.id}
                    onClick={() => cancelBooking.mutate(b.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Panel = { type: 'new'; defaultDate?: Date } | { type: 'detail'; sessionId: string };

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [panel, setPanel] = useState<Panel | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ session: ClassSession; action: 'cancel' } | null>(null);

  const { data: program, isLoading: programLoading } = useProgram(id!);

  const from = useMemo(() => {
    const d = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    d.setDate(d.getDate() - 7);
    return d;
  }, [calendarDate]);

  const to = useMemo(() => {
    const d = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
    d.setDate(d.getDate() + 7);
    return d;
  }, [calendarDate]);

  const { data: sessions = [], isLoading: sessionsLoading } = useSessions(id!, from, to);
  const cancelSession = useCancelSession(id!);

  const events: Event[] = useMemo(
    () =>
      sessions.map((s) => ({
        title: `${new Date(s.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${s.recurrenceSeriesId ? ' ↻' : ''}${s.status === 'cancelled' ? ' (cancelled)' : ''}`,
        start: new Date(s.startsAt),
        end: new Date(new Date(s.startsAt).getTime() + s.durationMinutes * 60000),
        resource: s,
      })),
    [sessions],
  );

  const handleSelectSlot = (slot: SlotInfo) => {
    setPanel({ type: 'new', defaultDate: slot.start as Date });
  };

  const handleSelectEvent = (event: Event) => {
    const s = event.resource as ClassSession;
    setPanel({ type: 'detail', sessionId: s.id });
  };

  const handleCancelSession = (session: ClassSession, scope: 'one' | 'future') => {
    cancelSession.mutate({ id: session.id, scope });
    setCancelTarget(null);
  };

  const eventStyleGetter = (event: Event) => {
    const s = event.resource as ClassSession;
    if (s.status === 'cancelled') {
      return { style: { backgroundColor: '#9ca3af', textDecoration: 'line-through', opacity: 0.7 } };
    }
    return { style: { backgroundColor: '#4f46e5' } };
  };

  if (programLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!program) return <Alert variant="error">Program not found.</Alert>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/programs')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Programs
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{program.name}</h1>
          {program.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{program.description}</p>
          )}
        </div>
      </div>

      {/* Calendar card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCalendarDate((d) => subMonths(d, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setCalendarDate((d) => addMonths(d, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCalendarDate(new Date())}>Today</Button>
            </div>
            <div className="flex items-center gap-2">
              {sessionsLoading && <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />}
              <Button onClick={() => setPanel({ type: 'new' })}>+ New session</Button>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div style={{ height: 560 }} className="px-4 pb-4">
            <Calendar
              localizer={localizer}
              events={events}
              defaultView="week"
              date={calendarDate}
              onNavigate={setCalendarDate}
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              toolbar={false}
              style={{ height: '100%' }}
            />
          </div>
        </CardBody>
      </Card>

      {/* Side panel */}
      {panel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {panel.type === 'new' ? 'New session' : 'Session details'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setPanel(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {panel.type === 'new' ? (
              <SessionForm
                programId={id!}
                defaultDate={panel.defaultDate}
                onDone={() => setPanel(null)}
              />
            ) : cancelTarget ? (
              <ScopePrompt
                action="Cancel"
                onSelect={(scope) => handleCancelSession(cancelTarget.session, scope)}
                onCancel={() => setCancelTarget(null)}
              />
            ) : (
              <SessionDetailPanel
                sessionId={panel.sessionId}
                programId={id!}
                sessions={sessions}
                onCancelRequest={(s) => setCancelTarget({ session: s, action: 'cancel' })}
                onClose={() => setPanel(null)}
              />
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ── Session detail panel ──────────────────────────────────────────────────────

function SessionDetailPanel({
  sessionId,
  programId,
  sessions,
  onCancelRequest,
  onClose,
}: {
  sessionId: string;
  programId: string;
  sessions: ClassSession[];
  onCancelRequest: (s: ClassSession) => void;
  onClose: () => void;
}) {
  const session = sessions.find((s) => s.id === sessionId);

  if (!session) return <p className="text-sm text-gray-400">Session not found.</p>;

  const isRecurring = !!session.recurrenceSeriesId;
  const isCancelled = session.status === 'cancelled';

  return (
    <div className="space-y-4">
      <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
        <p><span className="font-medium">Start:</span> {new Date(session.startsAt).toLocaleString()}</p>
        <p><span className="font-medium">Duration:</span> {session.durationMinutes} min</p>
        {session.location && <p><span className="font-medium">Location:</span> {session.location}</p>}
        {session.capacity && <p><span className="font-medium">Capacity:</span> {session.capacity}</p>}
        {session.notes && <p><span className="font-medium">Notes:</span> {session.notes}</p>}
        <p>
          <span className="font-medium">Status:</span>{' '}
          <Badge variant={isCancelled ? 'gray' : 'green'}>{session.status}</Badge>
          {isRecurring && <span className="ml-2 text-xs text-gray-400">Recurring ↻</span>}
        </p>
      </div>

      {!isCancelled && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              if (isRecurring) {
                onCancelRequest(session);
              } else if (window.confirm('Cancel this session?')) {
                // handled inline for one-off
                onCancelRequest(session);
              }
            }}
          >
            Cancel session
          </Button>
        </div>
      )}

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <AttendanceRoster sessionId={sessionId} programId={programId} />
      </div>
    </div>
  );
}
