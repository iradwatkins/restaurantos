import {
  Button,
  Input,
  Label,
  Separator,
} from '@restaurantos/ui';
import { Clock } from 'lucide-react';
import { formatCents } from '@/lib/format';

interface CheckoutFormProps {
  scheduledTime: string;
  onScheduledTimeChange: (value: string) => void;
  onSubmit: (stripePaymentIntentId: string | undefined) => void;
  onInitiatePayment: () => void;
  submitting: boolean;
  total: number;
  generateTimeSlots: () => string[];
  hasStripe: boolean;
}

export function CheckoutForm({
  scheduledTime,
  onScheduledTimeChange,
  onSubmit,
  onInitiatePayment,
  submitting,
  total,
  generateTimeSlots,
  hasStripe,
}: CheckoutFormProps) {
  return (
    <div className="space-y-3 pt-2">
      <Separator />
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="Your name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="(312) 555-0100"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@email.com"
        />
      </div>

      {/* Scheduled pickup time */}
      <div className="space-y-2">
        <Label htmlFor="scheduledTime">
          <Clock className="inline h-3 w-3 mr-1" />
          Pickup Time
        </Label>
        <select
          id="scheduledTime"
          value={scheduledTime}
          onChange={(e) => onScheduledTimeChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">ASAP</option>
          {generateTimeSlots().map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Order Notes (optional)</Label>
        <Input
          id="notes"
          name="notes"
          placeholder="Any special requests"
        />
      </div>

      {hasStripe ? (
        <Button
          className="w-full"
          onClick={onInitiatePayment}
          disabled={submitting}
        >
          {submitting
            ? 'Processing...'
            : `Pay $${formatCents(total)}`}
        </Button>
      ) : (
        <Button
          className="w-full"
          onClick={() => onSubmit(undefined)}
          disabled={submitting}
        >
          {submitting
            ? 'Placing Order...'
            : `Place Order — $${formatCents(total)}`}
        </Button>
      )}
    </div>
  );
}
