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

export function AlcoholTab({ tenant, onSave }: { tenant: Doc<'tenants'>; onSave: (...args: any[]) => Promise<unknown> }) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    // Validate alcohol sale hours
    const start = form.get('alcoholSaleHoursStart') as string;
    const end = form.get('alcoholSaleHoursEnd') as string;
    if (start && end && start === end) {
      toast.error('Sale start and end times cannot be the same');
      return;
    }

    try {
      await onSave({
        id: tenant._id,
        liquorLicenseNumber: (form.get('liquorLicenseNumber') as string) || undefined,
        liquorLicenseExpiry: form.get('liquorLicenseExpiry')
          ? new Date(form.get('liquorLicenseExpiry') as string).getTime()
          : undefined,
        alcoholSaleHoursStart: start || undefined,
        alcoholSaleHoursEnd: end || undefined,
      });
      toast.success('Alcohol settings updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alcohol Compliance</CardTitle>
        <CardDescription>
          Liquor license and sale hour restrictions. Alcohol items are automatically blocked from
          online ordering.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="liquorLicenseNumber">Liquor License Number</Label>
              <Input
                id="liquorLicenseNumber"
                name="liquorLicenseNumber"
                defaultValue={tenant.liquorLicenseNumber ?? ''}
                placeholder="IL-12345-2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="liquorLicenseExpiry">License Expiry Date</Label>
              <Input
                id="liquorLicenseExpiry"
                name="liquorLicenseExpiry"
                type="date"
                defaultValue={
                  tenant.liquorLicenseExpiry
                    ? new Date(tenant.liquorLicenseExpiry).toISOString().split('T')[0]
                    : ''
                }
              />
            </div>
          </div>
          <Separator />
          <h3 className="font-semibold">Alcohol Sale Hours</h3>
          <p className="text-sm text-muted-foreground">
            POS will block alcohol sales outside these hours. Staff will see an age verification
            prompt when adding alcohol items.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alcoholSaleHoursStart">Sale Start Time</Label>
              <Input
                id="alcoholSaleHoursStart"
                name="alcoholSaleHoursStart"
                type="time"
                defaultValue={tenant.alcoholSaleHoursStart ?? '07:00'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alcoholSaleHoursEnd">Sale End Time</Label>
              <Input
                id="alcoholSaleHoursEnd"
                name="alcoholSaleHoursEnd"
                type="time"
                defaultValue={tenant.alcoholSaleHoursEnd ?? '02:00'}
              />
            </div>
          </div>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Alcohol Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
