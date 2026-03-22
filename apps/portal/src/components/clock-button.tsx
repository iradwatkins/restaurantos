'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import { useSession } from '@/hooks/use-session';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@restaurantos/ui';
import { Clock, Coffee, LogOut as LogOutIcon, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function ClockButton() {
  const { tenantId } = useTenant();
  const { user } = useSession();

  const [showClockInDialog, setShowClockInDialog] = useState(false);
  const [showClockOutDialog, setShowClockOutDialog] = useState(false);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  const activeShifts = useQuery(
    api.scheduling.queries.getActiveShifts,
    tenantId ? { tenantId } : 'skip'
  );

  const clockInMutation = useMutation(api.scheduling.mutations.clockIn);
  const clockOutMutation = useMutation(api.scheduling.mutations.clockOut);
  const addBreakMutation = useMutation(api.scheduling.mutations.addBreak);

  // Find current user's active shift
  const myShift = useMemo(() => {
    if (!activeShifts || !user) return null;
    return activeShifts.find((s) => s.userId === user.id) ?? null;
  }, [activeShifts, user]);

  const isClockedIn = myShift !== null;

  // Live duration counter
  useEffect(() => {
    if (!myShift) {
      setElapsedMinutes(0);
      return;
    }

    function update() {
      const now = Date.now();
      const elapsed = (now - myShift!.clockIn) / (1000 * 60);
      setElapsedMinutes(Math.round(elapsed));
    }

    update();
    const interval = setInterval(update, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [myShift]);

  async function handleClockIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tenantId) return;
    const form = new FormData(e.currentTarget);
    const role = form.get('role') as string;
    const rateStr = form.get('hourlyRate') as string;
    const hourlyRate = rateStr ? Math.round(parseFloat(rateStr) * 100) : undefined;

    try {
      await clockInMutation({
        tenantId,
        role,
        hourlyRate,
      });
      toast.success('Clocked in');
      setShowClockInDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to clock in');
    }
  }

  async function handleClockOut() {
    if (!tenantId) return;
    try {
      const result = await clockOutMutation({ tenantId });
      toast.success(`Clocked out. Worked ${result.hoursWorked} hours`);
      setShowClockOutDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to clock out');
    }
  }

  async function handleAddBreak(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tenantId) return;
    const form = new FormData(e.currentTarget);
    const minutes = parseInt(form.get('minutes') as string, 10);

    try {
      const result = await addBreakMutation({ tenantId, minutes });
      toast.success(`Break added. Total break: ${result.totalBreakMinutes}m`);
      setShowBreakDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add break');
    }
  }

  if (!tenantId || !user) return null;

  if (isClockedIn) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span className="text-xs font-medium">
                Clocked In ({formatDuration(elapsedMinutes)})
              </span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setShowBreakDialog(true)}>
              <Coffee className="mr-2 h-4 w-4" />
              Add Break
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowClockOutDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              Clock Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clock Out Confirmation */}
        <Dialog open={showClockOutDialog} onOpenChange={setShowClockOutDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clock Out</DialogTitle>
              <DialogDescription>
                You have been clocked in for{' '}
                <strong>{formatDuration(elapsedMinutes)}</strong> as{' '}
                <strong>{myShift?.role}</strong>.
                {myShift?.breakMinutes ? (
                  <> Break time: {myShift.breakMinutes}m.</>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClockOutDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleClockOut}>
                Clock Out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Break Dialog */}
        <Dialog open={showBreakDialog} onOpenChange={setShowBreakDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Break</DialogTitle>
              <DialogDescription>
                Current total break: {myShift?.breakMinutes ?? 0} minutes
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddBreak} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="break-min">Break Duration (minutes)</Label>
                <Input
                  id="break-min"
                  name="minutes"
                  type="number"
                  min="1"
                  max="120"
                  defaultValue="15"
                  required
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button type="submit">Add Break</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => setShowClockInDialog(true)}
      >
        <Clock className="h-3.5 w-3.5" />
        <span className="text-xs">Clock In</span>
      </Button>

      {/* Clock In Dialog */}
      <Dialog open={showClockInDialog} onOpenChange={setShowClockInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clock In</DialogTitle>
            <DialogDescription>Start tracking your shift.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleClockIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clockin-role">Role</Label>
              <Input
                id="clockin-role"
                name="role"
                placeholder="Server, Cook, Bartender..."
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clockin-rate">Hourly Rate ($, optional)</Label>
              <Input
                id="clockin-rate"
                name="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="15.00"
              />
            </div>
            <DialogFooter>
              <Button type="submit">Clock In</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
