'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';
import { useTenant } from '@/hooks/use-tenant';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@restaurantos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import {
  ArrowLeft,
  Mail,
  Phone,
  StickyNote,
  Pencil,
  ShoppingBag,
  DollarSign,
  CalendarDays,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatCents } from '@/lib/format';
import { CustomerLoyaltySection } from './customer-loyalty-section';

const SOURCE_LABELS: Record<string, string> = {
  dine_in: 'Dine-In',
  online: 'Online',
  doordash: 'DoorDash',
  ubereats: 'Uber Eats',
  grubhub: 'Grubhub',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  completed: 'default',
  pending: 'outline',
  sent_to_kitchen: 'secondary',
  preparing: 'secondary',
  ready: 'secondary',
  cancelled: 'destructive',
};

export default function CustomerDetailContent() {
  const params = useParams();
  const customerId = params.id as string;
  const { tenantId } = useTenant();

  const customer = useQuery(
    api.customers.queries.getCustomer,
    customerId ? { customerId: customerId as Id<'customers'> } : 'skip'
  );

  const [showEditDialog, setShowEditDialog] = useState(false);

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  if (customer === undefined) {
    return <div className="p-6 text-muted-foreground">Loading customer...</div>;
  }

  if (customer === null) {
    return (
      <div className="p-6">
        <p className="text-destructive">Customer not found.</p>
        <Link href="/customers">
          <Button variant="outline" size="sm" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  const recentOrders = customer.recentOrders ?? [];
  const totalOrders = customer.orderCount;
  const totalSpent = customer.totalSpent;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Customers
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
            <p className="text-muted-foreground text-sm">
              Customer since{' '}
              {customer.firstOrderDate
                ? new Date(customer.firstOrderDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : new Date(customer.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Info + Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{customer.email || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{customer.phone || 'Not provided'}</p>
              </div>
            </div>
            {customer.notes && (
              <div className="flex items-start gap-3">
                <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{customer.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${formatCents(totalSpent)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${formatCents(avgOrderValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last Order</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customer.lastOrderDate
                  ? new Date(customer.lastOrderDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : '-'}
              </div>
              {customer.firstOrderDate && (
                <p className="text-xs text-muted-foreground">
                  First order:{' '}
                  {new Date(customer.firstOrderDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Loyalty Section */}
      <CustomerLoyaltySection
        customerId={customer._id}
        tenantId={tenantId!}
      />

      {/* Order History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order History</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12 px-6">No orders found for this customer</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.orderId}>
                    <TableCell className="font-medium font-mono">#{order.orderNumber}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>{SOURCE_LABELS[order.source] ?? order.source}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[order.status] ?? 'outline'} className="capitalize text-xs">
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'outline'} className="capitalize text-xs">
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">${formatCents(order.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {showEditDialog && (
        <EditCustomerDialog
          customer={customer}
          onClose={() => setShowEditDialog(false)}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Edit Customer Dialog
// ────────────────────────────────────────────

function EditCustomerDialog({
  customer,
  onClose,
}: {
  customer: { _id: any; name: string; email?: string | null; phone?: string | null; notes?: string | null };
  onClose: () => void;
}) {
  const updateCustomer = useMutation(api.customers.mutations.updateCustomer);
  const addNote = useMutation(api.customers.mutations.addNote);

  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email ?? '');
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [notes, setNotes] = useState(customer.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      await updateCustomer({
        customerId: customer._id,
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      // Update notes separately
      const trimmedNotes = notes.trim();
      if (trimmedNotes !== (customer.notes ?? '').trim()) {
        await addNote({
          customerId: customer._id,
          notes: trimmedNotes,
        });
      }
      toast.success('Customer updated');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>Update customer information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, preferences, etc."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
