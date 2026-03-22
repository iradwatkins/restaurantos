'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';
import { useTenant } from '@/hooks/use-tenant';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Input,
  Label,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@restaurantos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Clock,
  Users,
  Phone,
  Check,
  X,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

type ViewMode = 'calendar' | 'list';
type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

const STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  seated: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-gray-100 text-gray-700 border-gray-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  no_show: 'bg-red-100 text-red-800 border-red-300',
};

const STATUS_BADGE_VARIANT: Record<ReservationStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  pending: 'warning',
  confirmed: 'default',
  seated: 'success',
  completed: 'secondary',
  cancelled: 'destructive',
  no_show: 'destructive',
};

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime12(time24: string): string {
  const parts = time24.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// Time slots for calendar view (11:00 AM to 10:00 PM)
const CALENDAR_HOURS = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 11;
  return {
    hour,
    label: formatTime12(`${String(hour).padStart(2, '0')}:00`),
  };
});

export default function ReservationsContent() {
  const { tenantId } = useTenant();
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any>(null);

  const reservations = useQuery(
    api.reservations.queries.getReservations,
    tenantId ? { date: selectedDate } : 'skip'
  );

  const waitlist = useQuery(
    api.reservations.queries.getWaitlist,
    tenantId ? { date: selectedDate } : 'skip'
  );

  const tables = useQuery(
    api.orders.queries.getTables,
    tenantId ? { tenantId } : 'skip'
  );

  const confirmReservation = useMutation(api.reservations.mutations.confirmReservation);
  const seatReservation = useMutation(api.reservations.mutations.seatReservation);
  const completeReservation = useMutation(api.reservations.mutations.completeReservation);
  const cancelReservation = useMutation(api.reservations.mutations.cancelReservation);
  const markNoShow = useMutation(api.reservations.mutations.markNoShow);
  const createReservation = useMutation(api.reservations.mutations.createReservation);
  const updateReservation = useMutation(api.reservations.mutations.updateReservation);

  // Filter reservations (exclude waitlist entries for the main views)
  const filteredReservations = useMemo(() => {
    if (!reservations) return [];
    let result = reservations.filter((r) => r.waitlistPosition === undefined);
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    return result.sort((a, b) => a.time.localeCompare(b.time));
  }, [reservations, statusFilter]);

  async function handleAction(action: string, reservationId: string) {
    try {
      const id = reservationId as Id<'reservations'>;
      switch (action) {
        case 'confirm':
          await confirmReservation({ reservationId: id });
          toast.success('Reservation confirmed');
          break;
        case 'seat':
          await seatReservation({ reservationId: id });
          toast.success('Party seated');
          break;
        case 'complete':
          await completeReservation({ reservationId: id });
          toast.success('Reservation completed');
          break;
        case 'cancel':
          await cancelReservation({ reservationId: id });
          toast.success('Reservation cancelled');
          break;
        case 'no_show':
          await markNoShow({ reservationId: id });
          toast.success('Marked as no-show');
          break;
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action}`);
    }
  }

  async function handleSeatWaitlist(reservationId: string, tableId?: string) {
    try {
      await seatReservation({
        reservationId: reservationId as Id<'reservations'>,
        tableId: tableId ? (tableId as Id<'tables'>) : undefined,
      });
      toast.success('Waitlist party seated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to seat');
    }
  }

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
          <p className="text-muted-foreground">
            {filteredReservations.length} reservation{filteredReservations.length !== 1 ? 's' : ''} for{' '}
            {formatDate(selectedDate)}
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Reservation
        </Button>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
          <Button variant="outline" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(todayString())}
            className={selectedDate === todayString() ? 'font-bold' : ''}
          >
            Today
          </Button>
        </div>

        {/* View toggle + filters */}
        <div className="flex items-center gap-2">
          {viewMode === 'list' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="seated">Seated</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          )}
          <div className="flex rounded-lg border border-input">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              Calendar
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="mr-1.5 h-3.5 w-3.5" />
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[calc(100vh-320px)]">
              <div className="min-w-[600px]">
                {CALENDAR_HOURS.map(({ hour, label }) => {
                  const hourReservations = filteredReservations.filter((r) => {
                    const rHour = parseInt(r.time.split(':')[0] ?? '0');
                    return rHour === hour;
                  });

                  return (
                    <div key={hour} className="flex border-b border-border last:border-b-0">
                      <div className="w-24 shrink-0 py-3 px-4 text-sm text-muted-foreground font-medium border-r border-border bg-muted/30">
                        {label}
                      </div>
                      <div className="flex-1 py-2 px-3 min-h-[56px]">
                        <div className="flex flex-wrap gap-2">
                          {hourReservations.map((r) => (
                            <button
                              key={r._id}
                              onClick={() => setEditingReservation(r)}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors hover:opacity-80 ${STATUS_COLORS[r.status as ReservationStatus]}`}
                            >
                              <span className="font-medium">{formatTime12(r.time)}</span>
                              <span>{r.customerName}</span>
                              <span className="flex items-center gap-0.5 text-xs">
                                <Users className="h-3 w-3" />
                                {r.partySize}
                              </span>
                              {r.tableId && tables && (
                                <span className="text-xs opacity-75">
                                  {tables.find((t) => t._id === r.tableId)?.name ?? ''}
                                </span>
                              )}
                            </button>
                          ))}
                          {hourReservations.length === 0 && (
                            <span className="text-xs text-muted-foreground/50 py-1">No reservations</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No reservations for this date
                    </TableCell>
                  </TableRow>
                )}
                {filteredReservations.map((r) => {
                  const tableName = r.tableId
                    ? tables?.find((t) => t._id === r.tableId)?.name ?? '-'
                    : '-';
                  return (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">
                        {formatTime12(r.time)}
                        {r.endTime && (
                          <span className="text-xs text-muted-foreground ml-1">
                            - {formatTime12(r.endTime)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          className="font-medium hover:underline text-left"
                          onClick={() => setEditingReservation(r)}
                        >
                          {r.customerName}
                        </button>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {r.partySize}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{r.customerPhone}</TableCell>
                      <TableCell>{tableName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {r.source.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_BADGE_VARIANT[r.status as ReservationStatus] ?? 'secondary'}
                          className="capitalize"
                        >
                          {r.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ReservationActions
                          status={r.status as ReservationStatus}
                          reservationId={r._id}
                          onAction={handleAction}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Waitlist Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Waitlist
          </CardTitle>
          <CardDescription>
            {waitlist?.length ?? 0} parties waiting
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(!waitlist || waitlist.length === 0) ? (
            <p className="text-center text-muted-foreground py-4 text-sm">No one on the waitlist</p>
          ) : (
            <div className="space-y-2">
              {waitlist.map((entry) => {
                const waitMinutes = entry.createdAt
                  ? Math.round((Date.now() - entry.createdAt) / 60000)
                  : 0;
                const openTables = tables?.filter((t) => t.status === 'open' && (t.seats ?? 0) >= entry.partySize) ?? [];

                return (
                  <div key={entry._id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                        #{entry.waitlistPosition}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{entry.customerName}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {entry.partySize}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {waitMinutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {entry.customerPhone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {openTables.length > 0 ? (
                        <select
                          className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleSeatWaitlist(entry._id, e.target.value);
                            }
                          }}
                        >
                          <option value="" disabled>
                            Seat at...
                          </option>
                          {openTables.map((t) => (
                            <option key={t._id} value={t._id}>
                              {t.name} ({t.seats} seats)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">No tables available</span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction('cancel', entry._id)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Reservation Dialog */}
      <NewReservationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        tenantId={tenantId}
        date={selectedDate}
        tables={tables ?? []}
        onCreate={createReservation}
      />

      {/* Edit / View Reservation Dialog */}
      {editingReservation && (
        <EditReservationDialog
          open={!!editingReservation}
          onOpenChange={(open) => { if (!open) setEditingReservation(null); }}
          reservation={editingReservation}
          tables={tables ?? []}
          onUpdate={updateReservation}
          onAction={handleAction}
        />
      )}
    </div>
  );
}

// ==================== Action Buttons ====================

function ReservationActions({
  status,
  reservationId,
  onAction,
}: {
  status: ReservationStatus;
  reservationId: string;
  onAction: (action: string, id: string) => void;
}) {
  const actions: { label: string; action: string; icon: any; variant?: any }[] = [];

  if (status === 'pending') {
    actions.push({ label: 'Confirm', action: 'confirm', icon: Check, variant: 'outline' });
    actions.push({ label: 'No Show', action: 'no_show', icon: AlertTriangle, variant: 'ghost' });
    actions.push({ label: 'Cancel', action: 'cancel', icon: X, variant: 'ghost' });
  }
  if (status === 'confirmed') {
    actions.push({ label: 'Seat', action: 'seat', icon: UserCheck, variant: 'outline' });
    actions.push({ label: 'No Show', action: 'no_show', icon: AlertTriangle, variant: 'ghost' });
    actions.push({ label: 'Cancel', action: 'cancel', icon: X, variant: 'ghost' });
  }
  if (status === 'seated') {
    actions.push({ label: 'Complete', action: 'complete', icon: CheckCircle2, variant: 'outline' });
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {actions.map((a) => (
        <Button
          key={a.action}
          variant={a.variant}
          size="sm"
          onClick={() => onAction(a.action, reservationId)}
        >
          <a.icon className="h-3 w-3 mr-1" />
          {a.label}
        </Button>
      ))}
    </div>
  );
}

// ==================== New Reservation Dialog ====================

function NewReservationDialog({
  open,
  onOpenChange,
  tenantId,
  date,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: Id<'tenants'>;
  date: string;
  tables: any[];
  onCreate: any;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);

    try {
      const result = await onCreate({
        tenantId,
        customerName: form.get('customerName') as string,
        customerPhone: form.get('customerPhone') as string,
        customerEmail: (form.get('customerEmail') as string) || undefined,
        partySize: parseInt(form.get('partySize') as string),
        date: form.get('date') as string,
        time: form.get('time') as string,
        duration: parseInt(form.get('duration') as string) || undefined,
        source: (form.get('source') as string) as 'online' | 'phone' | 'walk_in',
        notes: (form.get('notes') as string) || undefined,
        specialRequests: (form.get('specialRequests') as string) || undefined,
      });

      toast.success(
        `Reservation created (${result.status === 'confirmed' ? 'auto-confirmed' : 'pending'})`
      );
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create reservation');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Reservation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nr-name">Customer Name</Label>
              <Input id="nr-name" name="customerName" required placeholder="John Smith" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nr-phone">Phone</Label>
              <Input id="nr-phone" name="customerPhone" required placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nr-email">Email (optional)</Label>
            <Input id="nr-email" name="customerEmail" type="email" placeholder="john@example.com" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nr-date">Date</Label>
              <Input id="nr-date" name="date" type="date" defaultValue={date} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nr-time">Time</Label>
              <Input id="nr-time" name="time" type="time" defaultValue="18:00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nr-party">Party Size</Label>
              <Input id="nr-party" name="partySize" type="number" min="1" max="50" defaultValue="2" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nr-duration">Duration (min)</Label>
              <Input id="nr-duration" name="duration" type="number" min="15" step="15" defaultValue="90" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nr-source">Source</Label>
              <select
                id="nr-source"
                name="source"
                defaultValue="phone"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="phone">Phone</option>
                <option value="walk_in">Walk-in</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nr-special">Special Requests</Label>
            <textarea
              id="nr-special"
              name="specialRequests"
              placeholder="High chair needed, birthday celebration..."
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nr-notes">Staff Notes</Label>
            <textarea
              id="nr-notes"
              name="notes"
              placeholder="Internal notes..."
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Reservation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Edit Reservation Dialog ====================

function EditReservationDialog({
  open,
  onOpenChange,
  reservation,
  tables,
  onUpdate,
  onAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: any;
  tables: any[];
  onUpdate: any;
  onAction: (action: string, id: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const isEditable =
    reservation.status !== 'completed' && reservation.status !== 'cancelled';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isEditable) return;
    setSubmitting(true);
    const form = new FormData(e.currentTarget);

    try {
      const tableId = form.get('tableId') as string;
      await onUpdate({
        reservationId: reservation._id as Id<'reservations'>,
        customerName: form.get('customerName') as string,
        customerPhone: form.get('customerPhone') as string,
        customerEmail: (form.get('customerEmail') as string) || undefined,
        partySize: parseInt(form.get('partySize') as string),
        date: form.get('date') as string,
        time: form.get('time') as string,
        duration: parseInt(form.get('duration') as string) || undefined,
        tableId: tableId ? (tableId as Id<'tables'>) : undefined,
        notes: (form.get('notes') as string) || undefined,
        specialRequests: (form.get('specialRequests') as string) || undefined,
      });
      toast.success('Reservation updated');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update reservation');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Reservation Details
            <Badge
              variant={STATUS_BADGE_VARIANT[reservation.status as ReservationStatus] ?? 'secondary'}
              className="capitalize"
            >
              {reservation.status.replace('_', ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="er-name">Customer Name</Label>
              <Input
                id="er-name"
                name="customerName"
                defaultValue={reservation.customerName}
                required
                readOnly={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="er-phone">Phone</Label>
              <Input
                id="er-phone"
                name="customerPhone"
                defaultValue={reservation.customerPhone}
                required
                readOnly={!isEditable}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="er-email">Email</Label>
            <Input
              id="er-email"
              name="customerEmail"
              type="email"
              defaultValue={reservation.customerEmail ?? ''}
              readOnly={!isEditable}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="er-date">Date</Label>
              <Input
                id="er-date"
                name="date"
                type="date"
                defaultValue={reservation.date}
                required
                readOnly={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="er-time">Time</Label>
              <Input
                id="er-time"
                name="time"
                type="time"
                defaultValue={reservation.time}
                required
                readOnly={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="er-party">Party Size</Label>
              <Input
                id="er-party"
                name="partySize"
                type="number"
                min="1"
                defaultValue={reservation.partySize}
                required
                readOnly={!isEditable}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="er-duration">Duration (min)</Label>
              <Input
                id="er-duration"
                name="duration"
                type="number"
                min="15"
                step="15"
                defaultValue={reservation.duration}
                readOnly={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="er-table">Table</Label>
              <select
                id="er-table"
                name="tableId"
                defaultValue={reservation.tableId ?? ''}
                disabled={!isEditable}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Auto-assign</option>
                {tables.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.seats ?? '?'} seats)
                  </option>
                ))}
              </select>
            </div>
          </div>
          {reservation.specialRequests && (
            <div className="space-y-2">
              <Label>Special Requests</Label>
              <textarea
                name="specialRequests"
                defaultValue={reservation.specialRequests}
                readOnly={!isEditable}
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Staff Notes</Label>
            <textarea
              name="notes"
              defaultValue={reservation.notes ?? ''}
              readOnly={!isEditable}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Source: {reservation.source.replace('_', ' ')} | Created:{' '}
            {reservation.createdAt
              ? new Date(reservation.createdAt).toLocaleString()
              : 'Unknown'}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <ReservationActions
              status={reservation.status}
              reservationId={reservation._id}
              onAction={(action, id) => {
                onAction(action, id);
                onOpenChange(false);
              }}
            />
            <div className="flex gap-2">
              {isEditable && (
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
