'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
} from '@restaurantos/ui';
import { toast } from 'sonner';
import { formatCents } from '@/lib/format';

interface CompDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: Id<'orders'> | null;
  orderNumber: number;
  orderTotal: number;
}

export function CompDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  orderTotal,
}: CompDialogProps) {
  const compOrder = useMutation(api.orders.mutations.compOrder);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setReason('');
    setSubmitting(false);
    onOpenChange(false);
  }

  async function handleComp() {
    if (!orderId) return;
    if (!reason.trim()) {
      toast.error('A comp reason is required');
      return;
    }

    setSubmitting(true);
    try {
      const result = await compOrder({
        orderId,
        reason: reason.trim(),
      });
      toast.success(
        `Order #${orderNumber} comped — $${formatCents(result.compedAmount)} waived`
      );
      handleClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to comp order');
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comp Order #{orderNumber}</DialogTitle>
          <DialogDescription>
            This will set the order total to $0.00. The current total of $
            {formatCents(orderTotal)} will be fully waived.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            This action is recorded in the audit log. Only comp orders with a valid business reason.
          </div>
          <div className="space-y-2">
            <Label htmlFor="comp-reason">Reason for Comp</Label>
            <Input
              id="comp-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer complaint, VIP guest, food quality issue"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Required for audit trail</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleComp}
            disabled={!reason.trim() || submitting}
          >
            {submitting ? 'Processing...' : 'Comp Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
