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
  Separator,
} from '@restaurantos/ui';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Doc } from '@restaurantos/backend/dataModel';

export function WebsiteTab({ tenant, onSave }: { tenant: Doc<'tenants'>; onSave: (...args: any[]) => Promise<unknown> }) {
  const [partners, setPartners] = useState<{ name: string; color: string }[]>(
    tenant.deliveryPartners ?? [
      { name: 'DoorDash', color: '#FF3008' },
      { name: 'Uber Eats', color: '#06C167' },
    ]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await onSave({
        id: tenant._id,
        websiteEnabled: form.get('websiteEnabled') === 'on',
        googleMapsEmbedUrl: (form.get('googleMapsEmbedUrl') as string) || undefined,
        socialLinks: {
          facebook: (form.get('facebook') as string) || undefined,
          instagram: (form.get('instagram') as string) || undefined,
          twitter: (form.get('twitter') as string) || undefined,
          yelp: (form.get('yelp') as string) || undefined,
        },
        heroHeading: (form.get('heroHeading') as string) || undefined,
        heroSubheading: (form.get('heroSubheading') as string) || undefined,
        deliveryMessage: (form.get('deliveryMessage') as string) || undefined,
        deliveryPartners: partners.filter((p) => p.name.trim()),
        footerTagline: (form.get('footerTagline') as string) || undefined,
      });
      toast.success('Website settings updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public Website</CardTitle>
        <CardDescription>
          Enable a full public website for your restaurant with Home, Menu, About, and Contact pages.
          Your website is at your subdomain (e.g., {tenant.subdomain}.restaurants.irawatkins.com).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="websiteEnabled"
              defaultChecked={tenant.websiteEnabled ?? false}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="font-medium">Enable Public Website</span>
          </label>

          <Separator />

          <h3 className="font-semibold">Homepage Content</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heroHeading">Hero Heading</Label>
              <Input
                id="heroHeading"
                name="heroHeading"
                defaultValue={tenant.heroHeading ?? ''}
                placeholder="Soul Food."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroSubheading">Hero Subheading</Label>
              <Input
                id="heroSubheading"
                name="heroSubheading"
                defaultValue={tenant.heroSubheading ?? ''}
                placeholder="Made Fresh Daily."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryMessage">Delivery Message</Label>
              <Input
                id="deliveryMessage"
                name="deliveryMessage"
                defaultValue={tenant.deliveryMessage ?? ''}
                placeholder="Yes We Deliver"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footerTagline">Footer Tagline</Label>
              <Input
                id="footerTagline"
                name="footerTagline"
                defaultValue={tenant.footerTagline ?? ''}
                placeholder="Fresh food, great service."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Delivery Partners</Label>
            <div className="space-y-2">
              {partners.map((p, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={p.name}
                    onChange={(e) => {
                      setPartners(partners.map((item, i) =>
                        i === idx ? { ...item, name: e.target.value } : item
                      ));
                    }}
                    placeholder="Partner name"
                    className="flex-1"
                  />
                  <Input
                    type="color"
                    value={p.color}
                    onChange={(e) => {
                      setPartners(partners.map((item, i) =>
                        i === idx ? { ...item, color: e.target.value } : item
                      ));
                    }}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setPartners(partners.filter((_, i) => i !== idx))}
                    className="text-destructive text-sm hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPartners([...partners, { name: '', color: '#000000' }])}
                className="text-sm text-primary hover:underline"
              >
                + Add Partner
              </button>
            </div>
          </div>

          <Separator />

          <h3 className="font-semibold">Social Links</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                name="facebook"
                defaultValue={tenant.socialLinks?.facebook ?? ''}
                placeholder="https://facebook.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                name="instagram"
                defaultValue={tenant.socialLinks?.instagram ?? ''}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter / X</Label>
              <Input
                id="twitter"
                name="twitter"
                defaultValue={tenant.socialLinks?.twitter ?? ''}
                placeholder="https://x.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yelp">Yelp</Label>
              <Input
                id="yelp"
                name="yelp"
                defaultValue={tenant.socialLinks?.yelp ?? ''}
                placeholder="https://yelp.com/biz/..."
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="googleMapsEmbedUrl">Google Maps Embed URL</Label>
            <Input
              id="googleMapsEmbedUrl"
              name="googleMapsEmbedUrl"
              defaultValue={tenant.googleMapsEmbedUrl ?? ''}
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
            <p className="text-xs text-muted-foreground">
              Go to Google Maps, find your restaurant, click Share, then Embed a map, and copy the src URL.
            </p>
          </div>

          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Website Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
