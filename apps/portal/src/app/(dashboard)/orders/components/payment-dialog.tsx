'use client';

import { useState, useRef } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Separator,
} from '@restaurantos/ui';
import { CreditCard, DollarSign, X } from 'lucide-react';
import { toast } from 'sonner';
import { CashTender } from '@/components/cash-tender';
import { formatCents } from '@/lib/format';

const TIP_PRESETS = [
  { label: '15%', pct: 15 },
  { label: '18%', pct: 18 },
  { label: '20%', pct: 20 },
  { label: '25%', pct: 25 },
] as const;

interface PaymentDialogProps {
  showPayDialog: string | null;
  activeOrders: any[] | undefined;
  handleCashPayment: (
    orderId: any,
    orderTotal: number,
    tipAmount: number,
    tipMethod: 'cash' | 'card'
  ) => void;
  setShowPayDialog: (orderId: string | null) => void;
  ageVerifyItem: any;
  setAgeVerifyItem: (item: any) => void;
  setAgeVerifiedThisSession: (verified: boolean) => void;
  addToCart: (item: any) => void;
  formatCents: (cents: number) => string;
}

type TipSelection = { type: 'none' } | { type: 'percent'; pct: number } | { type: 'custom' };

export function PaymentDialog({
  showPayDialog,
  activeOrders,
  handleCashPayment,
  setShowPayDialog,
  ageVerifyItem,
  setAgeVerifyItem,
  setAgeVerifiedThisSession,
  addToCart,
}: PaymentDialogProps) {
  const [showCashTender, setShowCashTender] = useState(false);
  const [tipSelection, setTipSelection] = useState<TipSelection>({ type: 'none' });
  const [customTipCents, setCustomTipCents] = useState(0);
  const customTipRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setShowCashTender(false);
    setTipSelection({ type: 'none' });
    setCustomTipCents(0);
  }

  function calculateTipCents(orderSubtotal: number): number {
    if (tipSelection.type === 'percent') {
      return Math.round(orderSubtotal * (tipSelection.pct / 100));
    }
    if (tipSelection.type === 'custom') {
      return customTipCents;
    }
    return 0;
  }

  function handleCustomTipInput(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    let formatted = parts[0] || '';
    if (parts.length > 1) {
      formatted += '.' + (parts[1] || '').slice(0, 2);
    }
    const dollars = parseFloat(formatted);
    if (isNaN(dollars) || formatted === '') {
      setCustomTipCents(0);
    } else {
      setCustomTipCents(Math.round(dollars * 100));
    }
  }

  return (
    <>
      {/* Payment Dialog */}
      <Dialog
        open={!!showPayDialog}
        onOpenChange={() => {
          setShowPayDialog(null);
          resetState();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription className="sr-only">Complete order payment</DialogDescription>
          </DialogHeader>
          {showPayDialog &&
            (() => {
              const order = activeOrders?.find((o) => o._id === showPayDialog);
              if (!order) return null;

              // order.total is the pre-tip total (subtotal + tax)
              const orderTotal = order.total as number;
              const tipCents = calculateTipCents(orderTotal);
              const grandTotal = orderTotal + tipCents;

              if (showCashTender) {
                return (
                  <CashTender
                    totalCents={grandTotal}
                    orderNumber={order.orderNumber}
                    tipCents={tipCents}
                    onComplete={() =>
                      handleCashPayment(order._id, grandTotal, tipCents, 'cash')
                    }
                    onBack={() => setShowCashTender(false)}
                  />
                );
              }

              return (
                <div className="space-y-4">
                  {/* Order total display */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Order #{order.orderNumber}
                    </p>
                    <p className="text-2xl font-bold">${formatCents(orderTotal)}</p>
                  </div>

                  <Separator />

                  {/* Tip Selection */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-center">Add Tip</p>

                    {/* Preset tip buttons */}
                    <div className="grid grid-cols-5 gap-2">
                      {TIP_PRESETS.map(({ label, pct }) => {
                        const isActive =
                          tipSelection.type === 'percent' && tipSelection.pct === pct;
                        return (
                          <Button
                            key={pct}
                            variant={isActive ? 'default' : 'outline'}
                            size="sm"
                            className="h-10 text-sm font-semibold"
                            onClick={() =>
                              setTipSelection(
                                isActive ? { type: 'none' } : { type: 'percent', pct }
                              )
                            }
                          >
                            {label}
                          </Button>
                        );
                      })}
                      <Button
                        variant={tipSelection.type === 'custom' ? 'default' : 'outline'}
                        size="sm"
                        className="h-10 text-sm font-semibold"
                        onClick={() => {
                          if (tipSelection.type === 'custom') {
                            setTipSelection({ type: 'none' });
                            setCustomTipCents(0);
                          } else {
                            setTipSelection({ type: 'custom' });
                            setCustomTipCents(0);
                            // Focus the input on next render
                            setTimeout(() => customTipRef.current?.focus(), 50);
                          }
                        }}
                      >
                        Custom
                      </Button>
                    </div>

                    {/* Custom tip input */}
                    {tipSelection.type === 'custom' && (
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          ref={customTipRef}
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="pl-9 text-lg font-bold h-12 text-right"
                          onChange={(e) => handleCustomTipInput(e.target.value)}
                        />
                      </div>
                    )}

                    {/* No Tip button — only shown when a tip is active */}
                    {tipSelection.type !== 'none' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground"
                        onClick={() => {
                          setTipSelection({ type: 'none' });
                          setCustomTipCents(0);
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        No Tip
                      </Button>
                    )}
                  </div>

                  {/* Tip + Grand Total summary */}
                  {tipCents > 0 && (
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order Total</span>
                        <span>${formatCents(orderTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tip</span>
                        <span className="text-green-600 font-medium">
                          +${formatCents(tipCents)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span>${formatCents(grandTotal)}</span>
                      </div>
                    </div>
                  )}

                  {/* Payment method buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      className="h-16"
                      variant="outline"
                      onClick={() => setShowCashTender(true)}
                    >
                      <DollarSign className="mr-2 h-5 w-5" />
                      Cash
                    </Button>
                    <Button
                      className="h-16"
                      onClick={() => {
                        toast.info(
                          'Card payments require Stripe Terminal setup. Configure in Settings > Online Ordering.'
                        );
                      }}
                    >
                      <CreditCard className="mr-2 h-5 w-5" />
                      Card
                    </Button>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Age Verification Dialog */}
      <Dialog open={!!ageVerifyItem} onOpenChange={() => setAgeVerifyItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Age Verification Required</DialogTitle>
            <DialogDescription className="sr-only">
              Verify customer age for alcohol service
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Has the customer been verified as 21 years of age or older?
          </p>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setAgeVerifyItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setAgeVerifiedThisSession(true);
                const item = ageVerifyItem;
                setAgeVerifyItem(null);
                if (item) addToCart(item);
              }}
            >
              Yes, Verified 21+
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
