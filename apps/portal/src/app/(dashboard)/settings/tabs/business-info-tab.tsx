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
  Separator,
} from '@restaurantos/ui';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Doc } from '@restaurantos/backend/dataModel';

export function BusinessInfoTab({ tenant, onSave }: { tenant: Doc<'tenants'>; onSave: (...args: any[]) => Promise<unknown> }) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await onSave({
        id: tenant._id,
        phone: (form.get('phone') as string) || undefined,
        email: (form.get('email') as string) || undefined,
        tagline: (form.get('tagline') as string) || undefined,
        aboutText: (form.get('aboutText') as string) || undefined,
        timezone: (form.get('timezone') as string) || undefined,
        address: {
          street: form.get('street') as string,
          city: form.get('city') as string,
          state: form.get('state') as string,
          zip: form.get('zip') as string,
          country: form.get('country') as string,
        },
      });
      toast.success('Business info updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
        <CardDescription>Your restaurant&apos;s contact details and description</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={tenant.phone ?? ''} placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={tenant.email ?? ''} placeholder="info@restaurant.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" name="tagline" defaultValue={tenant.tagline ?? ''} placeholder="Fresh, local, delicious" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aboutText">About</Label>
            <textarea
              id="aboutText"
              name="aboutText"
              defaultValue={tenant.aboutText ?? ''}
              placeholder="Tell your restaurant's story..."
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <Separator />
          <h3 className="font-semibold">Address</h3>
          <div className="space-y-2">
            <Label htmlFor="street">Street</Label>
            <Input id="street" name="street" defaultValue={tenant.address?.street ?? ''} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={tenant.address?.city ?? ''} placeholder="Chicago" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" defaultValue={tenant.address?.state ?? ''} placeholder="IL" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">Zip</Label>
              <Input id="zip" name="zip" defaultValue={tenant.address?.zip ?? ''} placeholder="60601" />
            </div>
          </div>
          <Input name="country" type="hidden" value={tenant.address?.country ?? 'US'} />
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={tenant.timezone ?? 'America/Chicago'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="America/Anchorage">Alaska (AKT)</option>
              <option value="Pacific/Honolulu">Hawaii (HST)</option>
              <option value="America/Phoenix">Arizona (MST, no DST)</option>
              <option value="America/Puerto_Rico">Puerto Rico (AST)</option>
              <option value="Pacific/Guam">Guam (ChST)</option>
            </select>
          </div>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Business Info
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
