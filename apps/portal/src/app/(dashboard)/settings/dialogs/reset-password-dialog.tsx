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
import type { Doc } from '@restaurantos/backend/dataModel';

export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Doc<'users'> | null;
  onReset: (...args: any[]) => Promise<unknown>;
}) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    try {
      await onReset({ id: user._id, newPassword: form.get('password') as string });
      toast.success(`Password reset for ${user.name || user.email}`);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password for {user?.name || user?.email}</DialogTitle>
          <DialogDescription className="sr-only">Set a new password for this staff member</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-password">New Password</Label>
            <Input
              id="reset-password"
              name="password"
              type="password"
              placeholder="Minimum 8 characters"
              required
              minLength={8}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Reset Password</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
