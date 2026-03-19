'use client';

import { useState } from 'react';
import { Button, Separator } from '@restaurantos/ui';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { formatCents } from '@/lib/format';

interface StripeCheckoutFormProps {
  onSuccess: (paymentIntentId: string) => void;
  submitting: boolean;
  total: number;
}

export function StripeCheckoutForm({
  onSuccess,
  submitting,
  total,
}: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // fallback
      },
      redirect: 'if_required',
    });

    if (error) {
      toast.error(error.message || 'Payment failed');
      setProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <Separator />
      <PaymentElement />
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || processing || submitting}
      >
        {processing ? 'Processing...' : `Pay $${formatCents(total)}`}
      </Button>
    </form>
  );
}
