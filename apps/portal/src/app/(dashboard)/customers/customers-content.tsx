'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import {
  Button,
  Card,
  CardContent,
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
import { Plus, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { formatCents } from '@/lib/format';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

type SortKey = 'name' | 'email' | 'phone' | 'orderCount' | 'totalSpent';
type SortDir = 'asc' | 'desc';

// ────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────

export default function CustomersContent() {
  const { tenantId } = useTenant();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('totalSpent');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Debounce search
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setCursor(undefined);
      setCursorStack([]);
    }, 300);
    setDebounceTimer(timer);
  }

  const PAGE_SIZE = 25;

  const result = useQuery(
    api.customers.queries.getCustomers,
    tenantId
      ? {
          tenantId,
          search: debouncedSearch || undefined,
          cursor,
          limit: PAGE_SIZE,
        }
      : 'skip'
  );

  const customers = result?.customers ?? [];
  const totalCount = result?.totalCount ?? 0;
  const nextCursor = result?.nextCursor ?? null;

  // Client-side sort (the API returns sorted by totalSpent desc; we re-sort locally for other columns)
  const sorted = [...customers].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal ?? '');
    const bStr = String(bVal ?? '');
    return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function handleNextPage() {
    if (nextCursor) {
      setCursorStack((prev) => [...prev, cursor]);
      setCursor(nextCursor);
    }
  }

  function handlePrevPage() {
    const stack = [...cursorStack];
    const prev = stack.pop();
    setCursorStack(stack);
    setCursor(prev);
  }

  const currentPage = cursorStack.length + 1;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            {totalCount} customer{totalCount !== 1 ? 's' : ''} in your database
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-0 px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Name" sortKey="name" currentKey={sortKey} currentDir={sortDir} onToggle={toggleSort} />
                <SortableHead label="Email" sortKey="email" currentKey={sortKey} currentDir={sortDir} onToggle={toggleSort} className="hidden md:table-cell" />
                <SortableHead label="Phone" sortKey="phone" currentKey={sortKey} currentDir={sortDir} onToggle={toggleSort} className="hidden sm:table-cell" />
                <SortableHead label="Orders" sortKey="orderCount" currentKey={sortKey} currentDir={sortDir} onToggle={toggleSort} className="text-right" />
                <SortableHead label="Total Spent" sortKey="totalSpent" currentKey={sortKey} currentDir={sortDir} onToggle={toggleSort} className="text-right" />
                <TableHead className="text-right hidden lg:table-cell">Last Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    {debouncedSearch ? 'No customers match your search' : 'No customers yet'}
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((customer) => (
                  <TableRow key={customer._id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/customers/${customer._id}`} className="font-medium text-primary hover:underline">
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {customer.email ?? '-'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {customer.phone ?? '-'}
                    </TableCell>
                    <TableCell className="text-right">{customer.orderCount}</TableCell>
                    <TableCell className="text-right font-medium">${formatCents(customer.totalSpent)}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell text-muted-foreground text-sm">
                      {customer.lastOrderDate
                        ? new Date(customer.lastOrderDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={cursorStack.length === 0}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!nextCursor}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      {showAddDialog && (
        <AddCustomerDialog
          tenantId={tenantId}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Sortable Table Head
// ────────────────────────────────────────────

function SortableHead({
  label,
  sortKey,
  currentKey,
  currentDir,
  onToggle,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onToggle: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        onClick={() => onToggle(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
        {currentKey === sortKey && (
          <span className="text-[10px]">{currentDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </button>
    </TableHead>
  );
}

// ────────────────────────────────────────────
// Add Customer Dialog
// ────────────────────────────────────────────

function AddCustomerDialog({
  tenantId,
  onClose,
}: {
  tenantId: any;
  onClose: () => void;
}) {
  const createCustomer = useMutation(api.customers.mutations.createCustomer);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      await createCustomer({
        tenantId,
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Customer added');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
          <DialogDescription>Add a new customer to your database.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cust-name">Name *</Label>
            <Input
              id="cust-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-email">Email</Label>
            <Input
              id="cust-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-phone">Phone</Label>
            <Input
              id="cust-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-notes">Notes</Label>
            <Input
              id="cust-notes"
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
              {saving ? 'Saving...' : 'Add Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
