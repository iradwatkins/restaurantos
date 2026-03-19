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
import { DEFAULT_TAX_RATE } from '@/lib/constants';
import type { Doc } from '@restaurantos/backend/dataModel';

export function TaxTab({ tenant, onSave }: { tenant: Doc<'tenants'>; onSave: (...args: any[]) => Promise<unknown> }) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const rateStr = form.get('taxRate') as string;
    const rate = parseFloat(rateStr) / 100; // convert percentage to decimal
    try {
      await onSave({ id: tenant._id, taxRate: rate });
      toast.success('Tax rate updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax & Fees</CardTitle>
        <CardDescription>Configure tax rates applied to orders</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taxRate">Sales Tax Rate (%)</Label>
            <Input
              id="taxRate"
              name="taxRate"
              type="number"
              step="0.01"
              min="0"
              max="25"
              defaultValue={((tenant.taxRate ?? DEFAULT_TAX_RATE) * 100).toFixed(2)}
              placeholder="8.75"
            />
            <p className="text-xs text-muted-foreground">
              Applied to all POS and online orders. Currently{' '}
              {((tenant.taxRate ?? DEFAULT_TAX_RATE) * 100).toFixed(2)}%.
            </p>
          </div>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Tax Rate
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
