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
import { Plus, Pencil, Trash2, Save, Star, Trophy, Gift } from 'lucide-react';
import { toast } from 'sonner';

interface LoyaltyTabProps {
  tenantId: Id<'tenants'>;
}

interface RewardForm {
  name: string;
  pointsRequired: string;
  rewardType: 'discount_percentage' | 'discount_fixed' | 'free_item';
  value: string;
  description: string;
}

interface TierForm {
  name: string;
  minPoints: string;
  multiplier: string;
}

const EMPTY_REWARD_FORM: RewardForm = {
  name: '',
  pointsRequired: '',
  rewardType: 'discount_fixed',
  value: '',
  description: '',
};

const EMPTY_TIER_FORM: TierForm = {
  name: '',
  minPoints: '',
  multiplier: '1',
};

export function LoyaltyTab({ tenantId }: LoyaltyTabProps) {
  const settings = useQuery(api.loyalty.queries.getSettings, { tenantId });
  const rewards = useQuery(api.loyalty.queries.getRewards, { tenantId });
  const tiers = useQuery(api.loyalty.queries.getTiers, { tenantId });

  const updateSettings = useMutation(api.loyalty.mutations.updateSettings);
  const createReward = useMutation(api.loyalty.mutations.createReward);
  const updateReward = useMutation(api.loyalty.mutations.updateReward);
  const deleteReward = useMutation(api.loyalty.mutations.deleteReward);
  const createTier = useMutation(api.loyalty.mutations.createTier);
  const updateTier = useMutation(api.loyalty.mutations.updateTier);
  const deleteTier = useMutation(api.loyalty.mutations.deleteTier);

  const [enabled, setEnabled] = useState(settings?.enabled ?? false);
  const [pointsPerDollar, setPointsPerDollar] = useState(
    String(settings?.pointsPerDollar ?? 1)
  );
  const [saving, setSaving] = useState(false);

  // Reward dialog state
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [editingReward, setEditingReward] = useState<any | null>(null);
  const [rewardForm, setRewardForm] = useState<RewardForm>(EMPTY_REWARD_FORM);
  const [deleteRewardTarget, setDeleteRewardTarget] = useState<any | null>(null);

  // Tier dialog state
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [editingTier, setEditingTier] = useState<any | null>(null);
  const [tierForm, setTierForm] = useState<TierForm>(EMPTY_TIER_FORM);
  const [deleteTierTarget, setDeleteTierTarget] = useState<any | null>(null);

  // Sync state from query when it loads
  const settingsLoaded = settings !== undefined;
  const [stateInitialized, setStateInitialized] = useState(false);
  if (settingsLoaded && !stateInitialized) {
    setEnabled(settings?.enabled ?? false);
    setPointsPerDollar(String(settings?.pointsPerDollar ?? 1));
    setStateInitialized(true);
  }

  async function handleSaveSettings() {
    const ppd = parseFloat(pointsPerDollar);
    if (isNaN(ppd) || ppd < 0) {
      toast.error('Points per dollar must be a positive number');
      return;
    }
    setSaving(true);
    try {
      await updateSettings({
        tenantId,
        enabled,
        pointsPerDollar: ppd,
      });
      toast.success('Loyalty settings updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  // ── Reward handlers ──

  function openCreateReward() {
    setEditingReward(null);
    setRewardForm(EMPTY_REWARD_FORM);
    setShowRewardDialog(true);
  }

  function openEditReward(reward: any) {
    setEditingReward(reward);
    setRewardForm({
      name: reward.name,
      pointsRequired: String(reward.pointsRequired),
      rewardType: reward.rewardType,
      value: reward.rewardType === 'discount_fixed'
        ? (reward.value / 100).toFixed(2)
        : String(reward.value),
      description: reward.description ?? '',
    });
    setShowRewardDialog(true);
  }

  async function handleSubmitReward() {
    const name = rewardForm.name.trim();
    if (!name) {
      toast.error('Reward name is required');
      return;
    }

    const pointsRequired = parseInt(rewardForm.pointsRequired);
    if (isNaN(pointsRequired) || pointsRequired < 1) {
      toast.error('Points required must be at least 1');
      return;
    }

    const rawValue = parseFloat(rewardForm.value);
    if (isNaN(rawValue) || rawValue < 0) {
      toast.error('Value must be a positive number');
      return;
    }
    if (rewardForm.rewardType === 'discount_percentage' && rawValue > 100) {
      toast.error('Percentage cannot exceed 100%');
      return;
    }

    const value = rewardForm.rewardType === 'discount_fixed'
      ? Math.round(rawValue * 100)
      : rawValue;

    try {
      if (editingReward) {
        await updateReward({
          rewardId: editingReward._id,
          name,
          pointsRequired,
          rewardType: rewardForm.rewardType,
          value,
          description: rewardForm.description.trim() || undefined,
        });
        toast.success('Reward updated');
      } else {
        await createReward({
          tenantId,
          name,
          pointsRequired,
          rewardType: rewardForm.rewardType,
          value,
          description: rewardForm.description.trim() || undefined,
        });
        toast.success('Reward created');
      }
      setShowRewardDialog(false);
      setEditingReward(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save reward');
    }
  }

  async function handleDeleteReward() {
    if (!deleteRewardTarget) return;
    try {
      await deleteReward({ rewardId: deleteRewardTarget._id });
      toast.success(`"${deleteRewardTarget.name}" deleted`);
      setDeleteRewardTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete reward');
    }
  }

  // ── Tier handlers ──

  function openCreateTier() {
    setEditingTier(null);
    setTierForm(EMPTY_TIER_FORM);
    setShowTierDialog(true);
  }

  function openEditTier(tier: any) {
    setEditingTier(tier);
    setTierForm({
      name: tier.name,
      minPoints: String(tier.minPoints),
      multiplier: String(tier.multiplier),
    });
    setShowTierDialog(true);
  }

  async function handleSubmitTier() {
    const name = tierForm.name.trim();
    if (!name) {
      toast.error('Tier name is required');
      return;
    }

    const minPoints = parseInt(tierForm.minPoints);
    if (isNaN(minPoints) || minPoints < 0) {
      toast.error('Minimum points must be 0 or higher');
      return;
    }

    const multiplier = parseFloat(tierForm.multiplier);
    if (isNaN(multiplier) || multiplier < 1) {
      toast.error('Multiplier must be at least 1');
      return;
    }

    try {
      if (editingTier) {
        await updateTier({
          tierId: editingTier._id,
          name,
          minPoints,
          multiplier,
        });
        toast.success('Tier updated');
      } else {
        await createTier({
          tenantId,
          name,
          minPoints,
          multiplier,
        });
        toast.success('Tier created');
      }
      setShowTierDialog(false);
      setEditingTier(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save tier');
    }
  }

  async function handleDeleteTier() {
    if (!deleteTierTarget) return;
    try {
      await deleteTier({ tierId: deleteTierTarget._id });
      toast.success(`"${deleteTierTarget.name}" deleted`);
      setDeleteTierTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete tier');
    }
  }

  function formatRewardValue(reward: { rewardType: string; value: number }) {
    if (reward.rewardType === 'discount_percentage') return `${reward.value}% off`;
    if (reward.rewardType === 'discount_fixed') return `$${(reward.value / 100).toFixed(2)} off`;
    return 'Free item';
  }

  return (
    <>
      {/* Program Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Loyalty Program
          </CardTitle>
          <CardDescription>
            Reward repeat customers with points they can redeem for discounts and free items.
            Points are earned automatically when orders are completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <label className="flex items-center gap-3">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <span className="font-medium">Enable Loyalty Program</span>
          </label>

          {enabled && (
            <>
              <Separator />
              <div className="max-w-xs space-y-2">
                <Label htmlFor="loyalty-ppd">Points Earned Per Dollar Spent</Label>
                <Input
                  id="loyalty-ppd"
                  type="number"
                  step="0.1"
                  min="0"
                  value={pointsPerDollar}
                  onChange={(e) => setPointsPerDollar(e.target.value)}
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">
                  A $25 order earns {Math.round(25 * (parseFloat(pointsPerDollar) || 0))} points at
                  this rate. Tier multipliers stack on top.
                </p>
              </div>
            </>
          )}

          <Separator />

          <Button onClick={handleSaveSettings} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Rewards */}
      {enabled && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Rewards
                </CardTitle>
                <CardDescription>
                  Define rewards customers can redeem with their points
                </CardDescription>
              </div>
              <Button size="sm" onClick={openCreateReward}>
                <Plus className="mr-2 h-4 w-4" />
                Add Reward
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rewards?.map((reward: any) => (
                <div
                  key={reward._id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{reward.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {reward.pointsRequired} pts
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {formatRewardValue(reward)}
                      </Badge>
                    </div>
                    {reward.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {reward.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditReward(reward)}
                      aria-label={`Edit ${reward.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteRewardTarget(reward)}
                      aria-label={`Delete ${reward.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!rewards || rewards.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No rewards configured. Add your first reward above.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tiers */}
      {enabled && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Tiers
                </CardTitle>
                <CardDescription>
                  Define loyalty tiers with point multipliers. Customers advance automatically
                  based on lifetime points earned.
                </CardDescription>
              </div>
              <Button size="sm" onClick={openCreateTier}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tier
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tiers?.map((tier: any) => (
                <div
                  key={tier._id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tier.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {tier.minPoints}+ pts
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {tier.multiplier}x points
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditTier(tier)}
                      aria-label={`Edit ${tier.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteTierTarget(tier)}
                      aria-label={`Delete ${tier.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!tiers || tiers.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No tiers configured. All customers earn at the base rate.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reward Create/Edit Dialog */}
      <Dialog
        open={showRewardDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowRewardDialog(false);
            setEditingReward(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReward ? 'Edit Reward' : 'Create Reward'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingReward ? 'Modify an existing loyalty reward' : 'Add a new loyalty reward'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reward-name">Name</Label>
              <Input
                id="reward-name"
                value={rewardForm.name}
                onChange={(e) => setRewardForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., $5 Off, Free Dessert"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward-points">Points Required</Label>
              <Input
                id="reward-points"
                type="number"
                min="1"
                value={rewardForm.pointsRequired}
                onChange={(e) => setRewardForm((p) => ({ ...p, pointsRequired: e.target.value }))}
                placeholder="100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reward-type">Reward Type</Label>
                <select
                  id="reward-type"
                  value={rewardForm.rewardType}
                  onChange={(e) =>
                    setRewardForm((p) => ({
                      ...p,
                      rewardType: e.target.value as RewardForm['rewardType'],
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="discount_fixed">Fixed Discount ($)</option>
                  <option value="discount_percentage">Percentage Discount (%)</option>
                  <option value="free_item">Free Item</option>
                </select>
              </div>
              {rewardForm.rewardType !== 'free_item' && (
                <div className="space-y-2">
                  <Label htmlFor="reward-value">Value</Label>
                  <Input
                    id="reward-value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={rewardForm.value}
                    onChange={(e) => setRewardForm((p) => ({ ...p, value: e.target.value }))}
                    placeholder={rewardForm.rewardType === 'discount_fixed' ? '5.00' : '10'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {rewardForm.rewardType === 'discount_fixed'
                      ? 'Dollar amount off the order'
                      : 'Percentage off the order (0-100)'}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward-desc">Description (optional)</Label>
              <Input
                id="reward-desc"
                value={rewardForm.description}
                onChange={(e) => setRewardForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe what the customer gets"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRewardDialog(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmitReward}>
                {editingReward ? 'Save Changes' : 'Create Reward'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reward Delete Confirmation */}
      <Dialog
        open={!!deleteRewardTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteRewardTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reward</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete &ldquo;{deleteRewardTarget?.name}&rdquo;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRewardTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteReward}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tier Create/Edit Dialog */}
      <Dialog
        open={showTierDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowTierDialog(false);
            setEditingTier(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTier ? 'Edit Tier' : 'Create Tier'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingTier ? 'Modify an existing loyalty tier' : 'Add a new loyalty tier'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tier-name">Tier Name</Label>
              <Input
                id="tier-name"
                value={tierForm.name}
                onChange={(e) => setTierForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Silver, Gold, Platinum"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tier-min-points">Minimum Lifetime Points</Label>
                <Input
                  id="tier-min-points"
                  type="number"
                  min="0"
                  value={tierForm.minPoints}
                  onChange={(e) => setTierForm((p) => ({ ...p, minPoints: e.target.value }))}
                  placeholder="500"
                />
                <p className="text-xs text-muted-foreground">
                  Customers reach this tier after earning this many lifetime points
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier-multiplier">Points Multiplier</Label>
                <Input
                  id="tier-multiplier"
                  type="number"
                  step="0.1"
                  min="1"
                  value={tierForm.multiplier}
                  onChange={(e) => setTierForm((p) => ({ ...p, multiplier: e.target.value }))}
                  placeholder="1.5"
                />
                <p className="text-xs text-muted-foreground">
                  Multiplied against the base points-per-dollar rate
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTierDialog(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmitTier}>
                {editingTier ? 'Save Changes' : 'Create Tier'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tier Delete Confirmation */}
      <Dialog
        open={!!deleteTierTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTierTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tier</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete &ldquo;{deleteTierTarget?.name}&rdquo;?
              Customers in this tier will fall back to the next lower tier.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTierTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTier}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
