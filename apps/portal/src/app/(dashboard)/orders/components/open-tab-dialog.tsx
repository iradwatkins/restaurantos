'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface OpenTabDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: Id<'tenants'>;
  tables: Array<{
    _id: Id<'tables'>;
    name: string;
    status: string;
  }>;
  onTabOpened: () => void;
}

export function OpenTabDialog({
  open,
  onOpenChange,
  tenantId,
  tables,
  onTabOpened,
}: OpenTabDialogProps) {
  const openTabMut = useMutation(api.orders.mutations.openTab);
  const [customerName, setCustomerName] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure the dialog has rendered
      const timer = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  function handleClose() {
    setCustomerName('');
    setSelectedTableId('');
    setSubmitting(false);
    onOpenChange(false);
  }

  async function handleOpenTab() {
    const trimmedName = customerName.trim();
    if (!trimmedName) {
      toast.error('Customer name is required');
      return;
    }

    setSubmitting(true);
    try {
      const selectedTable = tables.find((t) => t._id === selectedTableId);

      await openTabMut({
        tenantId,
        customerName: trimmedName,
        tableId: selectedTableId
          ? (selectedTableId as Id<'tables'>)
          : undefined,
        tableName: selectedTable?.name,
      });

      toast.success(`Tab opened for ${trimmedName}`);
      handleClose();
      onTabOpened();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to open tab';
      toast.error(message);
      setSubmitting(false);
    }
  }

  const openTables = tables.filter((t) => t.status === 'open');

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open New Tab</DialogTitle>
          <DialogDescription>
            Start a running tab for a customer. Items can be added
            incrementally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tab-customer-name">Customer Name</Label>
            <Input
              ref={nameInputRef}
              id="tab-customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g., John Smith"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customerName.trim()) {
                  handleOpenTab();
                }
              }}
              aria-required="true"
            />
          </div>

          {openTables.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="tab-table-select">
                Table{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <select
                id="tab-table-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
              >
                <option value="">No table</option>
                {openTables.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleOpenTab}
            disabled={!customerName.trim() || submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? 'Opening...' : 'Open Tab'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
