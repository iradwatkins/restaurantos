'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
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
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Banknote,
  Download,
  Users,
  UtensilsCrossed,
  CreditCard,
  ArrowUpDown,
  Receipt,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { formatCents } from '@/lib/format';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

type TabId = 'dashboard' | 'sales' | 'staff' | 'menu' | 'financial' | 'comparison' | 'tips';
type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'sales', label: 'Sales' },
  { id: 'staff', label: 'Staff' },
  { id: 'menu', label: 'Menu' },
  { id: 'financial', label: 'Financial' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'tips', label: 'Tips' },
];

const SOURCE_LABELS: Record<string, string> = {
  dine_in: 'Dine-In',
  online: 'Online',
  doordash: 'DoorDash',
  ubereats: 'Uber Eats',
  grubhub: 'Grubhub',
};

const SOURCE_COLORS: Record<string, string> = {
  dine_in: 'bg-blue-500',
  online: 'bg-green-500',
  doordash: 'bg-red-500',
  ubereats: 'bg-green-600',
  grubhub: 'bg-orange-500',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  sent_to_kitchen: 'bg-orange-500',
  preparing: 'bg-blue-500',
  ready: 'bg-purple-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

// ────────────────────────────────────────────
// Date helpers
// ────────────────────────────────────────────

function getDateRange(preset: DatePreset): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  switch (preset) {
    case 'today':
      return { start: todayStart, end: todayEnd };
    case 'yesterday': {
      const yStart = new Date(todayStart);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(yStart);
      yEnd.setHours(23, 59, 59, 999);
      return { start: yStart, end: yEnd };
    }
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

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

// ────────────────────────────────────────────
// CSV Export utility
// ────────────────────────────────────────────

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        const escaped = String(cell).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
          ? `"${escaped}"`
          : escaped;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ────────────────────────────────────────────
// Sort helper
// ────────────────────────────────────────────

type SortDir = 'asc' | 'desc';

function useSortable<T>(defaultKey: keyof T, defaultDir: SortDir = 'desc') {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const toggle = useCallback(
    (key: keyof T) => {
      if (key === sortKey) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('desc');
      }
    },
    [sortKey]
  );

  const sort = useCallback(
    (data: T[]): T[] => {
      return [...data].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const aStr = String(aVal);
        const bStr = String(bVal);
        return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    },
    [sortKey, sortDir]
  );

  return { sortKey, sortDir, toggle, sort };
}

function SortHeader({
  label,
  sortKey: key,
  currentKey,
  currentDir,
  onToggle,
  className,
}: {
  label: string;
  sortKey: string;
  currentKey: string;
  currentDir: SortDir;
  onToggle: (k: any) => void;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        onClick={() => onToggle(key)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
        {currentKey === key && (
          <span className="text-[10px]">{currentDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </button>
    </TableHead>
  );
}

// ────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────

export default function ReportsPage() {
  const { tenantId } = useTenant();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customStart, setCustomStart] = useState<string>(formatDateForInput(new Date()));
  const [customEnd, setCustomEnd] = useState<string>(formatDateForInput(new Date()));

  const dateRange = useMemo(() => {
    if (datePreset === 'custom') {
      const start = new Date(customStart + 'T00:00:00');
      const end = new Date(customEnd + 'T23:59:59.999');
      return { start, end };
    }
    return getDateRange(datePreset);
  }, [datePreset, customStart, customEnd]);

  const queryArgs = tenantId
    ? { tenantId, startDate: dateRange.start.getTime(), endDate: dateRange.end.getTime() }
    : 'skip' as const;

  // Load data for active tab
  const dailySummary = useQuery(
    api.reports.queries.getDailySummary,
    activeTab === 'dashboard' ? queryArgs : 'skip'
  );
  const hourlyHeatmap = useQuery(
    api.reports.queries.getHourlyHeatmap,
    activeTab === 'sales' ? queryArgs : 'skip'
  );
  const channelReport = useQuery(
    api.reports.queries.getChannelReport,
    activeTab === 'sales' ? queryArgs : 'skip'
  );
  const serverReport = useQuery(
    api.reports.queries.getServerReport,
    activeTab === 'staff' ? queryArgs : 'skip'
  );
  const categoryReport = useQuery(
    api.reports.queries.getCategoryReport,
    activeTab === 'menu' ? queryArgs : 'skip'
  );
  const topItems = useQuery(
    api.reports.queries.getTopItems,
    activeTab === 'menu' ? queryArgs : 'skip'
  );
  const paymentMethodReport = useQuery(
    api.reports.queries.getPaymentMethodReport,
    activeTab === 'financial' ? queryArgs : 'skip'
  );
  const taxReport = useQuery(
    api.reports.queries.getTaxReport,
    activeTab === 'financial' ? queryArgs : 'skip'
  );
  const discountReport = useQuery(
    api.reports.queries.getDiscountReport,
    activeTab === 'financial' ? queryArgs : 'skip'
  );
  const comparisonReport = useQuery(
    api.reports.queries.getComparisonReport,
    activeTab === 'comparison' ? queryArgs : 'skip'
  );
  const tipReport = useQuery(
    api.reports.queries.getTipReport,
    activeTab === 'tips' ? queryArgs : 'skip'
  );
  const exportData = useQuery(
    api.reports.queries.exportReportData,
    queryArgs
  );

  // CSV export handler
  function handleExportCsv() {
    if (!exportData) return;
    const headers = [
      'Order ID', 'Order #', 'Source', 'Status', 'Table', 'Customer', 'Phone',
      'Email', 'Items', 'Subtotal', 'Tax', 'Total', 'Tip', 'Payment Status',
      'Payment Method', 'Discount Type', 'Discount Amt', 'Comped', 'Server',
      'Created At', 'Completed At',
    ];
    const rows = exportData.map((o) => [
      String(o.orderId),
      String(o.orderNumber ?? ''),
      o.source,
      o.status,
      o.tableName ?? '',
      o.customerName ?? '',
      o.customerPhone ?? '',
      o.customerEmail ?? '',
      o.items.map((i) => `${i.name} x${i.quantity}`).join('; '),
      formatCents(o.subtotal),
      formatCents(o.tax),
      formatCents(o.total),
      formatCents(o.tipAmount),
      o.paymentStatus,
      o.paymentMethod ?? '',
      o.discountType ?? '',
      formatCents(o.discountAmount),
      o.isComped ? 'Yes' : 'No',
      o.serverName ?? '',
      new Date(o.createdAt).toISOString(),
      o.completedAt ? new Date(o.completedAt).toISOString() : '',
    ]);
    const filename = `orders-${formatDateForInput(dateRange.start)}-to-${formatDateForInput(dateRange.end)}.csv`;
    downloadCsv(filename, headers, rows);
  }

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Revenue, orders, and operational analytics</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!exportData}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Date filter bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={datePreset} onValueChange={(val) => setDatePreset(val as DatePreset)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>
        </CardContent>
      </Card>

      {/* Tab navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Report tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && (
        <DashboardTab summary={dailySummary} />
      )}
      {activeTab === 'sales' && (
        <SalesTab heatmap={hourlyHeatmap} channels={channelReport} />
      )}
      {activeTab === 'staff' && (
        <StaffTab servers={serverReport} />
      )}
      {activeTab === 'menu' && (
        <MenuTab categories={categoryReport} topItems={topItems} />
      )}
      {activeTab === 'financial' && (
        <FinancialTab
          paymentMethods={paymentMethodReport}
          tax={taxReport}
          discounts={discountReport}
        />
      )}
      {activeTab === 'comparison' && (
        <ComparisonTab data={comparisonReport} />
      )}
      {activeTab === 'tips' && (
        <TipsTab data={tipReport} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// Dashboard Tab
// ────────────────────────────────────────────

function DashboardTab({ summary }: {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    byStatus: Record<string, number>;
    bySource: Record<string, { count: number; revenue: number }>;
  } | undefined;
}) {
  const totalOrders = summary?.totalOrders ?? 0;
  const totalRevenue = summary?.totalRevenue ?? 0;
  const avgOrderValue = summary?.avgOrderValue ?? 0;
  const totalTax = Object.values(summary?.bySource ?? {}).reduce((s, src) => s + src.revenue, 0) - totalRevenue;
  const byStatus = summary?.byStatus ?? {};
  const bySource = summary?.bySource ?? {};

  const statusTotal = Object.values(byStatus).reduce((s, n) => s + n, 0);
  const maxSourceRevenue = Math.max(...Object.values(bySource).map((s) => s.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatCents(totalRevenue)}</div>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tax</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatCents(Math.abs(totalTax))}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Orders by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Orders by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(bySource).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No order data</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(bySource)
                  .sort(([, a], [, b]) => b.revenue - a.revenue)
                  .map(([source, data]) => {
                    const pct = maxSourceRevenue > 0 ? (data.revenue / maxSourceRevenue) * 100 : 0;
                    return (
                      <div key={source} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${SOURCE_COLORS[source] ?? 'bg-gray-400'}`} />
                            <span className="font-medium">{SOURCE_LABELS[source] ?? source}</span>
                            <Badge variant="outline" className="text-xs">{data.count} orders</Badge>
                          </div>
                          <span className="font-bold">${formatCents(data.revenue)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${SOURCE_COLORS[source] ?? 'bg-gray-400'}`}
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

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Orders by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(byStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No order data</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    const pct = statusTotal > 0 ? (count / statusTotal) * 100 : 0;
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-400'}`} />
                            <span className="font-medium capitalize">{status.replace(/_/g, ' ')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                            <span className="font-bold">{count}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${STATUS_COLORS[status] ?? 'bg-gray-400'}`}
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

// ────────────────────────────────────────────
// Sales Tab
// ────────────────────────────────────────────

function SalesTab({ heatmap, channels }: {
  heatmap: Array<{ hour: number; count: number; revenue: number }> | undefined;
  channels: Array<{ source: string; count: number; revenue: number; avgOrderValue: number }> | undefined;
}) {
  const hours = heatmap ?? [];
  const maxCount = Math.max(...hours.map((h) => h.count), 1);

  return (
    <div className="space-y-6">
      {/* Hourly Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hourly Order Volume</CardTitle>
        </CardHeader>
        <CardContent>
          {hours.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No data</p>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
              {hours.map((h) => {
                const intensity = maxCount > 0 ? h.count / maxCount : 0;
                // Color scale from muted to primary
                const bg =
                  intensity === 0
                    ? 'bg-muted'
                    : intensity < 0.25
                      ? 'bg-primary/20'
                      : intensity < 0.5
                        ? 'bg-primary/40'
                        : intensity < 0.75
                          ? 'bg-primary/60'
                          : 'bg-primary';
                return (
                  <div
                    key={h.hour}
                    className={`rounded-md p-2 text-center ${bg} transition-colors`}
                    title={`${formatHour(h.hour)}: ${h.count} orders, $${formatCents(h.revenue)}`}
                  >
                    <div className="text-[10px] font-medium text-foreground/70">
                      {formatHour(h.hour).replace(' ', '\n').split('\n')[0]}
                    </div>
                    <div className="text-xs font-bold">{h.count}</div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-0.5">
              <div className="h-3 w-6 rounded-sm bg-muted" />
              <div className="h-3 w-6 rounded-sm bg-primary/20" />
              <div className="h-3 w-6 rounded-sm bg-primary/40" />
              <div className="h-3 w-6 rounded-sm bg-primary/60" />
              <div className="h-3 w-6 rounded-sm bg-primary" />
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Channel Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channel Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {!channels || channels.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No data</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Avg Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((ch) => (
                  <TableRow key={ch.source}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${SOURCE_COLORS[ch.source] ?? 'bg-gray-400'}`} />
                        {SOURCE_LABELS[ch.source] ?? ch.source}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{ch.count}</TableCell>
                    <TableCell className="text-right font-medium">${formatCents(ch.revenue)}</TableCell>
                    <TableCell className="text-right">${formatCents(ch.avgOrderValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────
// Staff Tab
// ────────────────────────────────────────────

interface ServerRow {
  serverId: string;
  name: string;
  orderCount: number;
  totalRevenue: number;
  totalTips: number;
  avgOrderValue: number;
}

function StaffTab({ servers }: { servers: ServerRow[] | undefined }) {
  const { sortKey, sortDir, toggle, sort } = useSortable<ServerRow>('totalRevenue');
  const sorted = sort(servers ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Server Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No server data</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader label="Server" sortKey="name" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} />
                <SortHeader label="Orders" sortKey="orderCount" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                <SortHeader label="Revenue" sortKey="totalRevenue" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                <SortHeader label="Avg Order" sortKey="avgOrderValue" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                <SortHeader label="Tips" sortKey="totalTips" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((s) => (
                <TableRow key={s.serverId}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">{s.orderCount}</TableCell>
                  <TableCell className="text-right font-medium">${formatCents(s.totalRevenue)}</TableCell>
                  <TableCell className="text-right">${formatCents(s.avgOrderValue)}</TableCell>
                  <TableCell className="text-right">${formatCents(s.totalTips)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────
// Menu Tab
// ────────────────────────────────────────────

interface CategoryRow {
  categoryName: string;
  itemsSold: number;
  revenue: number;
}

interface ItemRow {
  name: string;
  quantitySold: number;
  revenue: number;
  avgPrice: number;
}

function MenuTab({ categories, topItems }: {
  categories: CategoryRow[] | undefined;
  topItems: { byQuantity: ItemRow[]; byRevenue: ItemRow[] } | undefined;
}) {
  const cats = categories ?? [];
  const maxCatRevenue = Math.max(...cats.map((c) => c.revenue), 1);
  const byRevenue = topItems?.byRevenue ?? [];
  const byQuantity = topItems?.byQuantity ?? [];

  return (
    <div className="space-y-6">
      {/* Category breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UtensilsCrossed className="h-4 w-4" />
            Category Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No data</p>
          ) : (
            <div className="space-y-3">
              {cats.map((cat) => {
                const pct = maxCatRevenue > 0 ? (cat.revenue / maxCatRevenue) * 100 : 0;
                return (
                  <div key={cat.categoryName} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cat.categoryName}</span>
                        <Badge variant="outline" className="text-xs">{cat.itemsSold} sold</Badge>
                      </div>
                      <span className="font-bold">${formatCents(cat.revenue)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 20 by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Items by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {byRevenue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byRevenue.map((item, idx) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantitySold}</TableCell>
                      <TableCell className="text-right font-medium">${formatCents(item.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top 20 by Quantity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Items by Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            {byQuantity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byQuantity.map((item, idx) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantitySold}</TableCell>
                      <TableCell className="text-right font-medium">${formatCents(item.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Financial Tab
// ────────────────────────────────────────────

function FinancialTab({ paymentMethods, tax, discounts }: {
  paymentMethods: Array<{ method: string; count: number; total: number; percentage: number }> | undefined;
  tax: { totalTax: number; effectiveTaxRate: number; taxByDate: Array<{ date: string; tax: number; subtotal: number }> } | undefined;
  discounts: {
    totalDiscounts: number;
    totalComps: number;
    totalVoidedItems: number;
    discountsByType: Record<string, { count: number; total: number }>;
    topDiscounts: Array<{ name: string; count: number; total: number }>;
  } | undefined;
}) {
  const methods = paymentMethods ?? [];
  const totalPayments = methods.reduce((s, m) => s + m.total, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {methods.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No payment data</p>
            ) : (
              <div className="space-y-4">
                {methods.map((m) => {
                  const pct = totalPayments > 0 ? (m.total / totalPayments) * 100 : 0;
                  return (
                    <div key={m.method} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">{m.method}</span>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">{m.percentage}%</Badge>
                          <span className="font-bold">${formatCents(m.total)}</span>
                        </div>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{m.count} transactions</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tax Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" />
              Tax Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tax Collected</p>
                  <p className="text-xl font-bold">${formatCents(tax?.totalTax ?? 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Effective Tax Rate</p>
                  <p className="text-xl font-bold">{(tax?.effectiveTaxRate ?? 0).toFixed(2)}%</p>
                </div>
              </div>
              {tax?.taxByDate && tax.taxByDate.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Tax by Date</p>
                  <div className="max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="text-right">Tax</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tax.taxByDate.map((d) => (
                          <TableRow key={d.date}>
                            <TableCell className="font-medium">{d.date}</TableCell>
                            <TableCell className="text-right">${formatCents(d.subtotal)}</TableCell>
                            <TableCell className="text-right font-medium">${formatCents(d.tax)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discounts / Comps / Voids */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discounts, Comps & Voids</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Discounts</p>
              <p className="text-2xl font-bold">${formatCents(discounts?.totalDiscounts ?? 0)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Comps</p>
              <p className="text-2xl font-bold">${formatCents(discounts?.totalComps ?? 0)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Voided Items</p>
              <p className="text-2xl font-bold">{discounts?.totalVoidedItems ?? 0}</p>
            </div>
          </div>

          {/* Discount types */}
          {discounts?.discountsByType && Object.keys(discounts.discountsByType).length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">By Discount Type</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(discounts.discountsByType).map(([dtype, data]) => (
                    <TableRow key={dtype}>
                      <TableCell className="font-medium capitalize">{dtype.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-right">{data.count}</TableCell>
                      <TableCell className="text-right font-medium">${formatCents(data.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Top discounts used */}
          {discounts?.topDiscounts && discounts.topDiscounts.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Most Used Discounts</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Discount</TableHead>
                    <TableHead className="text-right">Uses</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.topDiscounts.map((d) => (
                    <TableRow key={d.name}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-right">{d.count}</TableCell>
                      <TableCell className="text-right font-medium">${formatCents(d.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────
// Comparison Tab
// ────────────────────────────────────────────

function ComparisonTab({ data }: {
  data: {
    current: { revenue: number; orderCount: number; avgOrderValue: number };
    previous: { revenue: number; orderCount: number; avgOrderValue: number };
    changes: { revenueChangePct: number; orderCountChangePct: number; avgOrderValueChangePct: number };
  } | undefined;
}) {
  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-6">Loading comparison data...</p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: 'Revenue',
      current: data.current.revenue,
      previous: data.previous.revenue,
      changePct: data.changes.revenueChangePct,
      format: (v: number) => `$${formatCents(v)}`,
    },
    {
      label: 'Order Count',
      current: data.current.orderCount,
      previous: data.previous.orderCount,
      changePct: data.changes.orderCountChangePct,
      format: (v: number) => String(v),
    },
    {
      label: 'Avg Order Value',
      current: data.current.avgOrderValue,
      previous: data.previous.avgOrderValue,
      changePct: data.changes.avgOrderValueChangePct,
      format: (v: number) => `$${formatCents(v)}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((m) => {
          const isUp = m.changePct > 0;
          const isDown = m.changePct < 0;
          return (
            <Card key={m.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{m.format(m.current)}</div>
                <div className="flex items-center gap-2 mt-2">
                  {isUp && <TrendingUp className="h-4 w-4 text-green-600" />}
                  {isDown && <TrendingDown className="h-4 w-4 text-red-600" />}
                  {!isUp && !isDown && <span className="h-4 w-4 inline-block" />}
                  <span className={`text-sm font-medium ${isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {isUp ? '+' : ''}{m.changePct}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs previous period</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Previous: {m.format(m.previous)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Visual comparison bars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Period Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {metrics.map((m) => {
              const maxVal = Math.max(m.current, m.previous, 1);
              const currentPct = (m.current / maxVal) * 100;
              const prevPct = (m.previous / maxVal) * 100;
              return (
                <div key={m.label} className="space-y-2">
                  <p className="text-sm font-medium">{m.label}</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">Current</span>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${Math.max(currentPct, 1)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-24 text-right">{m.format(m.current)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">Previous</span>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-muted-foreground/30 transition-all duration-300"
                          style={{ width: `${Math.max(prevPct, 1)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-24 text-right">{m.format(m.previous)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────
// Tips Tab (embedded, not separate page)
// ────────────────────────────────────────────

function TipsTab({ data }: {
  data: {
    totalTips: number;
    tipsByMethod: { cash: number; card: number };
    tipsByServer: Array<{ serverId: string; serverName: string; totalTips: number; orderCount: number }>;
    averageTipPercent: number;
    tipsByDay: Array<{ date: string; total: number }>;
  } | undefined;
}) {
  const totalTips = data?.totalTips ?? 0;
  const avgTipPct = data?.averageTipPercent ?? 0;
  const cashTips = data?.tipsByMethod.cash ?? 0;
  const cardTips = data?.tipsByMethod.card ?? 0;
  const tipsByServer = data?.tipsByServer ?? [];
  const tipsByDay = data?.tipsByDay ?? [];
  const maxDayTip = tipsByDay.length > 0 ? Math.max(...tipsByDay.map((d) => d.total)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          For more detailed tip analysis, visit the{' '}
          <Link href="/reports/tips" className="text-primary underline hover:no-underline">
            dedicated Tip Report page
          </Link>.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tips</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatCents(totalTips)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Tip %</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTipPct.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cash Tips</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatCents(cashTips)}</div>
            {totalTips > 0 && (
              <p className="text-xs text-muted-foreground">{((cashTips / totalTips) * 100).toFixed(0)}% of total</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Card Tips</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatCents(cardTips)}</div>
            {totalTips > 0 && (
              <p className="text-xs text-muted-foreground">{((cardTips / totalTips) * 100).toFixed(0)}% of total</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tips by Server */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tips by Server</CardTitle>
          </CardHeader>
          <CardContent>
            {tipsByServer.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No tip data</p>
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
                  {tipsByServer.map((s) => {
                    const avgTip = s.orderCount > 0 ? s.totalTips / s.orderCount : 0;
                    return (
                      <TableRow key={s.serverId}>
                        <TableCell className="font-medium">{s.serverName}</TableCell>
                        <TableCell className="text-right">{s.orderCount}</TableCell>
                        <TableCell className="text-right font-medium">${formatCents(s.totalTips)}</TableCell>
                        <TableCell className="text-right">${formatCents(Math.round(avgTip))}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Tips by Day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tips by Day</CardTitle>
          </CardHeader>
          <CardContent>
            {tipsByDay.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No tip data</p>
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
