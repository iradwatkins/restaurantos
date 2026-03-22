'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import { useSession } from '@/hooks/use-session';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@restaurantos/ui';
import {
  Clock,
  Calendar,
  DollarSign,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Copy,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '@restaurantos/backend/dataModel';

// ==================== Types ====================

type ActiveTab = 'timesheet' | 'schedule' | 'labor';

type DatePreset = 'this-week' | 'last-week' | 'this-pay-period' | 'custom';

interface ScheduleEntry {
  _id: Id<'schedules'>;
  userId: Id<'users'>;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  notes?: string;
}

// ==================== Helpers ====================

function getWeekRange(offset: number = 0): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function getPayPeriodRange(): { start: Date; end: Date } {
  // Bi-weekly pay period anchored to Jan 1 of current year
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const daysSinceYearStart = Math.floor(
    (now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const periodNumber = Math.floor(daysSinceYearStart / 14);
  const periodStart = new Date(yearStart);
  periodStart.setDate(yearStart.getDate() + periodNumber * 14);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodStart.getDate() + 13);
  periodEnd.setHours(23, 59, 59, 999);
  return { start: periodStart, end: periodEnd };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getDaysOfWeek(weekStart: Date): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(formatDateISO(d));
  }
  return days;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
}

const ROLE_COLORS: Record<string, string> = {
  server: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  cook: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  bartender: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  host: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  manager: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  busser: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  dishwasher: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
};

function getRoleColor(role: string): string {
  return ROLE_COLORS[role.toLowerCase()] ?? 'bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300';
}

// ==================== Main Component ====================

export default function SchedulingContent() {
  const { tenantId } = useTenant();
  const { user } = useSession();
  const isManager = user?.role === 'owner' || user?.role === 'manager';

  const [activeTab, setActiveTab] = useState<ActiveTab>('timesheet');

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scheduling</h1>
        <p className="text-muted-foreground">
          Time tracking, schedules, and labor management
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'timesheet' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('timesheet')}
        >
          <Clock className="mr-1 h-3 w-3" />
          Timesheet
        </Button>
        <Button
          variant={activeTab === 'schedule' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('schedule')}
        >
          <Calendar className="mr-1 h-3 w-3" />
          Schedule
        </Button>
        <Button
          variant={activeTab === 'labor' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('labor')}
        >
          <DollarSign className="mr-1 h-3 w-3" />
          Labor
        </Button>
      </div>

      {activeTab === 'timesheet' && (
        <TimesheetTab tenantId={tenantId} isManager={isManager} />
      )}
      {activeTab === 'schedule' && (
        <ScheduleTab tenantId={tenantId} isManager={isManager} />
      )}
      {activeTab === 'labor' && (
        <LaborTab tenantId={tenantId} />
      )}
    </div>
  );
}

// ==================== Timesheet Tab ====================

