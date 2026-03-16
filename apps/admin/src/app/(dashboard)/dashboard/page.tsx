'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Store, DollarSign, Zap, Activity, Plus, ArrowRight } from 'lucide-react';

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
  const tenantCount = allTenants?.length ?? 0;

  const stats = [
    {
      title: 'Total Tenants',
      value: String(tenantCount),
      icon: Store,
      description: 'Active restaurant clients',
      color: 'from-blue-500/10 to-blue-600/5',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Monthly Revenue',
      value: `$${(tenantCount * 249).toLocaleString()}`,
      icon: DollarSign,
      description: 'At $249/mo per client',
      color: 'from-emerald-500/10 to-emerald-600/5',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Delivery Mode',
      value: 'KitchenHub',
      icon: Zap,
      description: 'Primary integration active',
      color: 'from-amber-500/10 to-amber-600/5',
      iconColor: 'text-amber-600',
    },
    {
      title: 'System Status',
      value: 'Operational',
      icon: Activity,
      description: 'All services healthy',
      color: 'from-green-500/10 to-green-600/5',
      iconColor: 'text-green-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
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
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <h2 className="text-lg font-bold mb-4" data-display="true">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/tenants/new">
            <div className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Plus className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">New Tenant</p>
                <p className="text-sm text-muted-foreground">Onboard a new restaurant client</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
          </Link>
          <Link href="/tenants">
            <div className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Store className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Manage Tenants</p>
                <p className="text-sm text-muted-foreground">{tenantCount} active clients</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Tenants Preview */}
      {allTenants && allTenants.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" data-display="true">Recent Tenants</h2>
            <Link href="/tenants" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-3">
            {allTenants.slice(0, 5).map((tenant) => (
              <Link key={tenant._id} href={`/tenants/${tenant._id}`}>
                <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 transition-all duration-200 hover:shadow-sm hover:border-primary/20">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                    style={{ backgroundColor: tenant.primaryColor || '#6366f1' }}
                  >
                    {tenant.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tenant.subdomain}.restaurants.irawatkins.com
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    {tenant.status}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground capitalize">
                    {tenant.plan}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
