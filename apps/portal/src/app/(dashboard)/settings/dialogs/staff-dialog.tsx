'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Input,
  Label,
} from '@restaurantos/ui';
import { toast } from 'sonner';
import type { Doc, Id } from '@restaurantos/backend/dataModel';

export function StaffDialog({
  open,
  onOpenChange,
  editing,
  tenantId,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Doc<'users'> | null;
  tenantId: Id<'tenants'>;
  onCreate: (...args: any[]) => Promise<unknown>;
  onUpdate: (...args: any[]) => Promise<unknown>;
}) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      if (editing) {
        await onUpdate({
          id: editing._id,
          name: (form.get('name') as string) || undefined,
          role: form.get('role') as string,
          email: (form.get('email') as string) || undefined,
        });
        toast.success('Staff member updated');
      } else {
        await onCreate({
          tenantId,
          email: form.get('email') as string,
          password: form.get('password') as string,
          name: (form.get('name') as string) || undefined,
          role: form.get('role') as string,
        });
        toast.success('Staff member created');
      }
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
          <DialogDescription className="sr-only">Add or edit staff member details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-name">Name</Label>
            <Input id="staff-name" name="name" defaultValue={editing?.name ?? ''} placeholder="Jane Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              name="email"
              type="email"
              defaultValue={editing?.email ?? ''}
              placeholder="jane@restaurant.com"
              required
              readOnly={!!editing}
            />
          </div>
          {!editing && (
            <div className="space-y-2">
              <Label htmlFor="staff-password">Password</Label>
              <Input
                id="staff-password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
                required
                minLength={8}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="staff-role">Role</Label>
            <select
              id="staff-role"
              name="role"
              defaultValue={editing?.role ?? 'server'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="manager">Manager</option>
              <option value="server">Server</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="submit">{editing ? 'Save' : 'Add Staff'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
