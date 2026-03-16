import { notFound } from 'next/navigation';
import Link from 'next/link';
import { api } from '@restaurantos/backend';
import { convexClient } from '@/lib/auth/convex-client';
import { Id } from '@restaurantos/backend/dataModel';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from '@restaurantos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import { ArrowLeft, Settings, Users } from 'lucide-react';
import { format } from 'date-fns';
import { DeliveryToggle } from '@/components/delivery-toggle';
import { TenantEditForm } from '@/components/tenant-edit-form';

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  const tenant = await convexClient.query(api.tenants.queries.getById, {
    id: tenantId as Id<'tenants'>,
  });
  if (!tenant) notFound();

  const tenantUsers = await convexClient.query(api.users.queries.listByTenant, {
    tenantId: tenantId as Id<'tenants'>,
  });

  const deliveryConfig = await convexClient.query(api.tenants.queries.getDeliveryConfig, {
    tenantId: tenantId as Id<'tenants'>,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tenants">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
          <p className="text-muted-foreground">{tenant.subdomain}.restaurantos.app</p>
        </div>
        <Link href={`/tenants/${tenantId}/settings`}>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={tenant.status === 'active' ? 'success' : 'secondary'}>
                {tenant.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <Badge variant="outline" className="capitalize">
                {tenant.plan}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Timezone</span>
              <span className="text-sm">{tenant.timezone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm">
                {tenant.createdAt ? format(tenant.createdAt, 'MMM d, yyyy') : '-'}
              </span>
            </div>
            {tenant.phone && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm">{tenant.phone}</span>
              </div>
            )}
            {tenant.email && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm">{tenant.email}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Integration</CardTitle>
            <CardDescription>Toggle between KitchenHub middleware and Direct API</CardDescription>
          </CardHeader>
          <CardContent>
            <DeliveryToggle
              tenantId={tenantId}
              currentMode={deliveryConfig?.mode ?? 'kitchenhub'}
            />
          </CardContent>
        </Card>
      </div>

      {/* Edit Form */}
      <TenantEditForm tenant={tenant} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff
            </CardTitle>
            <CardDescription>{tenantUsers.length} team members</CardDescription>
          </div>
          <Link href={`/tenants/${tenantId}/users`}>
            <Button variant="outline" size="sm">
              Manage
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
                      {user.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