function TimesheetTab({
  tenantId,
  isManager,
}: {
  tenantId: Id<'tenants'>;
  isManager: boolean;
}) {
  const [preset, setPreset] = useState<DatePreset>('this-week');
  const [customStart, setCustomStart] = useState(formatDateISO(getWeekRange().start));
  const [customEnd, setCustomEnd] = useState(formatDateISO(getWeekRange().end));
  const [editingShiftId, setEditingShiftId] = useState<Id<'shifts'> | null>(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editBreak, setEditBreak] = useState('');

  const dateRange = useMemo(() => {
    switch (preset) {
      case 'this-week':
        return getWeekRange(0);
      case 'last-week':
        return getWeekRange(-1);
      case 'this-pay-period':
        return getPayPeriodRange();
      case 'custom':
        return {
          start: new Date(customStart + 'T00:00:00'),
          end: new Date(customEnd + 'T23:59:59.999'),
        };
    }
  }, [preset, customStart, customEnd]);

  const shifts = useQuery(
    api.scheduling.queries.getShiftHistory,
    tenantId
      ? {
          tenantId,
          startDate: dateRange.start.getTime(),
          endDate: dateRange.end.getTime(),
        }
      : 'skip'
  );

  const activeShifts = useQuery(
    api.scheduling.queries.getActiveShifts,
    tenantId ? { tenantId } : 'skip'
  );

  const editShift = useMutation(api.scheduling.mutations.editShift);

  const totalHours = useMemo(() => {
    if (!shifts) return 0;
    return shifts.reduce((sum, s) => sum + (s.hoursWorked ?? 0), 0);
  }, [shifts]);

  const activeShiftIds = useMemo(() => {
    if (!activeShifts) return new Set<string>();
    return new Set(activeShifts.map((s) => s._id as string));
  }, [activeShifts]);

  function startEditing(shift: any) {
    setEditingShiftId(shift._id);
    const clockInDate = new Date(shift.clockIn);
    const clockOutDate = shift.clockOut ? new Date(shift.clockOut) : null;
    setEditClockIn(
      `${clockInDate.getFullYear()}-${String(clockInDate.getMonth() + 1).padStart(2, '0')}-${String(clockInDate.getDate()).padStart(2, '0')}T${String(clockInDate.getHours()).padStart(2, '0')}:${String(clockInDate.getMinutes()).padStart(2, '0')}`
    );
    setEditClockOut(
      clockOutDate
        ? `${clockOutDate.getFullYear()}-${String(clockOutDate.getMonth() + 1).padStart(2, '0')}-${String(clockOutDate.getDate()).padStart(2, '0')}T${String(clockOutDate.getHours()).padStart(2, '0')}:${String(clockOutDate.getMinutes()).padStart(2, '0')}`
        : ''
    );
    setEditBreak(String(shift.breakMinutes ?? 0));
  }

  async function saveEdit() {
    if (!editingShiftId) return;
    try {
      const patch: {
        tenantId: Id<'tenants'>;
        shiftId: Id<'shifts'>;
        clockIn?: number;
        clockOut?: number;
        breakMinutes?: number;
      } = {
        tenantId,
        shiftId: editingShiftId,
      };
      if (editClockIn) patch.clockIn = new Date(editClockIn).getTime();
      if (editClockOut) patch.clockOut = new Date(editClockOut).getTime();
      if (editBreak !== '') patch.breakMinutes = parseInt(editBreak, 10);
      await editShift(patch);
      toast.success('Shift updated');
      setEditingShiftId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update shift');
    }
  }

  return (
    <>
      {/* Date Range Controls */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Period</Label>
          <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="this-pay-period">This Pay Period</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {preset === 'custom' && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End</Label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-[160px]"
              />
            </div>
          </>
        )}
        {shifts && (
          <p className="text-sm text-muted-foreground pb-2">
            {shifts.length} shifts &middot;{' '}
            <span className="font-medium">{formatHours(totalHours)}</span> total
          </p>
        )}
      </div>

      {/* Active Shifts Banner */}
      {activeShifts && activeShifts.length > 0 && (
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              Currently Clocked In ({activeShifts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {activeShifts.map((shift) => (
                <div
                  key={shift._id}
                  className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-background px-3 py-2 text-sm"
                >
                  <span className="font-medium">{shift.userName}</span>
                  <Badge variant="outline" className="text-xs">
                    {shift.role}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {formatHours(shift.currentDurationMinutes / 60)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timesheet Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead className="text-right">Break</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  {isManager && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!shifts || shifts.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={isManager ? 9 : 8}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No shifts recorded for this period.
                    </TableCell>
                  </TableRow>
                )}
                {shifts?.map((shift) => {
                  const isActive = activeShiftIds.has(shift._id as string);
                  const isEditing = editingShiftId === shift._id;

                  return (
                    <TableRow
                      key={shift._id}
                      className={isActive ? 'bg-green-50/50 dark:bg-green-950/10' : ''}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                          )}
                          {shift.userName}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(shift.clockIn).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="datetime-local"
                            value={editClockIn}
                            onChange={(e) => setEditClockIn(e.target.value)}
                            className="w-[200px] h-8 text-xs"
                          />
                        ) : (
                          formatTime(shift.clockIn)
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="datetime-local"
                            value={editClockOut}
                            onChange={(e) => setEditClockOut(e.target.value)}
                            className="w-[200px] h-8 text-xs"
                          />
                        ) : shift.clockOut ? (
                          formatTime(shift.clockOut)
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-600">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            value={editBreak}
                            onChange={(e) => setEditBreak(e.target.value)}
                            className="w-[80px] h-8 text-xs ml-auto"
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            {shift.breakMinutes ?? 0}m
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {shift.hoursWorked !== undefined
                          ? formatHours(shift.hoursWorked)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getRoleColor(shift.role)}`}
                        >
                          {shift.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {shift.hourlyRate
                          ? formatCents(shift.hourlyRate) + '/hr'
                          : '-'}
                      </TableCell>
                      {isManager && (
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="default"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={saveEdit}
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setEditingShiftId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Edit shift"
                              onClick={() => startEditing(shift)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Total Summary */}
      {shifts && shifts.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Total Hours ({shifts.length} shifts)
              </span>
              <span className="text-lg font-bold">{formatHours(totalHours)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ==================== Schedule Tab ====================

function ScheduleTab({
  tenantId,
  isManager,
}: {
  tenantId: Id<'tenants'>;
  isManager: boolean;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const weekDays = useMemo(() => getDaysOfWeek(weekRange.start), [weekRange]);

  const schedule = useQuery(
    api.scheduling.queries.getWeekSchedule,
    tenantId
      ? {
          tenantId,
          startDate: formatDateISO(weekRange.start),
          endDate: formatDateISO(weekRange.end),
        }
      : 'skip'
  );

  const teamMembers = useQuery(
    api.users.queries.listByTenant,
    tenantId ? { tenantId } : 'skip'
  );

  const createSchedule = useMutation(api.scheduling.mutations.createScheduleEntry);
  const updateSchedule = useMutation(api.scheduling.mutations.updateScheduleEntry);
  const deleteSchedule = useMutation(api.scheduling.mutations.deleteScheduleEntry);
  const bulkCreate = useMutation(api.scheduling.mutations.bulkCreateSchedule);

  // Group schedule by userId -> date -> entries[]
  const scheduleGrid = useMemo(() => {
    const grid: Record<string, Record<string, ScheduleEntry[]>> = {};
    if (!schedule) return grid;
    for (const entry of schedule) {
      const uid = entry.userId as string;
      if (!grid[uid]) grid[uid] = {};
      if (!grid[uid]![entry.date]) grid[uid]![entry.date] = [];
      grid[uid]![entry.date]!.push(entry as ScheduleEntry);
    }
    return grid;
  }, [schedule]);

  // Get unique employees from both team members and schedule
  const employees = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    if (teamMembers) {
      for (const m of teamMembers) {
        map.set(m._id as string, { id: m._id as string, name: m.name ?? m.email });
      }
    }
    if (schedule) {
      for (const entry of schedule) {
        const uid = entry.userId as string;
        if (!map.has(uid)) {
          map.set(uid, { id: uid, name: entry.userName });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teamMembers, schedule]);

  function openAddDialog(date: string, userId: string) {
    setSelectedDate(date);
    setSelectedUserId(userId);
    setEditingSchedule(null);
    setShowScheduleDialog(true);
  }

  function openEditDialog(entry: ScheduleEntry) {
    setEditingSchedule(entry);
    setSelectedDate(entry.date);
    setSelectedUserId(entry.userId as string);
    setShowScheduleDialog(true);
  }

  async function handleSaveSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const userId = (form.get('userId') as string) || selectedUserId;
    const date = (form.get('date') as string) || selectedDate;
    const startTime = form.get('startTime') as string;
    const endTime = form.get('endTime') as string;
    const role = form.get('role') as string;
    const notes = (form.get('notes') as string) || undefined;

    if (!userId || !date) return;

    try {
      if (editingSchedule) {
        await updateSchedule({
          tenantId,
          scheduleId: editingSchedule._id,
          userId: userId as Id<'users'>,
          date,
          startTime,
          endTime,
          role,
          notes,
        });
        toast.success('Schedule updated');
      } else {
        await createSchedule({
          tenantId,
          userId: userId as Id<'users'>,
          date,
          startTime,
          endTime,
          role,
          notes,
        });
        toast.success('Shift scheduled');
      }
      setShowScheduleDialog(false);
      setEditingSchedule(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save schedule');
    }
  }

  async function handleDeleteSchedule(scheduleId: Id<'schedules'>) {
    try {
      await deleteSchedule({ tenantId, scheduleId });
      toast.success('Schedule entry deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  }

  async function handleCopyPreviousWeek() {
    if (!schedule) return;

    // Get previous week's schedule
    if (schedule.length === 0) {
      toast.error('No schedule entries to copy');
      return;
    }

    const entries = schedule.map((entry) => {
      const entryDate = new Date(entry.date + 'T00:00:00');
      entryDate.setDate(entryDate.getDate() + 7);
      return {
        userId: entry.userId as Id<'users'>,
        date: formatDateISO(entryDate),
        startTime: entry.startTime,
        endTime: entry.endTime,
        role: entry.role,
        notes: entry.notes,
      };
    });

    try {
      const result = await bulkCreate({ tenantId, entries });
      toast.success(`Copied ${result.count} schedule entries to next week`);
      setWeekOffset(weekOffset + 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to copy schedule');
    }
  }

  return (
    <>
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekOffset(weekOffset - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {weekRange.start.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            &ndash;{' '}
            {weekRange.end.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekOffset(weekOffset + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setWeekOffset(0)}
            >
              Today
            </Button>
          )}
        </div>
        {isManager && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyPreviousWeek}>
              <Copy className="mr-1 h-3 w-3" />
              Copy to Next Week
            </Button>
          </div>
        )}
      </div>

      {/* Schedule Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px] sticky left-0 bg-background z-10">
                    Employee
                  </TableHead>
                  {weekDays.map((day) => (
                    <TableHead key={day} className="min-w-[130px] text-center">
                      {getDayLabel(day)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No team members found. Add staff in Settings first.
                    </TableCell>
                  </TableRow>
                )}
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10">
                      {emp.name}
                    </TableCell>
                    {weekDays.map((day) => {
                      const entries = scheduleGrid[emp.id]?.[day] ?? [];
                      return (
                        <TableCell key={day} className="p-1 align-top">
                          <div className="space-y-1 min-h-[48px]">
                            {entries.map((entry) => (
                              <button
                                key={entry._id}
                                className={`w-full text-left rounded px-2 py-1 text-xs cursor-pointer transition-colors hover:opacity-80 ${getRoleColor(entry.role)}`}
                                onClick={() =>
                                  isManager ? openEditDialog(entry) : undefined
                                }
                                title={
                                  entry.notes
                                    ? `${entry.role}: ${entry.notes}`
                                    : entry.role
                                }
                              >
                                <div className="font-medium">
                                  {entry.startTime} - {entry.endTime}
                                </div>
                                <div className="opacity-70">{entry.role}</div>
                              </button>
                            ))}
                            {isManager && (
                              <button
                                className="w-full rounded border border-dashed border-muted-foreground/20 px-2 py-1 text-xs text-muted-foreground/40 hover:border-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
                                onClick={() => openAddDialog(day, emp.id)}
                              >
                                <Plus className="h-3 w-3 mx-auto" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Schedule Dialog */}
      <Dialog
        open={showScheduleDialog}
        onOpenChange={(open) => {
          setShowScheduleDialog(open);
          if (!open) {
            setEditingSchedule(null);
            setSelectedDate(null);
            setSelectedUserId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Edit Scheduled Shift' : 'Add Scheduled Shift'}
            </DialogTitle>
            {selectedDate && (
              <DialogDescription>{formatDate(selectedDate)}</DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={handleSaveSchedule} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sched-user">Employee</Label>
              <select
                id="sched-user"
                name="userId"
                defaultValue={editingSchedule?.userId ?? selectedUserId ?? ''}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="" disabled>
                  Select employee
                </option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-date">Date</Label>
              <Input
                id="sched-date"
                name="date"
                type="date"
                defaultValue={editingSchedule?.date ?? selectedDate ?? ''}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sched-start">Start Time</Label>
                <Input
                  id="sched-start"
                  name="startTime"
                  type="time"
                  defaultValue={editingSchedule?.startTime ?? '09:00'}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sched-end">End Time</Label>
                <Input
                  id="sched-end"
                  name="endTime"
                  type="time"
                  defaultValue={editingSchedule?.endTime ?? '17:00'}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-role">Role</Label>
              <Input
                id="sched-role"
                name="role"
                defaultValue={editingSchedule?.role ?? ''}
                placeholder="Server, Cook, Bartender..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sched-notes">Notes (optional)</Label>
              <Input
                id="sched-notes"
                name="notes"
                defaultValue={editingSchedule?.notes ?? ''}
                placeholder="Any special instructions..."
              />
            </div>

            <DialogFooter className="gap-2">
              {editingSchedule && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    handleDeleteSchedule(editingSchedule._id);
                    setShowScheduleDialog(false);
                    setEditingSchedule(null);
                  }}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              )}
              <Button type="submit">
                {editingSchedule ? 'Save Changes' : 'Add Shift'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==================== Labor Tab ====================

function LaborTab({ tenantId }: { tenantId: Id<'tenants'> }) {
  const [preset, setPreset] = useState<DatePreset>('this-week');
  const [customStart, setCustomStart] = useState(formatDateISO(getWeekRange().start));
  const [customEnd, setCustomEnd] = useState(formatDateISO(getWeekRange().end));

  const dateRange = useMemo(() => {
    switch (preset) {
      case 'this-week':
        return getWeekRange(0);
      case 'last-week':
        return getWeekRange(-1);
      case 'this-pay-period':
        return getPayPeriodRange();
      case 'custom':
        return {
          start: new Date(customStart + 'T00:00:00'),
          end: new Date(customEnd + 'T23:59:59.999'),
        };
    }
  }, [preset, customStart, customEnd]);

  const laborReport = useQuery(
    api.scheduling.queries.getLaborReport,
    tenantId
      ? {
          tenantId,
          startDate: dateRange.start.getTime(),
          endDate: dateRange.end.getTime(),
        }
      : 'skip'
  );

  const payrollCSV = useQuery(
    api.scheduling.exports.exportPayrollCSV,
    tenantId
      ? {
          tenantId,
          startDate: dateRange.start.getTime(),
          endDate: dateRange.end.getTime(),
        }
      : 'skip'
  );

  const gustoData = useQuery(
    api.scheduling.exports.exportGustoFormat,
    tenantId
      ? {
          tenantId,
          startDate: dateRange.start.getTime(),
          endDate: dateRange.end.getTime(),
        }
      : 'skip'
  );

  const totalOvertimeHours = useMemo(() => {
    if (!laborReport) return 0;
    return laborReport.employees.reduce((sum, emp) => sum + emp.overtimeHours, 0);
  }, [laborReport]);

  function downloadCSV() {
    if (!payrollCSV || payrollCSV.rows.length === 0) {
      toast.error('No payroll data to export');
      return;
    }

    const headers = [
      'Employee Name',
      'Employee ID',
      'Date',
      'Hours Worked',
      'Overtime Hours',
      'Regular Hours',
      'Hourly Rate (cents)',
      'Regular Pay (cents)',
      'Overtime Pay (cents)',
      'Gross Pay (cents)',
      'Role',
    ];

    const csvRows = [headers.join(',')];
    for (const row of payrollCSV.rows) {
      csvRows.push(
        [
          `"${row.employeeName}"`,
          row.employeeId,
          row.date,
          row.hoursWorked,
          (row as any).overtimeHours ?? '',
          (row as any).regularHours ?? '',
          row.hourlyRate,
          (row as any).regularPay ?? '',
          (row as any).overtimePay ?? '',
          (row as any).grossPay ?? '',
          `"${row.role}"`,
        ].join(',')
      );
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${formatDateISO(dateRange.start)}-to-${formatDateISO(dateRange.end)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }

  function downloadADP() {
    // ADP format requires coCode and batchId - use defaults
    // We generate the ADP rows client-side from the labor report data
    if (!laborReport || laborReport.employees.length === 0) {
      toast.error('No payroll data to export');
      return;
    }

    const headers = ['Co Code', 'Batch ID', 'Employee ID', 'Reg Hours', 'OT Hours', 'Rate'];
    const csvRows = [headers.join(',')];

    for (const emp of laborReport.employees) {
      csvRows.push(
        [
          'ADP001',
          `BATCH-${formatDateISO(dateRange.start)}`,
          emp.userId,
          emp.regularHours,
          emp.overtimeHours,
          (emp.hourlyRate / 100).toFixed(2),
        ].join(',')
      );
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adp-payroll-${formatDateISO(dateRange.start)}-to-${formatDateISO(dateRange.end)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('ADP format exported');
  }

  function downloadGusto() {
    if (!gustoData || gustoData.rows.length === 0) {
      toast.error('No payroll data to export');
      return;
    }

    const headers = ['employee_id', 'hours', 'pay_period_start', 'pay_period_end'];
    const csvRows = [headers.join(',')];

    for (const row of gustoData.rows) {
      csvRows.push(
        [row.employee_id, row.hours, row.pay_period_start, row.pay_period_end].join(',')
      );
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gusto-payroll-${formatDateISO(dateRange.start)}-to-${formatDateISO(dateRange.end)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Gusto format exported');
  }

  return (
    <>
      {/* Date Range Controls */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Period</Label>
          <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="this-pay-period">This Pay Period</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {preset === 'custom' && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End</Label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-[160px]"
              />
            </div>
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {laborReport ? formatHours(laborReport.totalHours) : '-'}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Labor Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {laborReport ? formatCents(laborReport.totalLaborCost) : '-'}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Overtime Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span
              className={`text-2xl font-bold ${
                totalOvertimeHours > 0 ? 'text-yellow-600' : ''
              }`}
            >
              {laborReport ? formatHours(totalOvertimeHours) : '-'}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Labor Cost %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span
              className={`text-2xl font-bold ${
                laborReport
                  ? laborReport.laborCostPercentage > 35
                    ? 'text-destructive'
                    : laborReport.laborCostPercentage > 30
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  : ''
              }`}
            >
              {laborReport ? `${laborReport.laborCostPercentage}%` : '-'}
            </span>
            {laborReport && laborReport.totalRevenue > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                of {formatCents(laborReport.totalRevenue)} revenue
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Employee Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Employee Labor Breakdown</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadCSV}>
                <FileSpreadsheet className="mr-1 h-3 w-3" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={downloadADP}>
                <Download className="mr-1 h-3 w-3" />
                Export ADP
              </Button>
              <Button variant="outline" size="sm" onClick={downloadGusto}>
                <Download className="mr-1 h-3 w-3" />
                Export Gusto
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Regular Hours</TableHead>
                  <TableHead className="text-right">OT Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Regular Pay</TableHead>
                  <TableHead className="text-right">OT Pay</TableHead>
                  <TableHead className="text-right">Total Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!laborReport || laborReport.employees.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No labor data for this period.
                    </TableCell>
                  </TableRow>
                )}
                {laborReport?.employees.map((emp) => (
                  <TableRow key={emp.userId}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-right">
                      {formatHours(emp.regularHours)}
                    </TableCell>
                    <TableCell className="text-right">
                      {emp.overtimeHours > 0 ? (
                        <span
                          className={
                            emp.overtimeHours > 10
                              ? 'text-destructive font-semibold'
                              : 'text-yellow-600 font-medium'
                          }
                        >
                          {formatHours(emp.overtimeHours)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0h</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCents(emp.hourlyRate)}/hr
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCents(emp.regularPay)}
                    </TableCell>
                    <TableCell className="text-right">
                      {emp.overtimePay > 0 ? (
                        <span className="text-yellow-600 font-medium">
                          {formatCents(emp.overtimePay)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">$0.00</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCents(emp.totalPay)}
                    </TableCell>
                  </TableRow>
                ))}
                {laborReport && laborReport.employees.length > 0 && (
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Totals</TableCell>
                    <TableCell className="text-right">
                      {formatHours(
                        laborReport.employees.reduce(
                          (sum, e) => sum + e.regularHours,
                          0
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatHours(totalOvertimeHours)}
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right">
                      {formatCents(
                        laborReport.employees.reduce(
                          (sum, e) => sum + e.regularPay,
                          0
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCents(
                        laborReport.employees.reduce(
                          (sum, e) => sum + e.overtimePay,
                          0
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCents(laborReport.totalLaborCost)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
