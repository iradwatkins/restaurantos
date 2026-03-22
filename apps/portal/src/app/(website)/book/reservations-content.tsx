'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Badge,
  Separator,
} from '@restaurantos/ui';
import { CalendarDays, Users, Clock, Check, Search } from 'lucide-react';
import { toast } from 'sonner';

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function maxDateString(daysAhead: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + daysAhead);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function formatTime12(time24: string): string {
  const parts = time24.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDateReadable(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0] ?? 2026;
  const mo = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  seated: 'Seated',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

interface InitialData {
  tenantId: string;
  tenantName: string;
  maxPartySize: number;
  maxDaysAhead: number;
  slotMinutes: number;
  defaultDuration: number;
  primaryColor?: string;
}

type BookingStep = 'select' | 'details' | 'confirmed';

export default function ReservationsPage({
  initialData,
}: {
  initialData: InitialData | null;
}) {
  const [step, setStep] = useState<BookingStep>('select');
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [partySize, setPartySize] = useState(2);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    status: string;
    date: string;
    time: string;
    partySize: number;
    name: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Lookup mode
  const [showLookup, setShowLookup] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupTriggered, setLookupTriggered] = useState(false);

  const tenantId = initialData?.tenantId as Id<'tenants'> | undefined;

  const availableSlots = useQuery(
    api.reservations.queries.getAvailableSlots,
    tenantId && selectedDate && partySize
      ? { tenantId, date: selectedDate, partySize }
      : 'skip'
  );

  const lookupResults = useQuery(
    api.reservations.queries.getReservationsByPhone,
    tenantId && lookupTriggered && lookupPhone.length >= 7
      ? { tenantId, customerPhone: lookupPhone }
      : 'skip'
  );

  const createReservation = useMutation(api.reservations.mutations.createReservation);
  const cancelReservation = useMutation(api.reservations.mutations.cancelReservation);

  if (!initialData) {
    return (
      <section className="max-w-2xl mx-auto px-4 py-16 text-center">
        <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Reservations Not Available</h1>
        <p className="text-muted-foreground">
          This restaurant is not currently accepting online reservations. Please call us directly.
        </p>
      </section>
    );
  }

  const ctaColor = initialData.primaryColor || '#348726';

  async function handleBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTime || !tenantId) return;
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const customerName = form.get('customerName') as string;
    const customerPhone = form.get('customerPhone') as string;
    const customerEmail = (form.get('customerEmail') as string) || undefined;
    const specialRequests = (form.get('specialRequests') as string) || undefined;

    try {
      const result = await createReservation({
        tenantId,
        customerName,
        customerPhone,
        customerEmail,
        partySize,
        date: selectedDate,
        time: selectedTime,
        duration: initialData?.defaultDuration ?? 90,
        source: 'online',
        specialRequests,
      });

      setConfirmed({
        status: result.status,
        date: selectedDate,
        time: selectedTime,
        partySize,
        name: customerName,
      });
      setStep('confirmed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create reservation');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelLookup(reservationId: string, phone: string) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      await cancelReservation({
        reservationId: reservationId as Id<'reservations'>,
        customerPhone: phone,
      });
      toast.success('Reservation cancelled');
      // Re-trigger lookup
      setLookupTriggered(false);
      setTimeout(() => setLookupTriggered(true), 100);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel');
    }
  }

  return (
    <section className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Make a Reservation</h1>
        <p className="text-muted-foreground">
          Book your table at {initialData.tenantName}
        </p>
        <Button
          variant="link"
          className="mt-2"
          onClick={() => setShowLookup(!showLookup)}
        >
          {showLookup ? 'Book a table' : 'Check existing reservation'}
        </Button>
      </div>

      {/* Lookup Section */}
      {showLookup && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Check Your Reservation
            </CardTitle>
            <CardDescription>Enter your phone number to look up existing reservations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={lookupPhone}
                onChange={(e) => {
                  setLookupPhone(e.target.value);
                  setLookupTriggered(false);
                }}
                placeholder="(555) 123-4567"
                className="flex-1"
              />
              <Button
                onClick={() => setLookupTriggered(true)}
                disabled={lookupPhone.length < 7}
              >
                <Search className="mr-2 h-4 w-4" />
                Look Up
              </Button>
            </div>

            {lookupTriggered && lookupResults && (
              <div className="space-y-2">
                {lookupResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    No reservations found for this phone number
                  </p>
                ) : (
                  lookupResults.map((r) => (
                    <div key={r._id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{r.customerName}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatDateReadable(r.date)}</span>
                          <span>{r.time !== '00:00' ? formatTime12(r.time) : 'Waitlist'}</span>
                          <span className="flex items-center gap-0.5">
                            <Users className="h-3 w-3" />
                            {r.partySize}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            r.status === 'confirmed'
                              ? 'default'
                              : r.status === 'pending'
                                ? 'warning'
                                : r.status === 'cancelled'
                                  ? 'destructive'
                                  : 'secondary'
                          }
                          className="capitalize"
                        >
                          {STATUS_LABELS[r.status] ?? r.status}
                        </Badge>
                        {(r.status === 'pending' || r.status === 'confirmed') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleCancelLookup(r._id, lookupPhone)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Booking Flow */}
      {!showLookup && step === 'select' && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Party size selector */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-5 w-5" />
                Party Size
              </Label>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: Math.min(initialData.maxPartySize, 12) }, (_, i) => i + 1).map(
                  (size) => (
                    <Button
                      key={size}
                      variant={partySize === size ? 'default' : 'outline'}
                      size="sm"
                      className="h-10 w-10"
                      style={
                        partySize === size
                          ? { backgroundColor: ctaColor, borderColor: ctaColor }
                          : {}
                      }
                      onClick={() => {
                        setPartySize(size);
                        setSelectedTime(null);
                      }}
                    >
                      {size}
                    </Button>
                  )
                )}
                {initialData.maxPartySize > 12 && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max={initialData.maxPartySize}
                      value={partySize}
                      onChange={(e) => {
                        setPartySize(parseInt(e.target.value) || 1);
                        setSelectedTime(null);
                      }}
                      className="w-20 h-10"
                    />
                    <span className="text-sm text-muted-foreground">guests</span>
                  </div>
                )}
              </div>
            </div>

            {/* Date picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <CalendarDays className="h-5 w-5" />
                Date
              </Label>
              <Input
                type="date"
                value={selectedDate}
                min={todayString()}
                max={maxDateString(initialData.maxDaysAhead)}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime(null);
                }}
                className="w-48"
              />
              <p className="text-sm text-muted-foreground">
                {formatDateReadable(selectedDate)}
              </p>
            </div>

            {/* Time slots */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-5 w-5" />
                Available Times
              </Label>
              {availableSlots === undefined ? (
                <p className="text-sm text-muted-foreground py-4">Loading available times...</p>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg">
                  <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No available times for this date and party size
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try a different date or party size
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot}
                      variant={selectedTime === slot ? 'default' : 'outline'}
                      size="sm"
                      className="h-10"
                      style={
                        selectedTime === slot
                          ? { backgroundColor: ctaColor, borderColor: ctaColor }
                          : {}
                      }
                      onClick={() => setSelectedTime(slot)}
                    >
                      {formatTime12(slot)}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Continue button */}
            <Button
              className="w-full h-12 text-base font-semibold"
              style={{ backgroundColor: ctaColor }}
              disabled={!selectedTime}
              onClick={() => setStep('details')}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Details step */}
      {!showLookup && step === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Reservation</CardTitle>
            <CardDescription>
              {formatDateReadable(selectedDate)} at {selectedTime ? formatTime12(selectedTime) : ''}{' '}
              for {partySize} guest{partySize !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pub-name">Your Name</Label>
                  <Input id="pub-name" name="customerName" required placeholder="John Smith" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pub-phone">Phone</Label>
                  <Input id="pub-phone" name="customerPhone" required placeholder="(555) 123-4567" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pub-email">Email (optional)</Label>
                <Input id="pub-email" name="customerEmail" type="email" placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pub-special">Special Requests</Label>
                <textarea
                  id="pub-special"
                  name="specialRequests"
                  placeholder="Allergies, celebrations, accessibility needs..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('select')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 text-base font-semibold"
                  style={{ backgroundColor: ctaColor }}
                  disabled={submitting}
                >
                  {submitting ? 'Booking...' : 'Book Table'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Confirmation step */}
      {!showLookup && step === 'confirmed' && confirmed && (
        <Card>
          <CardContent className="pt-8 text-center space-y-4">
            <div
              className="h-16 w-16 rounded-full mx-auto flex items-center justify-center"
              style={{ backgroundColor: ctaColor }}
            >
              <Check className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Reservation {confirmed.status === 'confirmed' ? 'Confirmed' : 'Submitted'}!</h2>
            <p className="text-muted-foreground">
              {confirmed.status === 'confirmed'
                ? 'Your table is confirmed. We look forward to seeing you!'
                : 'Your reservation is pending confirmation. We will contact you shortly.'}
            </p>

            <div className="bg-muted/50 rounded-lg p-4 inline-block mx-auto space-y-2 text-left">
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatDateReadable(confirmed.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatTime12(confirmed.time)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{confirmed.partySize} guest{confirmed.partySize !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <Separator />

            <Button
              variant="outline"
              onClick={() => {
                setStep('select');
                setSelectedTime(null);
                setConfirmed(null);
              }}
            >
              Make Another Reservation
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
