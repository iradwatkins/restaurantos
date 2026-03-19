'use client';

import { useState } from 'react';
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
import type { Doc } from '@restaurantos/backend/dataModel';

export function BrandingTab({ tenant, onSave }: { tenant: Doc<'tenants'>; onSave: (...args: any[]) => Promise<unknown> }) {
  const [primaryColor, setPrimaryColor] = useState(tenant.primaryColor ?? '#E63946');
  const [accentColor, setAccentColor] = useState(tenant.accentColor ?? '#457B9D');

  function isValidHex(value: string) {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await onSave({
        id: tenant._id,
        primaryColor: isValidHex(primaryColor) ? primaryColor : undefined,
        accentColor: isValidHex(accentColor) ? accentColor : undefined,
        logoUrl: (form.get('logoUrl') as string) || undefined,
      });
      toast.success('Branding updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>Customize your restaurant&apos;s visual identity</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPrimaryColor(val.startsWith('#') ? val : `#${val}`);
                  }}
                  className="flex-1"
                  placeholder="#E63946"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="accentColor"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAccentColor(val.startsWith('#') ? val : `#${val}`);
                  }}
                  className="flex-1"
                  placeholder="#457B9D"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              name="logoUrl"
              defaultValue={tenant.logoUrl ?? ''}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Direct URL to your logo image.
            </p>
          </div>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Branding
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
