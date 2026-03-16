'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@restaurantos/ui';
import { Store, DollarSign, ShoppingBag, Activity, Plus, ArrowRight, TrendingUp } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function DashboardPage() {
  const allTenants = useQuery(api.tenants.queries.list, {});
  const health = useQuery(api.admin.queries.getSystemHealth, {});
  const tenantAnalytics = useQuery(api.admin.queries.getTenantAnalytics, {});

  const tenantCount = allTenants?.length ?? 0;

  const stats = [
    {
      title: 'Active Tenants',
      value: String(health?.activeTenants ?? 0),
      subtitle: `${tenantCount} total`,
      icon: Store,
      color: 'from-blue-500/10 to-blue-600/5',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Monthly Orders',
      value: String(health?.monthOrders ?? 0),
      subtitle: 'This month',
      icon: ShoppingBag,
      color: 'from-purple-500/10 to-purple-600/5',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Monthly Revenue',
      value: `$${((health?.monthRevenueCents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      subtitle: 'Across all tenants',
      icon: DollarSign,
      color: 'from-emerald-500/10 to-emerald-600/5',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Webhook Health',
      value: `${health?.webhookSuccessRate ?? 100}%`,
      subtitle: 'Success rate (last 100)',
      icon: Activity,
      color: (health?.webhookSuccessRate ?? 100) >= 95
        ? 'from-green-500/10 to-green-600/5'
        : 'from-red-500/10 to-red-600/5',
      iconColor: (health?.webhookSuccessRate ?? 100) >= 95
        ? 'text-green-600'
        : 'text-red-600',
    },
  ];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold tracking-tight" data-display="true">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Platform overview and metrics
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <div className={`rounded-2xl border border-border/60 bg-gradient-to-br ${stat.color} p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 shadow-sm ${stat.iconColor}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight" data-display="true">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Plan Distribution */}
      {health?.planCounts && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                {Object.entries(health.planCounts).map(([plan, count]) => (
                  <div key={plan} className="text-center">
                    <p className="text-2xl font-bold">{count as number}</p>
                    <p className="text-xs text-muted-foreground capitalize">{plan}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Revenue by Tenant */}
      {tenantAnalytics && tenantAnalytics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Revenue by Tenant (This Month)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tenantAnalytics.slice(0, 10).map((t: any) => {
                  const maxRevenue = tenantAnalytics[0]?.revenueCents ?? 1;
                  const pct = maxRevenue > 0 ? (t.revenueCents / maxRevenue) * 100 : 0;
                  return (
                    <div key={t._id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <Link
                          href={`/tenants/${t._id}`}
                          className="font-medium hover:underline"
                        >
                          {t.name}
                        </Link>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-xs">
                            {t.orderCount} orders
                          </span>
                          <span className="font-medium">
                            ${(t.revenueCents / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/tenants/new">
            <div className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/30 cursor-pointer">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Plus className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">New Tenant</p>
                <p className="text-sm text-muted-foreground">Onboard a restaurant</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
          </Link>
          <Link href="/tenants">
            <div className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/30 cursor-pointer">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Store className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Manage Tenants</p>
                <p className="text-sm text-muted-foreground">{tenantCount} clients</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
          </Link>
          <Link href="/audit-logs">
            <div className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/30 cursor-pointer">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Activity className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Audit Logs</p>
                <p className="text-sm text-muted-foreground">View system activity</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
