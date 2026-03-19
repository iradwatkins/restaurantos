'use client';

import { Button } from '@restaurantos/ui';
import { CheckCircle2 } from 'lucide-react';

interface OrderConfirmationPhaseProps {
  confirmationOrderNumber: number | null;
  onBackToTables: () => void;
}

export function OrderConfirmationPhase({ confirmationOrderNumber, onBackToTables }: OrderConfirmationPhaseProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <div className="rounded-full bg-green-100 p-6">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold">Order Sent!</h2>
        {confirmationOrderNumber && (
          <p className="text-lg text-muted-foreground mt-1">Order #{confirmationOrderNumber}</p>
        )}
        <p className="text-sm text-muted-foreground mt-2">Returning to tables...</p>
      </div>
      <Button
        variant="outline"
        size="lg"
        className="mt-4"
        onClick={onBackToTables}
      >
        Back to Tables
      </Button>
    </div>
  );
}
