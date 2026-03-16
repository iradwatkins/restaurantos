import Link from 'next/link';
import { api } from '@restaurantos/backend';
import { convexClient } from '@/lib/auth/convex-client';
import { Button, Badge } from '@restaurantos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

const statusVariant = {
  active: 'success' as const,
  suspended: 'destructive' as const,
  trial: 'warning' as const,
  churned: 'secondary' as const,
};

export default async function TenantsPage() {
  const allTenants = await convexClient.query(api.tenants.queries.list, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">Manage restaurant client accounts</p>
        </div>
        <Link href="/tenants/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Tenant
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subdomain</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allTenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No tenants yet. Create your first client.
                </TableCell>
              </TableRow>
            ) : (
              allTenants.map((tenant) => (
                <TableRow key={tenant._id}>
                  <TableCell>
                    <Link
                      href={`/tenants/${tenant._id}`}
                      className="font-medium hover:underline"
                    >
                      {tenant.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tenant.subdomain}.restaurantos.app
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {tenant.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.deliveryMode === 'kitchenhub' ? 'default' : 'secondary'}>
                      {tenant.deliveryMode === 'kitchenhub' ? 'KitchenHub' : 'Direct API'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[tenant.status as keyof typeof statusVariant] ?? 'secondary'}>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tenant.createdAt ? format(tenant.createdAt, 'MMM d, yyyy') : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
