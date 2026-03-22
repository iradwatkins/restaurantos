'use client';

import { useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Separator,
} from '@restaurantos/ui';
import { Save, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function TenantEditForm({ tenant }: { tenant: any }) {
  const updateTenant = useMutation(api.admin.mutations.updateTenant);
  const suspendTenant = useMutation(api.admin.mutations.suspendTenant);
  const activateTenant = useMutation(api.admin.mutations.activateTenant);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await updateTenant({
        id: tenant._id,
        name: form.get('name') as string,
        phone: (form.get('phone') as string) || undefined,
        email: (form.get('email') as string) || undefined,
        plan: form.get('plan') as 'starter' | 'growth' | 'pro',
        features: {
          onlineOrdering: form.get('feat_ordering') === 'on',
          catering: form.get('feat_catering') === 'on',
          loyalty: form.get('feat_loyalty') === 'on',
          marketing: form.get('feat_marketing') === 'on',
          reservations: form.get('feat_reservations') === 'on',
          analytics: form.get('feat_analytics') === 'on',
        },
      });
      toast.success('Tenant updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Edit Tenant</CardTitle>
            <CardDescription>Update restaurant details and features</CardDescription>
          </div>
          <div className="flex gap-2">
            {tenant.status === 'active' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!confirm(`Suspend ${tenant.name}?`)) return;
                  await suspendTenant({ id: tenant._id });
                  toast.success('Suspended');
                }}
              >
                <Ban className="mr-1 h-3 w-3" /> Suspend
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await activateTenant({ id: tenant._id });
                  toast.success('Activated');
                }}
              >
                <CheckCircle className="mr-1 h-3 w-3" /> Activate
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Restaurant Name</Label>
              <Input id="edit-name" name="name" defaultValue={tenant.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-plan">Plan</Label>
              <select
                id="edit-plan"
                name="plan"
                defaultValue={tenant.plan}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth ($249/mo)</option>
                <option value="pro">Pro ($299/mo)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" name="phone" defaultValue={tenant.phone ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" name="email" type="email" defaultValue={tenant.email ?? ''} />
            </div>
          </div>

          <Separator />

          <h3 className="font-semibold text-sm">Feature Add-ons</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'feat_ordering', label: 'Online Ordering', key: 'onlineOrdering' },
              { name: 'feat_catering', label: 'Catering ($79/mo)', key: 'catering' },
              { name: 'feat_loyalty', label: 'Loyalty ($49/mo)', key: 'loyalty' },
              { name: 'feat_marketing', label: 'Marketing ($49/mo)', key: 'marketing' },
              { name: 'feat_reservations', label: 'Reservations ($39/mo)', key: 'reservations' },
              { name: 'feat_analytics', label: 'Analytics', key: 'analytics' },
            ].map((feat) => (
              <label key={feat.name} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name={feat.name}
                  defaultChecked={tenant.features?.[feat.key] ?? false}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm">{feat.label}</span>
              </label>
            ))}
          </div>

          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
