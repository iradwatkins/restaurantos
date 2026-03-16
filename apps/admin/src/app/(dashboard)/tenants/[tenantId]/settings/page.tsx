import { notFound } from 'next/navigation';
import Link from 'next/link';
import { api } from '@restaurantos/backend';
import { convexClient } from '@/lib/auth/convex-client';
import { Id } from '@restaurantos/backend/dataModel';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@restaurantos/ui';
import { ArrowLeft } from 'lucide-react';

export default async function TenantSettingsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  const tenant = await convexClient.query(api.tenants.queries.getById, {
    id: tenantId as Id<'tenants'>,
  });
  if (!tenant) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/tenants/${tenantId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name} - Settings</h1>
          <p className="text-muted-foreground">Configure tenant branding and preferences</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <div
                className="h-8 w-8 rounded-full border"
                style={{ backgroundColor: tenant.primaryColor ?? '#E63946' }}
              />
              <div>
                <p className="text-sm font-medium">Primary Color</p>
                <p className="text-xs text-muted-foreground">
                  {tenant.primaryColor ?? 'Not set'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="h-8 w-8 rounded-full border"
                style={{ backgroundColor: tenant.accentColor ?? '#457B9D' }}
              />
              <div>
                <p className="text-sm font-medium">Accent Color</p>
                <p className="text-xs text-muted-foreground">
                  {tenant.accentColor ?? 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Current Plan</span>
              <span className="text-sm font-medium capitalize">{tenant.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Stripe Customer</span>
              <span className="text-sm">{tenant.stripeCustomerId ?? 'Not connected'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
