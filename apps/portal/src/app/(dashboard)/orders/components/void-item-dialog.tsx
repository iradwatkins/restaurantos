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

interface VoidItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: Id<'orders'> | null;
  itemIndex: number | null;
  itemName: string;
  itemTotal: number;
}

export function VoidItemDialog({
  open,
  onOpenChange,
  orderId,
  itemIndex,
  itemName,
  itemTotal,
}: VoidItemDialogProps) {
  const voidItem = useMutation(api.orders.mutations.voidItem);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setReason('');
    setSubmitting(false);
    onOpenChange(false);
  }

  async function handleVoid() {
    if (!orderId || itemIndex === null) return;
    if (!reason.trim()) {
      toast.error('A void reason is required');
      return;
    }

    setSubmitting(true);
    try {
      const result = await voidItem({
        orderId,
        itemIndex,
        voidReason: reason.trim(),
      });
      toast.success(`Voided "${result.voidedItem}" — new total $${formatCents(result.newTotal)}`);
      handleClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to void item');
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void Item</DialogTitle>
          <DialogDescription>
            Remove &ldquo;{itemName}&rdquo; (${formatCents(itemTotal)}) from this order. The item
            will remain visible but marked as voided.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason for Void</Label>
            <Input
              id="void-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Wrong item, customer changed mind"
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
            onClick={handleVoid}
            disabled={!reason.trim() || submitting}
          >
            {submitting ? 'Voiding...' : 'Void Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
