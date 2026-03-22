'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Switch,
  Separator,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@restaurantos/ui';
import { Plus, Pencil, Trash2, Percent, DollarSign, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatCents } from '@/lib/format';

interface DiscountsTabProps {
  tenantId: Id<'tenants'>;
}

export function DiscountsTab({ tenantId }: DiscountsTabProps) {
  const discounts = useQuery(api.discounts.queries.getDiscounts, { tenantId });

  const createDiscount = useMutation(api.discounts.mutations.createDiscount);
  const updateDiscount = useMutation(api.discounts.mutations.updateDiscount);
  const toggleDiscount = useMutation(api.discounts.mutations.toggleDiscount);
  const deleteDiscount = useMutation(api.discounts.mutations.deleteDiscount);

  const [showDialog, setShowDialog] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  function openCreate() {
    setEditingDiscount(null);
    setShowDialog(true);
  }

  function openEdit(discount: any) {
    setEditingDiscount(discount);
    setShowDialog(true);
  }

  async function handleToggle(id: Id<'discounts'>) {
    try {
      const result = await toggleDiscount({ id });
      toast.success(`${result.name} is now ${result.isActive ? 'active' : 'inactive'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle discount');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDiscount({ id: deleteTarget._id, hard: true });
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete discount');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get('name') as string).trim();
    const type = form.get('type') as 'percentage' | 'fixed';
    const rawValue = parseFloat(form.get('value') as string);
    const requiresApproval = form.get('requiresApproval') === 'on';

    if (!name) {
      toast.error('Name is required');
      return;
    }
    if (isNaN(rawValue) || rawValue < 0) {
      toast.error('Value must be a positive number');
      return;
    }
    if (type === 'percentage' && rawValue > 100) {
      toast.error('Percentage cannot exceed 100%');
      return;
    }

    // For fixed type, convert dollars to cents
    const value = type === 'fixed' ? Math.round(rawValue * 100) : rawValue;

    try {
      if (editingDiscount) {
        await updateDiscount({
          id: editingDiscount._id,
          name,
          type,
          value,
          requiresApproval,
        });
        toast.success('Discount updated');
      } else {
        await createDiscount({
          tenantId,
          name,
          type,
          value,
          requiresApproval,
        });
        toast.success('Discount created');
      }
      setShowDialog(false);
      setEditingDiscount(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save discount');
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Discount Presets</CardTitle>
              <CardDescription>
                Create reusable discounts your staff can apply at the POS
              </CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Discount
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {discounts?.map((discount) => (
              <div
                key={discount._id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={discount.isActive}
                    onCheckedChange={() => handleToggle(discount._id)}
                    aria-label={`Toggle ${discount.name}`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{discount.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {discount.type === 'percentage' ? (
                          <Percent className="h-3 w-3 mr-1" />
                        ) : (
                          <DollarSign className="h-3 w-3 mr-1" />
                        )}
                        {displayValue(discount)}
                      </Badge>
                      {!discount.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                      {discount.requiresApproval && (
                        <Badge variant="warning" className="text-xs">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Approval
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(discount)}
                    aria-label={`Edit ${discount.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteTarget(discount)}
                    aria-label={`Delete ${discount.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {(!discounts || discounts.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No discounts yet. Create your first discount preset above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDialog(false);
            setEditingDiscount(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDiscount ? 'Edit Discount' : 'Create Discount'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingDiscount ? 'Modify an existing discount preset' : 'Add a new discount preset'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discount-name">Name</Label>
              <Input
                id="discount-name"
                name="name"
                defaultValue={editingDiscount?.name ?? ''}
                placeholder="e.g., Happy Hour 20%, Military Discount"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount-type">Type</Label>
                <select
                  id="discount-type"
                  name="type"
                  defaultValue={editingDiscount?.type ?? 'percentage'}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount-value">Value</Label>
                <Input
                  id="discount-value"
                  name="value"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={
                    editingDiscount
                      ? editingDiscount.type === 'fixed'
                        ? (editingDiscount.value / 100).toFixed(2)
                        : editingDiscount.value
                      : ''
                  }
                  placeholder={editingDiscount?.type === 'fixed' ? '5.00' : '20'}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Percentage: 0-100. Fixed: dollar amount.
                </p>
              </div>
            </div>
            <Separator />
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="requiresApproval"
                defaultChecked={editingDiscount?.requiresApproval ?? false}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div>
                <span className="font-medium text-sm">Requires Manager Approval</span>
                <p className="text-xs text-muted-foreground">
                  Staff will see a confirmation step before applying this discount
                </p>
              </div>
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingDiscount ? 'Save Changes' : 'Create Discount'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Discount</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete &ldquo;{deleteTarget?.name}&rdquo;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
