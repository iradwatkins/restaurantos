'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@restaurantos/ui';
import { ShoppingBag, DollarSign, ChefHat, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function PortalDashboardPage() {
  const { tenantId } = useTenant();

  const dailySales = useQuery(
    api.reports.queries.getDailySales,
    tenantId ? { tenantId, days: 1 } : 'skip'
  );
  const activeOrders = useQuery(
    api.orders.queries.getActiveOrders,
    tenantId ? { tenantId } : 'skip'
  );
  const kdsTickets = useQuery(
    api.kds.queries.getActiveTickets,
    tenantId ? { tenantId } : 'skip'
  );

  const today = dailySales?.[0];
  const todayRevenue = today?.totalRevenue ?? 0;
  const todayOrders = today?.orderCount ?? 0;
  const activeCount = activeOrders?.length ?? 0;
  const kdsCount = kdsTickets?.length ?? 0;

  const stats = [
    {
      title: "Today's Orders",
      value: String(todayOrders),
      icon: ShoppingBag,
      description: `${activeCount} active right now`,
      href: '/orders',
    },
    {
      title: "Today's Revenue",
      value: `$${(todayRevenue / 100).toFixed(2)}`,
      icon: DollarSign,
      description: todayOrders > 0 ? `Avg $${(todayRevenue / todayOrders / 100).toFixed(2)}` : 'No orders yet',
      href: '/reports',
    },
    {
      title: 'Kitchen Queue',
      value: String(kdsCount),
      icon: ChefHat,
      description: kdsCount > 0 ? 'Tickets in queue' : 'Kitchen clear',
      href: '/kds',
    },
    {
      title: 'Channels',
      value: String(Object.keys(today?.bySource ?? {}).length),
      icon: TrendingUp,
      description: Object.keys(today?.bySource ?? {}).length > 0
        ? Object.keys(today?.bySource ?? {}).map(s => s.replace('_', ' ')).join(', ')
        : 'No activity today',
      href: '/reports',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Restaurant overview and daily metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/orders">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">New Dine-In Order</p>
                <p className="text-sm text-muted-foreground">Open POS terminal</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/kds">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <ChefHat className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">Kitchen Display</p>
                <span className="text-sm text-muted-foreground">
                  {kdsCount > 0 ? (
                    <Badge variant="destructive" className="text-xs">{kdsCount} tickets</Badge>
                  ) : 'All clear'}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/menu">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">Menu Management</p>
                <p className="text-sm text-muted-foreground">Edit items and pricing</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
