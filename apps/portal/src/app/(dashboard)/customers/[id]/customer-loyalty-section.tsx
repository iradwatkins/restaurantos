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
  Badge,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Separator,
} from '@restaurantos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import { Star, Trophy, Plus, Minus, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerLoyaltySectionProps {
  customerId: Id<'customers'>;
  tenantId: Id<'tenants'>;
}

export function CustomerLoyaltySection({ customerId, tenantId }: CustomerLoyaltySectionProps) {
  const loyaltySettings = useQuery(api.loyalty.queries.getSettings, { tenantId });
  const customerLoyalty = useQuery(
    api.loyalty.queries.getCustomerLoyalty,
    { customerId }
  );
  const transactions = useQuery(
    api.loyalty.queries.getCustomerTransactions,
    { customerId, limit: 20 }
  );

  const adjustPoints = useMutation(api.loyalty.mutations.adjustPoints);

  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // If loyalty is not enabled, don't show this section
  if (loyaltySettings === undefined || customerLoyalty === undefined) {
    return null; // Still loading
  }

  if (!loyaltySettings?.enabled) {
    return null; // Loyalty not enabled
  }

  const currentPoints = customerLoyalty?.currentPoints ?? 0;
  const lifetimePoints = customerLoyalty?.lifetimePoints ?? 0;
  const tierName = customerLoyalty?.tierName ?? 'Base';

  async function handleAdjustPoints() {
    const amount = parseInt(adjustAmount);
    if (isNaN(amount) || amount < 1) {
      toast.error('Please enter a valid number of points');
      return;
    }
    if (!adjustReason.trim()) {
      toast.error('Please enter a reason for the adjustment');
      return;
    }

    setAdjusting(true);
    try {
      const pointsDelta = adjustType === 'add' ? amount : -amount;
      await adjustPoints({
        customerId,
        points: pointsDelta,
        reason: adjustReason.trim(),
      });
      toast.success(
        adjustType === 'add'
          ? `Added ${amount} points`
          : `Deducted ${amount} points`
      );
      setShowAdjustDialog(false);
      setAdjustAmount('');
      setAdjustReason('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to adjust points');
    } finally {
      setAdjusting(false);
    }
  }

  function formatTransactionType(type: string) {
    switch (type) {
      case 'earned':
        return { label: 'Earned', variant: 'default' as const };
      case 'redeemed':
        return { label: 'Redeemed', variant: 'secondary' as const };
      case 'adjusted':
        return { label: 'Adjusted', variant: 'outline' as const };
      case 'expired':
        return { label: 'Expired', variant: 'destructive' as const };
      default:
        return { label: type, variant: 'outline' as const };
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" />
            Loyalty
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdjustDialog(true)}
          >
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            Adjust Points
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Points Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
            <p className="text-2xl font-bold">{currentPoints.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Tier</p>
            <div className="flex items-center justify-center gap-1.5">
              <Trophy className="h-4 w-4 text-amber-500" />
              <p className="text-lg font-bold">{tierName}</p>
            </div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Lifetime Points</p>
            <p className="text-2xl font-bold">{lifetimePoints.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">total earned</p>
          </div>
        </div>

        {/* Transaction History */}
        {transactions && transactions.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Point History</p>
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx: any) => {
                      const { label, variant } = formatTransactionType(tx.type);
                      const isPositive = tx.points > 0;
                      return (
                        <TableRow key={tx._id}>
                          <TableCell className="text-muted-foreground text-xs">
                            {new Date(tx.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={variant} className="text-xs">
                              {label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {tx.description ?? '-'}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              isPositive ? 'text-green-600' : 'text-destructive'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {tx.points.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}

        {transactions && transactions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No loyalty activity yet
          </p>
        )}
      </CardContent>

      {/* Adjust Points Dialog */}
      <Dialog
        open={showAdjustDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAdjustDialog(false);
            setAdjustAmount('');
            setAdjustReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Loyalty Points</DialogTitle>
            <DialogDescription>
              Manually add or deduct points for this customer. Current balance: {currentPoints.toLocaleString()} pts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add/Deduct toggle */}
            <div className="flex gap-2">
              <Button
                variant={adjustType === 'add' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setAdjustType('add')}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Points
              </Button>
              <Button
                variant={adjustType === 'deduct' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setAdjustType('deduct')}
              >
                <Minus className="h-3.5 w-3.5 mr-1.5" />
                Deduct Points
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjust-amount">Points</Label>
              <Input
                id="adjust-amount"
                type="number"
                min="1"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjust-reason">Reason</Label>
              <Input
                id="adjust-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g., Customer complaint resolution, Bonus promotion"
              />
              <p className="text-xs text-muted-foreground">
                This reason will appear in the point history
              </p>
            </div>

            {adjustAmount && parseInt(adjustAmount) > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span>{currentPoints.toLocaleString()} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adjustment</span>
                  <span
                    className={
                      adjustType === 'add' ? 'text-green-600' : 'text-destructive'
                    }
                  >
                    {adjustType === 'add' ? '+' : '-'}
                    {parseInt(adjustAmount).toLocaleString()} pts
                  </span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between font-medium">
                  <span>New Balance</span>
                  <span>
                    {(adjustType === 'add'
                      ? currentPoints + parseInt(adjustAmount)
                      : Math.max(0, currentPoints - parseInt(adjustAmount))
                    ).toLocaleString()}{' '}
                    pts
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdjustDialog(false)}
                disabled={adjusting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAdjustPoints}
                disabled={adjusting}
              >
                {adjusting
                  ? 'Adjusting...'
                  : adjustType === 'add'
                    ? 'Add Points'
                    : 'Deduct Points'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
