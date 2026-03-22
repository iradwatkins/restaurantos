'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Input, Separator } from '@restaurantos/ui';
import { ArrowLeft, DollarSign, RotateCcw } from 'lucide-react';
import { formatCents } from '@/lib/format';

const QUICK_AMOUNTS_CENTS = [
  { label: '$1', value: 100 },
  { label: '$5', value: 500 },
  { label: '$10', value: 1000 },
  { label: '$20', value: 2000 },
  { label: '$50', value: 5000 },
  { label: '$100', value: 10000 },
];

interface CashTenderProps {
  /** Grand total in cents (order total + tip) */
  totalCents: number;
  /** Order number for display */
  orderNumber: number;
  /** Tip amount in cents (0 if no tip) */
  tipCents?: number;
  /** Called when cashier completes the cash payment */
  onComplete: () => void;
  /** Called when cashier clicks back to return to payment method selection */
  onBack: () => void;
}

export function CashTender({ totalCents, orderNumber, tipCents = 0, onComplete, onBack }: CashTenderProps) {
  const [amountCents, setAmountCents] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the amount input on mount
    inputRef.current?.focus();
  }, []);

  const changeCents = amountCents - totalCents;
  const isSufficient = amountCents >= totalCents;

  function handleInputChange(value: string) {
    // Allow only digits and a single decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    // Only allow one decimal and max 2 decimal places
    let formatted = parts[0] || '';
    if (parts.length > 1) {
      formatted += '.' + (parts[1] || '').slice(0, 2);
    }

    const dollars = parseFloat(formatted);
    if (isNaN(dollars) || formatted === '') {
      setAmountCents(0);
    } else {
      setAmountCents(Math.round(dollars * 100));
    }
  }

  function addAmount(cents: number) {
    setAmountCents((prev) => prev + cents);
    // Update the visible input value
    if (inputRef.current) {
      const newTotal = amountCents + cents;
      inputRef.current.value = (newTotal / 100).toFixed(2);
    }
  }

  function setExact() {
    setAmountCents(totalCents);
    if (inputRef.current) {
      inputRef.current.value = (totalCents / 100).toFixed(2);
    }
  }

  function handleClear() {
    setAmountCents(0);
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  }

  return (
    <div className="space-y-5">
      {/* Header: Order total */}
      <div className="text-center">
        <span className="text-sm text-muted-foreground">Order #{orderNumber} — Total Due</span>
        <p className="text-3xl font-bold mt-1">${formatCents(totalCents)}</p>
        {tipCents > 0 && (
          <p className="text-xs text-green-600 mt-0.5">
            Includes ${formatCents(tipCents)} tip
          </p>
        )}
      </div>

      <Separator />

      {/* Amount received input */}
      <div className="space-y-2">
        <label htmlFor="cash-received" className="text-sm font-medium">
          Amount Received
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            id="cash-received"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            className="pl-9 text-2xl font-bold h-14 text-right"
            onChange={(e) => handleInputChange(e.target.value)}
          />
        </div>
      </div>

      {/* Quick-select denomination buttons */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS_CENTS.map(({ label, value }) => (
          <Button
            key={value}
            variant="outline"
            className="h-12 text-base font-semibold"
            onClick={() => addAmount(value)}
          >
            {label}
          </Button>
        ))}
        <Button
          variant="outline"
          className="h-12 text-sm font-semibold"
          onClick={setExact}
        >
          Exact
        </Button>
        <Button
          variant="ghost"
          className="h-12 text-sm text-muted-foreground"
          onClick={handleClear}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      <Separator />

      {/* Change display */}
      <div className="text-center py-2">
        {amountCents === 0 ? (
          <p className="text-lg text-muted-foreground">Enter amount received</p>
        ) : isSufficient ? (
          <>
            <span className="text-sm text-muted-foreground">Change Due</span>
            <p className="text-4xl font-bold text-green-600">${formatCents(changeCents)}</p>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">Still owed</span>
            <p className="text-4xl font-bold text-red-500">${formatCents(Math.abs(changeCents))}</p>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          className="flex-[2] h-12 text-base"
          disabled={!isSufficient}
          onClick={onComplete}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Complete Payment
        </Button>
      </div>
    </div>
  );
}
