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
} from '@restaurantos/ui';
import { Star, Gift, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface LoyaltyCheckoutSectionProps {
  customerId: string | null;
  tenantId: Id<'tenants'>;
  orderTotal: number;
  onRewardApplied?: (rewardId: string, discountCents: number) => void;
}

/**
 * Displays customer loyalty points balance in the POS cart area,
 * shows how many points will be earned, and allows applying a reward.
 */
export function LoyaltyCheckoutSection({
  customerId,
  tenantId,
  orderTotal,
  onRewardApplied,
}: LoyaltyCheckoutSectionProps) {
  const loyaltySettings = useQuery(api.loyalty.queries.getSettings, { tenantId });
  const customerLoyalty = useQuery(
    api.loyalty.queries.getCustomerLoyalty,
    customerId ? { customerId: customerId as Id<'customers'> } : 'skip'
  );
  const rewards = useQuery(api.loyalty.queries.getRewards, { tenantId });

  const redeemReward = useMutation(api.loyalty.mutations.redeemReward);

  const [showRewardPicker, setShowRewardPicker] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  // Don't render anything if loyalty is disabled, no customer selected, or still loading
  if (!loyaltySettings?.enabled || !customerId) {
    return null;
  }

  if (customerLoyalty === undefined) {
    return null; // Still loading
  }

  const currentPoints = customerLoyalty?.currentPoints ?? 0;
  const tierName = customerLoyalty?.tierName ?? 'Base';
  const tierMultiplier = customerLoyalty?.tierMultiplier ?? 1;

  // Calculate points that will be earned from this order
  const baseRate = loyaltySettings.pointsPerDollar ?? 1;
  const orderDollars = orderTotal / 100;
  const pointsToEarn = Math.round(orderDollars * baseRate * tierMultiplier);

  // Find redeemable rewards (customer has enough points)
  const availableRewards = rewards?.filter(
    (r: any) => r.pointsRequired <= currentPoints
  ) ?? [];

  async function handleRedeemReward(reward: any) {
    setRedeeming(true);
    try {
      const result = await redeemReward({
        customerId: customerId as Id<'customers'>,
        rewardId: reward._id,
        orderTotal,
      });
      toast.success(`Applied: ${reward.name}`);
      setShowRewardPicker(false);
      if (onRewardApplied) {
        onRewardApplied(reward._id, result.discountCents);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to redeem reward');
    } finally {
      setRedeeming(false);
    }
  }

  function formatRewardValue(reward: { rewardType: string; value: number }) {
    if (reward.rewardType === 'discount_percentage') return `${reward.value}% off`;
    if (reward.rewardType === 'discount_fixed') return `$${(reward.value / 100).toFixed(2)} off`;
    return 'Free item';
  }

  return (
    <>
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Loyalty Points</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {tierName}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Balance</span>
          <span className="font-bold">{currentPoints.toLocaleString()} pts</span>
        </div>

        {pointsToEarn > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Will earn</span>
            <span className="text-green-600 font-medium">+{pointsToEarn} pts</span>
          </div>
        )}

        {availableRewards.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-1 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/50"
            onClick={() => setShowRewardPicker(true)}
          >
            <Gift className="h-3.5 w-3.5 mr-1.5" />
            Apply Reward ({availableRewards.length} available)
          </Button>
        )}
      </div>

      {/* Reward Picker Dialog */}
      <Dialog open={showRewardPicker} onOpenChange={setShowRewardPicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redeem a Reward</DialogTitle>
            <DialogDescription>
              Customer has {currentPoints.toLocaleString()} points available
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableRewards.map((reward: any) => (
              <button
                key={reward._id}
                onClick={() => handleRedeemReward(reward)}
                disabled={redeeming}
                className="w-full text-left p-3 border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{reward.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRewardValue(reward)}
                    </p>
                    {reward.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {reward.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                    {reward.pointsRequired} pts
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Displays "You earned X points!" message after payment completion.
 */
export function LoyaltyEarnedMessage({
  pointsEarned,
}: {
  pointsEarned: number;
}) {
  if (pointsEarned <= 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
      <CheckCircle2 className="h-4 w-4" />
      <span className="font-medium">
        You earned {pointsEarned} loyalty points!
      </span>
    </div>
  );
}
