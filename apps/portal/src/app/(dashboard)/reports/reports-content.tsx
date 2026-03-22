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
  FlaskConical,
  Sunrise,
  Trash2,
  Trophy,
  ChevronDown,
  ChevronUp,
  Star,
  AlertTriangle,
  Gift,
  Wallet,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { formatCents } from '@/lib/format';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

type TabId = 'dashboard' | 'sales' | 'dayparts' | 'staff' | 'menu' | 'engineering' | 'financial' | 'waste' | 'comparison' | 'tips' | 'gift_cards';
type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'sales', label: 'Sales' },
  { id: 'dayparts', label: 'Dayparts' },
  { id: 'staff', label: 'Staff' },
  { id: 'menu', label: 'Menu' },
  { id: 'engineering', label: 'Menu Engineering' },
  { id: 'financial', label: 'Financial' },
  { id: 'waste', label: 'Waste' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'tips', label: 'Tips' },
  { id: 'gift_cards', label: 'Gift Cards' },
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
  const menuEngineering = useQuery(
    api.reports.queries.getMenuEngineeringReport,
    activeTab === 'engineering' ? queryArgs : 'skip'
  );
  const daypartAnalysis = useQuery(
    api.reports.queries.getDaypartAnalysis,
    activeTab === 'dayparts' ? queryArgs : 'skip'
  );
  const serverPerformance = useQuery(
    api.reports.queries.getServerPerformanceReport,
    activeTab === 'staff' ? queryArgs : 'skip'
  );
  const wasteReport = useQuery(
    api.reports.queries.getWasteReport,
    activeTab === 'waste' ? queryArgs : 'skip'
  );
  const giftCardLiability = useQuery(
    api.giftCards.queries.getLiabilityReport,
    activeTab === 'gift_cards' && tenantId ? { tenantId } : 'skip'
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
      {activeTab === 'dayparts' && (
        <DaypartTab data={daypartAnalysis} />
      )}
      {activeTab === 'staff' && (
        <StaffTab servers={serverReport} enhanced={serverPerformance} />
      )}
      {activeTab === 'menu' && (
        <MenuTab categories={categoryReport} topItems={topItems} />
      )}
      {activeTab === 'engineering' && (
        <MenuEngineeringTab data={menuEngineering} />
      )}
      {activeTab === 'financial' && (
        <FinancialTab
          paymentMethods={paymentMethodReport}
          tax={taxReport}
          discounts={discountReport}
        />
      )}
      {activeTab === 'waste' && (
        <WasteTab data={wasteReport} />
      )}
      {activeTab === 'comparison' && (
        <ComparisonTab data={comparisonReport} />
      )}
      {activeTab === 'tips' && (
        <TipsTab data={tipReport} />
      )}
      {activeTab === 'gift_cards' && (
        <GiftCardTab data={giftCardLiability} />
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

interface EnhancedServerRow {
  rank: number;
  serverId: string;
  name: string;
  orderCount: number;
  totalRevenue: number;
  totalTips: number;
  avgOrderValue: number;
  totalModifiers: number;
  totalItems: number;
  upsellRate: number;
  tipPercent: number;
  avgTableTurnMinutes: number | null;
}

const MEDAL_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-700'] as const;
const MEDAL_LABELS = ['1st', '2nd', '3rd'] as const;

function StaffTab({ servers, enhanced }: { servers: ServerRow[] | undefined; enhanced: EnhancedServerRow[] | undefined }) {
  const { sortKey, sortDir, toggle, sort } = useSortable<EnhancedServerRow>('totalRevenue');

  // Use enhanced data if available, otherwise fall back to basic
  if (enhanced && enhanced.length > 0) {
    const sorted = sort(enhanced);
    const maxRevenue = Math.max(...enhanced.map((s) => s.totalRevenue), 1);
    const maxUpsell = Math.max(...enhanced.map((s) => s.upsellRate), 0.001);
    const maxTipPct = Math.max(...enhanced.map((s) => s.tipPercent), 1);

    return (
      <div className="space-y-6">
        {/* Leaderboard header — top 3 */}
        {enhanced.length >= 2 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {enhanced.slice(0, 3).map((s, idx) => (
              <Card key={s.serverId} className={idx === 0 ? 'border-yellow-400 border-2' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Trophy className={`h-4 w-4 ${MEDAL_COLORS[idx] ?? 'text-muted-foreground'}`} />
                    {MEDAL_LABELS[idx] ?? `${idx + 1}th`} Place
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{s.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>${formatCents(s.totalRevenue)} revenue</span>
                    <span>{s.orderCount} orders</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Full sortable table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Server Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <SortHeader label="Server" sortKey="name" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} />
                    <SortHeader label="Orders" sortKey="orderCount" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                    <SortHeader label="Revenue" sortKey="totalRevenue" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                    <SortHeader label="Tips" sortKey="totalTips" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                    <SortHeader label="Avg Order" sortKey="avgOrderValue" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                    <SortHeader label="Upsell Rate" sortKey="upsellRate" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                    <SortHeader label="Tip %" sortKey="tipPercent" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                    <SortHeader label="Avg Turn" sortKey="avgTableTurnMinutes" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((s) => (
                    <TableRow key={s.serverId}>
                      <TableCell>
                        <span className={`font-mono text-xs ${s.rank <= 3 ? 'font-bold' : 'text-muted-foreground'}`}>
                          {s.rank <= 3 ? (
                            <Trophy className={`inline h-3.5 w-3.5 ${MEDAL_COLORS[s.rank - 1]}`} />
                          ) : (
                            s.rank
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">{s.orderCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${(s.totalRevenue / maxRevenue) * 100}%` }} />
                          </div>
                          <span className="font-medium">${formatCents(s.totalRevenue)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">${formatCents(s.totalTips)}</TableCell>
                      <TableCell className="text-right">${formatCents(s.avgOrderValue)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${(s.upsellRate / maxUpsell) * 100}%` }} />
                          </div>
                          <span>{(s.upsellRate * 100).toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full rounded-full bg-green-500" style={{ width: `${(s.tipPercent / maxTipPct) * 100}%` }} />
                          </div>
                          <span>{s.tipPercent.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {s.avgTableTurnMinutes !== null ? `${s.avgTableTurnMinutes}m` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback: basic server data
  const basicSorted = [...(servers ?? [])].sort((a, b) => b.totalRevenue - a.totalRevenue);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Server Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {basicSorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No server data</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Server</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Avg Order</TableHead>
                <TableHead className="text-right">Tips</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {basicSorted.map((s) => (
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

// ────────────────────────────────────────────
// Menu Engineering Tab
// ────────────────────────────────────────────

interface EngineeringItem {
  menuItemId: string;
  name: string;
  quantitySold: number;
  revenue: number;
  foodCostCents: number;
  costNotSet: boolean;
  foodCostPercent: number;
  contributionMarginCents: number;
  totalContributionMarginCents: number;
  classification: 'Star' | 'Puzzle' | 'Plowhorse' | 'Dog';
}

interface MenuEngineeringData {
  items: EngineeringItem[];
  medianPopularity: number;
  medianMargin: number;
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  Star: 'bg-green-100 text-green-800 border-green-300',
  Puzzle: 'bg-blue-100 text-blue-800 border-blue-300',
  Plowhorse: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Dog: 'bg-red-100 text-red-800 border-red-300',
};

const QUADRANT_BG: Record<string, string> = {
  Star: 'bg-green-50',
  Puzzle: 'bg-blue-50',
  Plowhorse: 'bg-yellow-50',
  Dog: 'bg-red-50',
};

function MenuEngineeringTab({ data }: { data: MenuEngineeringData | undefined }) {
  const { sortKey, sortDir, toggle, sort } = useSortable<EngineeringItem>('revenue');

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-6">Loading menu engineering data...</p>
        </CardContent>
      </Card>
    );
  }

  const { items, medianPopularity, medianMargin } = data;
  const sorted = sort(items);

  const totalItems = items.length;
  const avgFoodCostPct = items.length > 0
    ? Math.round(items.reduce((s, i) => s + i.foodCostPercent, 0) / items.length)
    : 0;
  const starCount = items.filter((i) => i.classification === 'Star').length;
  const dogCount = items.filter((i) => i.classification === 'Dog').length;

  // Scatter plot bounds
  const maxPop = Math.max(...items.map((i) => i.quantitySold), 1);
  const maxMargin = Math.max(...items.map((i) => i.contributionMarginCents), 1);

  function handleExportEngineering() {
    const headers = ['Name', 'Qty Sold', 'Revenue', 'Food Cost %', 'Contribution Margin', 'Classification'];
    const rows = items.map((i) => [
      i.name,
      String(i.quantitySold),
      formatCents(i.revenue),
      `${i.foodCostPercent}%`,
      formatCents(i.contributionMarginCents),
      i.classification,
    ]);
    downloadCsv('menu-engineering.csv', headers, rows);
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Food Cost %</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgFoodCostPct}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stars</CardTitle>
            <Star className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{starCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dogs</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dogCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quadrant scatter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Menu Engineering Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Axis labels */}
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Low Margin</span>
              <span>Contribution Margin &rarr;</span>
              <span>High Margin</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border rounded-lg overflow-hidden" style={{ height: 280 }}>
              {/* Top-left: Plowhorse (high pop, low margin) */}
              <div className={`${QUADRANT_BG.Plowhorse} relative p-2`}>
                <span className="text-xs font-medium text-yellow-700">Plowhorse</span>
                <span className="text-[10px] text-yellow-600 block">High Pop / Low Margin</span>
                {items
                  .filter((i) => i.classification === 'Plowhorse')
                  .map((i) => (
                    <div
                      key={i.menuItemId}
                      className="absolute w-2 h-2 rounded-full bg-yellow-500 border border-yellow-700"
                      title={`${i.name}: ${i.quantitySold} sold, $${formatCents(i.contributionMarginCents)} margin`}
                      style={{
                        left: `${Math.min(90, Math.max(10, (i.contributionMarginCents / maxMargin) * 100))}%`,
                        bottom: `${Math.min(90, Math.max(10, (i.quantitySold / maxPop) * 100))}%`,
                      }}
                    />
                  ))}
              </div>
              {/* Top-right: Star (high pop, high margin) */}
              <div className={`${QUADRANT_BG.Star} relative p-2`}>
                <span className="text-xs font-medium text-green-700">Star</span>
                <span className="text-[10px] text-green-600 block">High Pop / High Margin</span>
                {items
                  .filter((i) => i.classification === 'Star')
                  .map((i) => (
                    <div
                      key={i.menuItemId}
                      className="absolute w-2 h-2 rounded-full bg-green-500 border border-green-700"
                      title={`${i.name}: ${i.quantitySold} sold, $${formatCents(i.contributionMarginCents)} margin`}
                      style={{
                        left: `${Math.min(90, Math.max(10, (i.contributionMarginCents / maxMargin) * 100))}%`,
                        bottom: `${Math.min(90, Math.max(10, (i.quantitySold / maxPop) * 100))}%`,
                      }}
                    />
                  ))}
              </div>
              {/* Bottom-left: Dog (low pop, low margin) */}
              <div className={`${QUADRANT_BG.Dog} relative p-2`}>
                <span className="text-xs font-medium text-red-700">Dog</span>
                <span className="text-[10px] text-red-600 block">Low Pop / Low Margin</span>
                {items
                  .filter((i) => i.classification === 'Dog')
                  .map((i) => (
                    <div
                      key={i.menuItemId}
                      className="absolute w-2 h-2 rounded-full bg-red-500 border border-red-700"
                      title={`${i.name}: ${i.quantitySold} sold, $${formatCents(i.contributionMarginCents)} margin`}
                      style={{
                        left: `${Math.min(90, Math.max(10, (i.contributionMarginCents / maxMargin) * 100))}%`,
                        bottom: `${Math.min(90, Math.max(10, (i.quantitySold / maxPop) * 100))}%`,
                      }}
                    />
                  ))}
              </div>
              {/* Bottom-right: Puzzle (low pop, high margin) */}
              <div className={`${QUADRANT_BG.Puzzle} relative p-2`}>
                <span className="text-xs font-medium text-blue-700">Puzzle</span>
                <span className="text-[10px] text-blue-600 block">Low Pop / High Margin</span>
                {items
                  .filter((i) => i.classification === 'Puzzle')
                  .map((i) => (
                    <div
                      key={i.menuItemId}
                      className="absolute w-2 h-2 rounded-full bg-blue-500 border border-blue-700"
                      title={`${i.name}: ${i.quantitySold} sold, $${formatCents(i.contributionMarginCents)} margin`}
                      style={{
                        left: `${Math.min(90, Math.max(10, (i.contributionMarginCents / maxMargin) * 100))}%`,
                        bottom: `${Math.min(90, Math.max(10, (i.quantitySold / maxPop) * 100))}%`,
                      }}
                    />
                  ))}
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low Popularity</span>
              <span>&uarr; Popularity</span>
              <span>High Popularity</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Median Popularity: {medianPopularity} sold | Median Margin: ${formatCents(medianMargin)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sortable table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Item Details</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportEngineering}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader label="Name" sortKey="name" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} />
                  <SortHeader label="Qty Sold" sortKey="quantitySold" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                  <SortHeader label="Revenue" sortKey="revenue" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                  <SortHeader label="Food Cost %" sortKey="foodCostPercent" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                  <SortHeader label="Margin" sortKey="contributionMarginCents" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                  <TableHead>Classification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((item) => (
                  <TableRow key={item.menuItemId}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantitySold}</TableCell>
                    <TableCell className="text-right font-medium">${formatCents(item.revenue)}</TableCell>
                    <TableCell className="text-right">
                      {item.costNotSet ? (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-300">
                          Cost not set
                        </Badge>
                      ) : (
                        `${item.foodCostPercent}%`
                      )}
                    </TableCell>
                    <TableCell className="text-right">${formatCents(item.contributionMarginCents)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${CLASSIFICATION_COLORS[item.classification] ?? ''}`}>
                        {item.classification}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────
// Daypart Tab
// ────────────────────────────────────────────

interface DaypartRow {
  name: string;
  revenue: number;
  orderCount: number;
  avgTicket: number;
  top5Items: Array<{ name: string; quantity: number }>;
}

interface DaypartData {
  dayparts: DaypartRow[];
  previousDayparts: DaypartRow[];
}

function DaypartTab({ data }: { data: DaypartData | undefined }) {
  const [expandedDaypart, setExpandedDaypart] = useState<string | null>(null);

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-6">Loading daypart data...</p>
        </CardContent>
      </Card>
    );
  }

  const { dayparts, previousDayparts } = data;
  const maxRevenue = Math.max(...dayparts.map((d) => d.revenue), 1);

  // Build a lookup for previous period by name
  const prevLookup: Record<string, DaypartRow> = {};
  for (const dp of previousDayparts) {
    prevLookup[dp.name] = dp;
  }

  function pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 10000) / 100;
  }

  return (
    <div className="space-y-6">
      {/* Daypart summary cards */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {dayparts.map((dp) => (
          <Card key={dp.name} className="min-w-[180px] flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sunrise className="h-4 w-4" />
                {dp.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">${formatCents(dp.revenue)}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{dp.orderCount} orders</span>
                <span>|</span>
                <span>${formatCents(dp.avgTicket)} avg</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Proportional bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Daypart</CardTitle>
        </CardHeader>
        <CardContent>
          {dayparts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No data</p>
          ) : (
            <div className="flex items-end gap-3" style={{ height: 200 }}>
              {dayparts.map((dp) => {
                const heightPct = maxRevenue > 0 ? (dp.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={dp.name} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium">${formatCents(dp.revenue)}</span>
                    <div
                      className="w-full bg-primary rounded-t-md transition-all duration-300"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                    <span className="text-xs text-muted-foreground text-center">{dp.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current vs Previous comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Period Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dayparts.map((dp) => {
              const prev = prevLookup[dp.name];
              const revChange = prev ? pctChange(dp.revenue, prev.revenue) : null;
              const countChange = prev ? pctChange(dp.orderCount, prev.orderCount) : null;
              const isUp = revChange !== null && revChange > 0;
              const isDown = revChange !== null && revChange < 0;

              return (
                <div key={dp.name} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{dp.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${formatCents(dp.revenue)} revenue | {dp.orderCount} orders
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {revChange !== null && (
                        <div className="flex items-center gap-1">
                          {isUp && <TrendingUp className="h-4 w-4 text-green-600" />}
                          {isDown && <TrendingDown className="h-4 w-4 text-red-600" />}
                          <span className={`text-sm font-medium ${isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {isUp ? '+' : ''}{revChange}%
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => setExpandedDaypart(expandedDaypart === dp.name ? null : dp.name)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        aria-label={`${expandedDaypart === dp.name ? 'Collapse' : 'Expand'} ${dp.name} details`}
                      >
                        {expandedDaypart === dp.name ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  {prev && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Previous: ${formatCents(prev.revenue)} revenue | {prev.orderCount} orders
                      {countChange !== null && ` (${countChange > 0 ? '+' : ''}${countChange}% orders)`}
                    </p>
                  )}

                  {/* Expandable top 5 items */}
                  {expandedDaypart === dp.name && dp.top5Items.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Top 5 Items</p>
                      <div className="space-y-1">
                        {dp.top5Items.map((item, idx) => (
                          <div key={item.name} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground">{idx + 1}.</span>
                              {item.name}
                            </span>
                            <Badge variant="outline" className="text-xs">{item.quantity} sold</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
// Waste Tab
// ────────────────────────────────────────────

interface WasteData {
  totalWaste: {
    voidsCents: number;
    compsCents: number;
    discountsCents: number;
    totalCents: number;
  };
  topWastedItems: Array<{ name: string; quantity: number; valueCents: number }>;
  dailyTrend: Array<{ date: string; voidsCents: number; compsCents: number; discountsCents: number }>;
  voidDetails: Array<{
    name: string;
    quantity: number;
    valueCents: number;
    reason: string;
    voidedBy: string;
    orderNumber: number;
  }>;
}

function WasteTab({ data }: { data: WasteData | undefined }) {
  const { sortKey, sortDir, toggle, sort } = useSortable<WasteData['topWastedItems'][number]>('valueCents');

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-6">Loading waste data...</p>
        </CardContent>
      </Card>
    );
  }

  const { totalWaste, topWastedItems, dailyTrend, voidDetails } = data;
  const sortedItems = sort(topWastedItems);
  const maxDailyWaste = Math.max(
    ...dailyTrend.map((d) => d.voidsCents + d.compsCents + d.discountsCents),
    1
  );

  // Donut chart segments
  const total = totalWaste.totalCents || 1;
  const voidPct = (totalWaste.voidsCents / total) * 100;
  const compPct = (totalWaste.compsCents / total) * 100;
  const discPct = (totalWaste.discountsCents / total) * 100;
  const conicGradient = `conic-gradient(
    #ef4444 0% ${voidPct}%,
    #f59e0b ${voidPct}% ${voidPct + compPct}%,
    #3b82f6 ${voidPct + compPct}% ${voidPct + compPct + discPct}%,
    #e5e7eb ${voidPct + compPct + discPct}% 100%
  )`;

  function handleExportWaste() {
    const headers = ['Item', 'Quantity', 'Value', 'Reason', 'Voided By', 'Order #'];
    const rows = voidDetails.map((v) => [
      v.name,
      String(v.quantity),
      formatCents(v.valueCents),
      v.reason,
      v.voidedBy,
      String(v.orderNumber),
    ]);
    downloadCsv('waste-report.csv', headers, rows);
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Waste</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatCents(totalWaste.totalCents)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Voids</CardTitle>
            <Trash2 className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${formatCents(totalWaste.voidsCents)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comps</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">${formatCents(totalWaste.compsCents)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Discounts</CardTitle>
            <Receipt className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${formatCents(totalWaste.discountsCents)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Waste Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div
                  className="rounded-full"
                  style={{
                    width: 180,
                    height: 180,
                    background: totalWaste.totalCents > 0 ? conicGradient : '#e5e7eb',
                  }}
                >
                  {/* Center overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-background rounded-full flex flex-col items-center justify-center" style={{ width: 110, height: 110 }}>
                      <span className="text-xs text-muted-foreground">Total</span>
                      <span className="text-lg font-bold">${formatCents(totalWaste.totalCents)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span>Voids ({voidPct.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span>Comps ({compPct.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span>Discounts ({discPct.toFixed(0)}%)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Waste Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data</p>
            ) : (
              <div className="space-y-3">
                {dailyTrend.map((day) => {
                  const dayTotal = day.voidsCents + day.compsCents + day.discountsCents;
                  const pct = maxDailyWaste > 0 ? (dayTotal / maxDailyWaste) * 100 : 0;
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
                        <span className="font-bold">${formatCents(dayTotal)}</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        {/* Stacked segments */}
                        <div className="h-full flex rounded-full overflow-hidden" style={{ width: `${Math.max(pct, 2)}%` }}>
                          {day.voidsCents > 0 && (
                            <div
                              className="h-full bg-red-500"
                              style={{ width: `${(day.voidsCents / dayTotal) * 100}%` }}
                            />
                          )}
                          {day.compsCents > 0 && (
                            <div
                              className="h-full bg-amber-500"
                              style={{ width: `${(day.compsCents / dayTotal) * 100}%` }}
                            />
                          )}
                          {day.discountsCents > 0 && (
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${(day.discountsCents / dayTotal) * 100}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top wasted items table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Top Wasted Items</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportWaste} disabled={voidDetails.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {sortedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No voided items</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <SortHeader label="Item" sortKey="name" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} />
                  <SortHeader label="Qty" sortKey="quantity" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                  <SortHeader label="Value" sortKey="valueCents" currentKey={String(sortKey)} currentDir={sortDir} onToggle={toggle} className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item, idx) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-medium">${formatCents(item.valueCents)}</TableCell>
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
// Gift Card Tab
// ────────────────────────────────────────────

interface GiftCardLiabilityData {
  totalOutstandingCents: number;
  totalIssuedCents: number;
  activeCardCount: number;
  redemptionRate: number;
  breakageEstimateCents: number;
  cards: Array<{
    code: string;
    initialAmountCents: number;
    currentBalanceCents: number;
    status: string;
    lastUsedAt?: number;
    createdAt: number;
  }>;
}

function GiftCardTab({ data }: { data: GiftCardLiabilityData | undefined }) {
  const { sortKey, sortDir, toggle, sort } = useSortable<GiftCardLiabilityData['cards'][number]>('currentBalanceCents');

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center py-6">Loading gift card data...</p>
        </CardContent>
      </Card>
    );
  }

  const {
    totalOutstandingCents,
    totalIssuedCents,
    activeCardCount,
    redemptionRate,
    breakageEstimateCents,
    cards,
  } = data;

  const sortedCards = sort(cards);

  const STATUS_BADGE: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    redeemed: 'bg-blue-100 text-blue-800',
    expired: 'bg-gray-100 text-gray-800',
    disabled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Liability
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatCents(totalOutstandingCents)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Issued
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatCents(totalIssuedCents)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Cards
            </CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCardCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Redemption Rate
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{redemptionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Breakage Estimate
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ${formatCents(breakageEstimateCents)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active cards table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4" />
            Gift Cards ({cards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No gift cards have been issued yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader
                      label="Code"
                      sortKey="code"
                      currentKey={String(sortKey)}
                      currentDir={sortDir}
                      onToggle={toggle}
                    />
                    <SortHeader
                      label="Initial Amount"
                      sortKey="initialAmountCents"
                      currentKey={String(sortKey)}
                      currentDir={sortDir}
                      onToggle={toggle}
                      className="text-right"
                    />
                    <SortHeader
                      label="Current Balance"
                      sortKey="currentBalanceCents"
                      currentKey={String(sortKey)}
                      currentDir={sortDir}
                      onToggle={toggle}
                      className="text-right"
                    />
                    <SortHeader
                      label="Status"
                      sortKey="status"
                      currentKey={String(sortKey)}
                      currentDir={sortDir}
                      onToggle={toggle}
                    />
                    <SortHeader
                      label="Last Used"
                      sortKey="lastUsedAt"
                      currentKey={String(sortKey)}
                      currentDir={sortDir}
                      onToggle={toggle}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCards.map((card) => (
                    <TableRow key={card.code}>
                      <TableCell className="font-mono text-sm tracking-wider">
                        {card.code}
                      </TableCell>
                      <TableCell className="text-right">
                        ${formatCents(card.initialAmountCents)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${formatCents(card.currentBalanceCents)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_BADGE[card.status] ?? 'bg-gray-100 text-gray-800'}
                        >
                          {card.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {card.lastUsedAt
                          ? new Date(card.lastUsedAt).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
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
