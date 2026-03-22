'use client';

import { useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
} from '@restaurantos/ui';
import { Gift, Copy, Check, Mail, CreditCard, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { formatCents } from '@/lib/format';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const PRESET_AMOUNTS = [2500, 5000, 10000] as const;
const MIN_AMOUNT_CENTS = 1000;
const MAX_AMOUNT_CENTS = 50000;
const MESSAGE_MAX_LENGTH = 200;

type DeliveryType = 'digital' | 'physical';

interface GiftCardFormData {
  amountCents: number;
  customAmountInput: string;
  isPreset: boolean;
  deliveryType: DeliveryType;
  purchaserName: string;
  purchaserEmail: string;
  recipientName: string;
  recipientEmail: string;
  message: string;
}

interface PurchaseResult {
  giftCardId: string;
  code: string;
  amountCents: number;
  recipientEmail?: string;
  isDigital: boolean;
}

interface GiftCardsContentProps {
  initialData: {
    tenant: any;
  } | null;
}

const initialFormState: GiftCardFormData = {
  amountCents: PRESET_AMOUNTS[1],
  customAmountInput: '',
  isPreset: true,
  deliveryType: 'digital',
  purchaserName: '',
  purchaserEmail: '',
  recipientName: '',
  recipientEmail: '',
  message: '',
};

export default function GiftCardsContent({ initialData }: GiftCardsContentProps) {
  const { tenant: clientTenant, tenantId } = useTenant();
  const tenant = initialData?.tenant ?? clientTenant;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- giftCards module types are generated after `npx convex dev`
  const purchaseGiftCard = useMutation((api as any).giftCards.mutations.purchaseGiftCard);

  const [form, setForm] = useState<GiftCardFormData>(initialFormState);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [, setPaymentIntentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null);
  const [copied, setCopied] = useState(false);

  const updateForm = useCallback(
    <K extends keyof GiftCardFormData>(field: K, value: GiftCardFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  function selectPresetAmount(cents: number) {
    setForm((prev) => ({
      ...prev,
      amountCents: cents,
      isPreset: true,
      customAmountInput: '',
    }));
    // Reset payment if amount changes
    setClientSecret(null);
    setPaymentIntentId(null);
  }

  function handleCustomAmountChange(value: string) {
    // Allow only digits and a single decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const sanitized = parts[0] + (parts.length > 1 ? '.' + (parts[1]?.slice(0, 2) ?? '') : '');

    const dollars = parseFloat(sanitized);
    const cents = isNaN(dollars) ? 0 : Math.round(dollars * 100);

    setForm((prev) => ({
      ...prev,
      customAmountInput: sanitized,
      amountCents: cents,
      isPreset: false,
    }));
    // Reset payment if amount changes
    setClientSecret(null);
    setPaymentIntentId(null);
  }

  function validateForm(): string | null {
    if (form.amountCents < MIN_AMOUNT_CENTS) {
      return `Minimum gift card amount is $${formatCents(MIN_AMOUNT_CENTS)}`;
    }
    if (form.amountCents > MAX_AMOUNT_CENTS) {
      return `Maximum gift card amount is $${formatCents(MAX_AMOUNT_CENTS)}`;
    }
    if (!form.purchaserName.trim()) {
      return 'Please enter your name';
    }
    if (!form.purchaserEmail.trim() || !isValidEmail(form.purchaserEmail)) {
      return 'Please enter a valid email address';
    }
    if (form.deliveryType === 'digital') {
      if (!form.recipientName.trim()) {
        return 'Please enter the recipient name';
      }
      if (!form.recipientEmail.trim() || !isValidEmail(form.recipientEmail)) {
        return 'Please enter a valid recipient email';
      }
    }
    return null;
  }

  async function initiatePayment() {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    if (!stripePromise) {
      toast.error('Payment is not configured');
      return;
    }

    if (!tenantId) {
      toast.error('Restaurant not found');
      return;
    }

    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: form.amountCents,
          currency: 'usd',
          metadata: { tenantId, source: 'gift_card_purchase', amountCents: form.amountCents },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Payment setup failed');
        return;
      }

      const { clientSecret: cs, paymentIntentId: pi } = await res.json();
      setClientSecret(cs);
      setPaymentIntentId(pi);
    } catch {
      toast.error('Failed to initialize payment');
    }
  }

  async function handlePaymentSuccess(stripePaymentIntentId: string) {
    if (!tenantId) return;

    setSubmitting(true);

    try {
      const result = await purchaseGiftCard({
        tenantId,
        amountCents: form.amountCents,
        purchaserName: form.purchaserName.trim(),
        purchaserEmail: form.purchaserEmail.trim(),
        recipientName: form.deliveryType === 'digital' ? form.recipientName.trim() : undefined,
        recipientEmail: form.deliveryType === 'digital' ? form.recipientEmail.trim() : undefined,
        message: form.deliveryType === 'digital' && form.message.trim() ? form.message.trim() : undefined,
        isDigital: form.deliveryType === 'digital',
        stripePaymentIntentId,
      });

      // Send email if digital
      if (form.deliveryType === 'digital') {
        try {
          await fetch('/api/gift-cards/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientEmail: form.recipientEmail.trim(),
              recipientName: form.recipientName.trim(),
              purchaserName: form.purchaserName.trim(),
              message: form.message.trim() || undefined,
              code: result.code,
              amountCents: form.amountCents,
              tenantId,
            }),
          });
        } catch {
          // Email send failure is non-blocking; the gift card was still created
          toast.error('Gift card created but email delivery failed. Please share the code manually.');
        }
      }

      setPurchaseResult({
        giftCardId: result.giftCardId,
        code: result.code,
        amountCents: form.amountCents,
        recipientEmail: form.deliveryType === 'digital' ? form.recipientEmail.trim() : undefined,
        isDigital: form.deliveryType === 'digital',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create gift card');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBuyAnother() {
    setForm(initialFormState);
    setClientSecret(null);
    setPaymentIntentId(null);
    setPurchaseResult(null);
    setCopied(false);
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy — please select and copy manually');
    }
  }

  // Loading state
  if (!tenant) {
    return (
      <div role="status" aria-live="polite" className="text-center py-20 text-muted-foreground">
        Loading...
      </div>
    );
  }

  // Success screen
  if (purchaseResult) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Gift className="h-8 w-8 text-green-600" aria-hidden="true" />
          </div>

          <h1 className="text-2xl font-bold mb-2">Gift Card Purchased!</h1>
          <p className="text-muted-foreground mb-8">
            {purchaseResult.isDigital
              ? `A $${formatCents(purchaseResult.amountCents)} gift card has been created.`
              : `Your $${formatCents(purchaseResult.amountCents)} gift card is ready.`}
          </p>

          {/* Gift card code display */}
          <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 mb-6 bg-muted/30">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Gift Card Code
            </p>
            <p
              className="text-3xl font-mono font-bold tracking-widest text-primary select-all"
              aria-label={`Gift card code: ${purchaseResult.code}`}
            >
              {purchaseResult.code}
            </p>
            <p className="text-lg font-semibold mt-3">
              Balance: ${formatCents(purchaseResult.amountCents)}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => copyCode(purchaseResult.code)}
            className="mb-4 w-full sm:w-auto"
            aria-label="Copy gift card code to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
                Copy Code
              </>
            )}
          </Button>

          {purchaseResult.isDigital && purchaseResult.recipientEmail && (
            <p className="text-sm text-muted-foreground mb-6">
              <Mail className="inline h-4 w-4 mr-1" aria-hidden="true" />
              Email sent to {purchaseResult.recipientEmail}
            </p>
          )}

          <div className="pt-4">
            <Button onClick={handleBuyAnother} className="w-full sm:w-auto">
              Buy Another Gift Card
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Purchase form
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <Gift className="h-10 w-10 mx-auto mb-4 text-primary" aria-hidden="true" />
        <h1 className="text-3xl font-bold mb-2">Gift Cards</h1>
        <p className="text-muted-foreground">
          The perfect gift for someone who loves {tenant.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase a Gift Card</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Amount Selection */}
          <section aria-labelledby="amount-heading">
            <h3 id="amount-heading" className="text-sm font-medium mb-3">
              Select Amount
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => selectPresetAmount(amount)}
                  className={`rounded-lg border-2 py-3 px-4 text-center font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    form.isPreset && form.amountCents === amount
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50 text-foreground'
                  }`}
                  aria-pressed={form.isPreset && form.amountCents === amount}
                >
                  ${formatCents(amount)}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-amount">Custom Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="custom-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="Enter amount ($10 - $500)"
                  value={form.customAmountInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleCustomAmountChange(e.target.value)
                  }
                  onFocus={() => {
                    if (form.isPreset) {
                      setForm((prev) => ({ ...prev, isPreset: false, customAmountInput: '' }));
                    }
                  }}
                  className="pl-7"
                  aria-describedby="amount-range"
                />
              </div>
              <p id="amount-range" className="text-xs text-muted-foreground">
                Minimum $10, maximum $500
              </p>
            </div>
          </section>

          <Separator />

          {/* Delivery Type Toggle */}
          <section aria-labelledby="delivery-heading">
            <h3 id="delivery-heading" className="text-sm font-medium mb-3">
              Delivery Method
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateForm('deliveryType', 'digital')}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  form.deliveryType === 'digital'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50 text-foreground'
                }`}
                aria-pressed={form.deliveryType === 'digital'}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Digital (Email)
              </button>
              <button
                type="button"
                onClick={() => updateForm('deliveryType', 'physical')}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  form.deliveryType === 'physical'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50 text-foreground'
                }`}
                aria-pressed={form.deliveryType === 'physical'}
              >
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                Physical (Print Code)
              </button>
            </div>
          </section>

          <Separator />

          {/* Purchaser Info */}
          <section aria-labelledby="purchaser-heading">
            <h3 id="purchaser-heading" className="text-sm font-medium mb-3">
              Your Information
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="purchaser-name">Your Name *</Label>
                <Input
                  id="purchaser-name"
                  type="text"
                  required
                  placeholder="Your full name"
                  value={form.purchaserName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateForm('purchaserName', e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purchaser-email">Your Email *</Label>
                <Input
                  id="purchaser-email"
                  type="email"
                  required
                  placeholder="you@email.com"
                  value={form.purchaserEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateForm('purchaserEmail', e.target.value)
                  }
                  aria-describedby="purchaser-email-hint"
                />
                <p id="purchaser-email-hint" className="text-xs text-muted-foreground">
                  We'll send your receipt here
                </p>
              </div>
            </div>
          </section>

          {/* Recipient Info (digital only) */}
          {form.deliveryType === 'digital' && (
            <>
              <Separator />
              <section aria-labelledby="recipient-heading">
                <h3 id="recipient-heading" className="text-sm font-medium mb-3">
                  Recipient Information
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="recipient-name">Recipient Name *</Label>
                    <Input
                      id="recipient-name"
                      type="text"
                      required
                      placeholder="Recipient's name"
                      value={form.recipientName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateForm('recipientName', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recipient-email">Recipient Email *</Label>
                    <Input
                      id="recipient-email"
                      type="email"
                      required
                      placeholder="recipient@email.com"
                      value={form.recipientEmail}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateForm('recipientEmail', e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gift-message">
                      Personal Message{' '}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <textarea
                      id="gift-message"
                      placeholder="Add a personal message..."
                      maxLength={MESSAGE_MAX_LENGTH}
                      rows={3}
                      value={form.message}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        updateForm('message', e.target.value)
                      }
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      aria-describedby="message-count"
                    />
                    <p id="message-count" className="text-xs text-muted-foreground text-right">
                      {form.message.length}/{MESSAGE_MAX_LENGTH}
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* Payment / Checkout */}
          <section aria-labelledby="payment-heading">
            <h3 id="payment-heading" className="text-sm font-medium mb-3">
              Payment
            </h3>

            <div className="rounded-lg bg-muted/50 p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gift Card Amount</span>
                <span className="text-lg font-semibold">
                  ${form.amountCents >= MIN_AMOUNT_CENTS ? formatCents(form.amountCents) : '—'}
                </span>
              </div>
            </div>

            {!stripePromise && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 mb-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-yellow-800">
                  Online payments are not currently configured. Please contact the restaurant to
                  purchase gift cards.
                </p>
              </div>
            )}

            {clientSecret && stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <GiftCardStripeForm
                  onSuccess={handlePaymentSuccess}
                  submitting={submitting}
                  total={form.amountCents}
                />
              </Elements>
            ) : (
              <Button
                onClick={initiatePayment}
                className="w-full"
                disabled={
                  !stripePromise ||
                  form.amountCents < MIN_AMOUNT_CENTS ||
                  form.amountCents > MAX_AMOUNT_CENTS
                }
                size="lg"
              >
                <Gift className="h-4 w-4 mr-2" aria-hidden="true" />
                {form.amountCents >= MIN_AMOUNT_CENTS
                  ? `Purchase Gift Card — $${formatCents(form.amountCents)}`
                  : 'Select an Amount'}
              </Button>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== Stripe Checkout Form ====================

function GiftCardStripeForm({
  onSuccess,
  submitting,
  total,
}: {
  onSuccess: (paymentIntentId: string) => void;
  submitting: boolean;
  total: number;
}) {
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
        return_url: window.location.href,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || processing || submitting}
      >
        {processing || submitting
          ? 'Processing...'
          : `Pay $${formatCents(total)}`}
      </Button>
    </form>
  );
}

// ==================== Helpers ====================

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
