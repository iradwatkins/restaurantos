'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
} from '@restaurantos/ui';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { formatCents } from '@/lib/format';
import type { Doc } from '@restaurantos/backend/dataModel';

export function OnlineOrderingTab({ tenant, onSave }: { tenant: Doc<'tenants'>; onSave: (...args: any[]) => Promise<unknown> }) {
  const settings = tenant.onlineOrderingSettings ?? {
    enabled: true,
    minimumOrderCents: 0,
    pickupTimeSlotMinutes: 15,
    defaultPrepTimeMinutes: 20,
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await onSave({
        id: tenant._id,
        onlineOrderingSettings: {
          enabled: form.get('enabled') === 'on',
          minimumOrderCents: Math.round(parseFloat(form.get('minimumOrder') as string || '0') * 100),
          pickupTimeSlotMinutes: parseInt(form.get('pickupTimeSlot') as string || '15'),
          defaultPrepTimeMinutes: parseInt(form.get('defaultPrepTime') as string || '20'),
        },
      });
      toast.success('Online ordering settings updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Online Ordering</CardTitle>
        <CardDescription>Configure your public ordering page</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={settings.enabled}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="font-medium">Enable Online Ordering</span>
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minimumOrder">Minimum Order ($)</Label>
              <Input
                id="minimumOrder"
                name="minimumOrder"
                type="number"
                step="0.01"
                min="0"
                defaultValue={formatCents(settings.minimumOrderCents ?? 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickupTimeSlot">Pickup Slot (min)</Label>
              <Input
                id="pickupTimeSlot"
                name="pickupTimeSlot"
                type="number"
                min="5"
                step="5"
                defaultValue={settings.pickupTimeSlotMinutes ?? 15}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultPrepTime">Default Prep Time (min)</Label>
              <Input
                id="defaultPrepTime"
                name="defaultPrepTime"
                type="number"
                min="5"
                defaultValue={settings.defaultPrepTimeMinutes ?? 20}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Alcohol items are always excluded from online ordering.
            Pickup only — delivery is handled through DoorDash/UberEats/Grubhub.
          </p>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Ordering Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
