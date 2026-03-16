'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@restaurantos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import { DollarSign, ShoppingBag, TrendingUp, BarChart3 } from 'lucide-react';

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

export default function ReportsPage() {
  const tenants = useQuery(api.tenants.queries.list, {});
  const tenantId = tenants?.[0]?._id;

  const dailySales = useQuery(
    api.reports.queries.getDailySales,
    tenantId ? { tenantId, days: 7 } : 'skip'
  );
  const topItems = useQuery(
    api.reports.queries.getTopItems,
    tenantId ? { tenantId } : 'skip'
  );

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  const today = dailySales?.[0];
  const todayRevenue = today?.totalRevenue ?? 0;
  const todayOrders = today?.orderCount ?? 0;
  const weekRevenue = dailySales?.reduce((sum, d) => sum + d.totalRevenue, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Dashboard</h1>
        <p className="text-muted-foreground">Daily revenue and order metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(todayRevenue / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{todayOrders} orders today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">7-Day Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(weekRevenue / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {dailySales?.reduce((sum, d) => sum + d.orderCount, 0) ?? 0} total orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${todayOrders > 0 ? (todayRevenue / todayOrders / 100).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Based on today</p>
          </CardContent>
        </Card>
      </div>

      {today?.bySource && Object.keys(today.bySource).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Today by Channel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(today.bySource).map(([source, data]) => {
                const pct = todayRevenue > 0 ? (data.revenue / todayRevenue) * 100 : 0;
                return (
                  <div key={source} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${SOURCE_COLORS[source] ?? 'bg-gray-400'}`} />
                        <span className="font-medium">{SOURCE_LABELS[source] ?? source}</span>
                        <Badge variant="outline" className="text-xs">{data.count} orders</Badge>
                      </div>
                      <span className="font-bold">${(data.revenue / 100).toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${SOURCE_COLORS[source] ?? 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Revenue (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailySales?.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">{day.date}</TableCell>
                    <TableCell className="text-right">{day.orderCount}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${(day.totalRevenue / 100).toFixed(2)}
                    </TableCell>
                  </TableRow>
                )) ?? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">No data</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Items Today</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topItems?.map((item, idx) => (
                  <TableRow key={item.name}>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground mr-2">#{idx + 1}</span>
                      {item.name}
                    </TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${(item.revenue / 100).toFixed(2)}
                    </TableCell>
                  </TableRow>
                )) ?? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">No items sold</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
