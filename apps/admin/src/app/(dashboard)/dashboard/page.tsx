import { api } from '@restaurantos/backend';
import { convexClient } from '@/lib/auth/convex-client';
import { Card, CardContent, CardHeader, CardTitle } from '@restaurantos/ui';
import { Store, Users, Zap, DollarSign } from 'lucide-react';

export default async function DashboardPage() {
  const allTenants = await convexClient.query(api.tenants.queries.list, {});
  const tenantCount = allTenants.length;

  const stats = [
    {
      title: 'Total Tenants',
      value: tenantCount,
      icon: Store,
      description: 'Active restaurant clients',
    },
    {
      title: 'Monthly Revenue',
      value: `$${(tenantCount * 249).toLocaleString()}`,
      icon: DollarSign,
      description: 'At $249/mo per client',
    },
    {
      title: 'Delivery Mode',
      value: 'KitchenHub',
      icon: Zap,
      description: 'Primary integration active',
    },
    {
      title: 'System Status',
      value: 'Operational',
      icon: Users,
      description: 'All services healthy',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
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
        ))}
      </div>
    </div>
  );
}
