import { notFound } from 'next/navigation';
import Link from 'next/link';
import { api } from '@restaurantos/backend';
import { convexClient } from '@/lib/auth/convex-client';
import { Id } from '@restaurantos/backend/dataModel';
import {
  Card,
  CardContent,
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
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default async function TenantUsersPage({
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/tenants/${tenantId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name} - Staff</h1>
          <p className="text-muted-foreground">Manage staff accounts for this tenant</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Members ({tenantUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
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
                  <TableCell className="text-muted-foreground">
                    {user.lastLoginAt ? format(user.lastLoginAt, 'MMM d, HH:mm') : 'Never'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.createdAt ? format(user.createdAt, 'MMM d, yyyy') : '-'}
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
