'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import { Button, Badge, Input } from '@restaurantos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import { Plus, Search, Ban, CheckCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusVariant: Record<string, any> = {
  active: 'success',
  suspended: 'destructive',
  trial: 'warning',
  churned: 'secondary',
};

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allTenants = useQuery(api.admin.queries.listTenantsFiltered, {
    search: search || undefined,
    status: statusFilter || undefined,
    plan: planFilter || undefined,
  });

  const suspendTenant = useMutation(api.admin.mutations.suspendTenant);
  const activateTenant = useMutation(api.admin.mutations.activateTenant);
  const deleteTenant = useMutation(api.admin.mutations.deleteTenant);
  const bulkUpdateStatus = useMutation(api.admin.mutations.bulkUpdateStatus);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === (allTenants?.length ?? 0)) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allTenants?.map((t) => t._id) ?? []);
    }
  }

  async function handleBulkAction(status: 'active' | 'suspended') {
    if (selectedIds.length === 0) return;
    if (!confirm(`${status === 'suspended' ? 'Suspend' : 'Activate'} ${selectedIds.length} tenant(s)?`)) return;
    try {
      await bulkUpdateStatus({ ids: selectedIds as any[], status });
      toast.success(`${selectedIds.length} tenant(s) updated`);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            {allTenants?.length ?? 0} restaurant clients
          </p>
        </div>
        <Link href="/tenants/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Tenant
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, subdomain, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="churned">Churned</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Plans</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction('active')}>
            <CheckCircle className="mr-1 h-3 w-3" /> Activate
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkAction('suspended')}>
            <Ban className="mr-1 h-3 w-3" /> Suspend
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.length === (allTenants?.length ?? 0) && allTenants?.length! > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Subdomain</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!allTenants || allTenants.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {search || statusFilter || planFilter
                    ? 'No tenants match your filters'
                    : 'No tenants yet. Create your first client.'}
                </TableCell>
              </TableRow>
            )}
            {allTenants?.map((tenant) => (
              <TableRow key={tenant._id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(tenant._id)}
                    onChange={() => toggleSelect(tenant._id)}
                    className="h-4 w-4 rounded"
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/tenants/${tenant._id}`}
                    className="font-medium hover:underline"
                  >
                    {tenant.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {tenant.subdomain}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {tenant.plan}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={tenant.deliveryMode === 'kitchenhub' ? 'default' : 'secondary'}>
                    {tenant.deliveryMode === 'kitchenhub' ? 'KH' : 'Direct'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[tenant.status] ?? 'secondary'}>
                    {tenant.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {tenant.createdAt ? format(tenant.createdAt, 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {tenant.status === 'active' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={async () => {
                          if (!confirm(`Suspend ${tenant.name}?`)) return;
                          await suspendTenant({ id: tenant._id });
                          toast.success('Suspended');
                        }}
                      >
                        <Ban className="h-3 w-3" />
                      </Button>
                    )}
                    {tenant.status === 'suspended' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={async () => {
                          await activateTenant({ id: tenant._id });
                          toast.success('Activated');
                        }}
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive"
                      onClick={async () => {
                        if (!confirm(`Delete ${tenant.name}? This will mark it as churned.`)) return;
                        await deleteTenant({ id: tenant._id });
                        toast.success('Deleted');
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
