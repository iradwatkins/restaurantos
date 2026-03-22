'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Separator,
} from '@restaurantos/ui';
import { Percent, DollarSign, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCents } from '@/lib/format';

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: Id<'orders'> | null;
  orderSubtotal: number;
  tenantId: Id<'tenants'>;
  hasDiscount: boolean;
  currentDiscountType?: string;
  currentDiscountValue?: number;
  currentDiscountAmount?: number;
  isComped?: boolean;
}

export function DiscountDialog({
  open,
  onOpenChange,
  orderId,
  orderSubtotal,
  tenantId,
  hasDiscount,
  currentDiscountType,
  currentDiscountValue,
  currentDiscountAmount,
  isComped,
}: DiscountDialogProps) {
  const activeDiscounts = useQuery(
    api.discounts.queries.getActiveDiscounts,
    tenantId ? { tenantId } : 'skip'
  );

  const applyDiscount = useMutation(api.orders.mutations.applyDiscount);
  const removeDiscount = useMutation(api.orders.mutations.removeDiscount);

  const [approvalDiscount, setApprovalDiscount] = useState<any | null>(null);

  async function handleApply(discount: any) {
    if (!orderId) return;

    if (discount.requiresApproval) {
      setApprovalDiscount(discount);
      return;
    }

    await doApply(discount);
  }

  async function doApply(discount: any) {
    if (!orderId) return;
    try {
      const result = await applyDiscount({
        orderId,
        discountId: discount._id,
        discountType: discount.type,
        discountValue: discount.value,
      });
      toast.success(
        `Applied "${discount.name}" — saved $${formatCents(result.discountAmount)}`
      );
      setApprovalDiscount(null);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply discount');
    }
  }

  async function handleRemove() {
    if (!orderId) return;
    try {
      await removeDiscount({ orderId });
      toast.success('Discount removed');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove discount');
    }
  }

  function displayValue(discount: { type: string; value: number }) {
    if (discount.type === 'percentage') {
      return `${discount.value}%`;
    }
    return `$${formatCents(discount.value)}`;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
            <DialogDescription className="sr-only">
              Select a discount to apply to the current order
            </DialogDescription>
          </DialogHeader>

          {/* Current discount info */}
          {hasDiscount && !isComped && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Discount</span>
                <Badge variant="outline">
                  {currentDiscountType === 'percentage'
                    ? `${currentDiscountValue}%`
                    : currentDiscountType === 'fixed'
                      ? `$${formatCents(currentDiscountValue ?? 0)}`
                      : 'Comp'}
                </Badge>
              </div>
              {currentDiscountAmount !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount Saved</span>
                  <span className="font-medium text-green-600">
                    -${formatCents(currentDiscountAmount)}
                  </span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive"
                onClick={handleRemove}
              >
                <X className="h-3 w-3 mr-1" />
                Remove Discount
              </Button>
            </div>
          )}

          {isComped && (
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <Badge variant="destructive" className="text-sm">COMPED</Badge>
              <p className="text-sm text-muted-foreground mt-1">
                This order has been comped. Remove the comp to apply a discount.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-destructive"
                onClick={handleRemove}
              >
                <X className="h-3 w-3 mr-1" />
                Remove Comp
              </Button>
            </div>
          )}

          {!isComped && (
            <>
              <Separator />

              <div className="text-xs text-muted-foreground text-center">
                Order subtotal: ${formatCents(orderSubtotal)}
              </div>

              {/* Available discounts */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {activeDiscounts?.map((discount) => {
                  const previewAmount =
                    discount.type === 'percentage'
                      ? Math.round(orderSubtotal * discount.value / 100)
                      : Math.min(discount.value, orderSubtotal);

                  return (
                    <button
                      key={discount._id}
                      onClick={() => handleApply(discount)}
                      className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          {discount.type === 'percentage' ? (
                            <Percent className="h-4 w-4 text-primary" />
                          ) : (
                            <DollarSign className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm">{discount.name}</span>
                            {discount.requiresApproval && (
                              <ShieldCheck className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {displayValue(discount)}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-green-600">
                        -${formatCents(previewAmount)}
                      </span>
                    </button>
                  );
                })}

                {(!activeDiscounts || activeDiscounts.length === 0) && (
                  <p className="text-center text-muted-foreground py-6 text-sm">
                    No active discounts. Create discounts in Settings &gt; Discounts.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation */}
      <Dialog
        open={!!approvalDiscount}
        onOpenChange={(open) => {
          if (!open) setApprovalDiscount(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manager Approval Required</DialogTitle>
            <DialogDescription>
              The discount &ldquo;{approvalDiscount?.name}&rdquo; requires manager approval before
              it can be applied.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              Confirm that a manager has authorized this {approvalDiscount?.type === 'percentage' ? `${approvalDiscount?.value}%` : `$${formatCents(approvalDiscount?.value ?? 0)}`} discount.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDiscount(null)}>
              Cancel
            </Button>
            <Button onClick={() => doApply(approvalDiscount)}>
              Confirm &amp; Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
