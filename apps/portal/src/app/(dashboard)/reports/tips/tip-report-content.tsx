'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
} from '@restaurantos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import { DollarSign, Percent, CreditCard, Banknote, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatCents } from '@/lib/format';

type DatePreset = 'today' | 'this_week' | 'this_month' | 'custom';

function getDateRange(preset: DatePreset): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  switch (preset) {
    case 'today':
      return { start: todayStart, end: todayEnd };
    case 'this_week': {
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { start: weekStart, end: todayEnd };
    }
    case 'this_month': {
      const monthStart = new Date(todayStart);
      monthStart.setDate(1);
      return { start: monthStart, end: todayEnd };
    }
    case 'custom':
      return { start: todayStart, end: todayEnd };
  }
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

export default function TipReportContent() {
  const { tenantId } = useTenant();

  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customStart, setCustomStart] = useState<string>(
    formatDateForInput(new Date())
  );
  const [customEnd, setCustomEnd] = useState<string>(
    formatDateForInput(new Date())
  );
  const [serverFilter, setServerFilter] = useState<string>('all');

  const dateRange = useMemo(() => {
    if (datePreset === 'custom') {
      const start = new Date(customStart + 'T00:00:00');
      const end = new Date(customEnd + 'T23:59:59.999');
      return { start, end };
    }
    return getDateRange(datePreset);
  }, [datePreset, customStart, customEnd]);

  const tipReport = useQuery(
    api.reports.queries.getTipReport,
    tenantId
      ? {
          tenantId,
          startDate: dateRange.start.getTime(),
          endDate: dateRange.end.getTime(),
          ...(serverFilter !== 'all' ? { serverId: serverFilter as any } : {}),
        }
      : 'skip'
  );

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  const totalTips = tipReport?.totalTips ?? 0;
  const avgTipPct = tipReport?.averageTipPercent ?? 0;
  const cashTips = tipReport?.tipsByMethod.cash ?? 0;
  const cardTips = tipReport?.tipsByMethod.card ?? 0;
  const tipsByServer = tipReport?.tipsByServer ?? [];
  const tipsByDay = tipReport?.tipsByDay ?? [];

  // Find the max daily tip for scaling the bar chart
  const maxDayTip = tipsByDay.length > 0
    ? Math.max(...tipsByDay.map((d) => d.total))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Reports
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tip Report</h1>
            <p className="text-muted-foreground">Analyze tips by server, method, and date</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Date preset */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date Range</label>
              <Select
                value={datePreset}
                onValueChange={(val) => setDatePreset(val as DatePreset)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom date inputs */}
            {datePreset === 'custom' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
              </>
            )}

            {/* Server filter */}
            {tipsByServer.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Server</label>
                <Select value={serverFilter} onValueChange={setServerFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Servers</SelectItem>
                    {tipsByServer.map((s) => (
                      <SelectItem key={s.serverId} value={s.serverId}>
                        {s.serverName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tips
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatCents(totalTips)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Tip %
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTipPct.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash Tips
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatCents(cashTips)}</div>
            {totalTips > 0 && (
              <p className="text-xs text-muted-foreground">
                {((cashTips / totalTips) * 100).toFixed(0)}% of total
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Card Tips
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatCents(cardTips)}</div>
            {totalTips > 0 && (
              <p className="text-xs text-muted-foreground">
                {((cardTips / totalTips) * 100).toFixed(0)}% of total
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips by Server Table + Tips by Day Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tips by Server */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tips by Server</CardTitle>
          </CardHeader>
          <CardContent>
            {tipsByServer.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No tip data for this period
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Server</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Tips</TableHead>
                    <TableHead className="text-right">Avg Tip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tipsByServer.map((server) => {
                    const avgTip =
                      server.orderCount > 0
                        ? server.totalTips / server.orderCount
                        : 0;
                    return (
                      <TableRow key={server.serverId}>
                        <TableCell className="font-medium">
                          {server.serverName}
                        </TableCell>
                        <TableCell className="text-right">
                          {server.orderCount}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${formatCents(server.totalTips)}
                        </TableCell>
                        <TableCell className="text-right">
                          ${formatCents(Math.round(avgTip))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Tips by Day — CSS bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tips by Day</CardTitle>
          </CardHeader>
          <CardContent>
            {tipsByDay.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No tip data for this period
              </p>
            ) : (
              <div className="space-y-3">
                {tipsByDay.map((day) => {
                  const pct = maxDayTip > 0 ? (day.total / maxDayTip) * 100 : 0;
                  return (
                    <div key={day.date} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-medium">
                          {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="font-bold">${formatCents(day.total)}</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
