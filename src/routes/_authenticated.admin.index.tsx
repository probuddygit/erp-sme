import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StatCard } from "@/shared/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerFn } from "@tanstack/react-start";
import {
  getPlatformDashboardMetrics,
  getSystemHealth,
} from "@/features/admin-platform/admin-platform.functions";
import {
  Building2,
  Users,
  IndianRupee,
  TrendingUp,
  Activity,
  Receipt,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

const dummyChart = [
  { month: "Jan", revenue: 12000 },
  { month: "Feb", revenue: 19000 },
  { month: "Mar", revenue: 15000 },
  { month: "Apr", revenue: 22000 },
  { month: "May", revenue: 28000 },
  { month: "Jun", revenue: 32000 },
];

function AdminDashboard() {
  const fetchMetrics = useServerFn(getPlatformDashboardMetrics);
  const fetchHealth = useServerFn(getSystemHealth);
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getPlatformDashboardMetrics>> | null>(null);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof getSystemHealth>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMetrics(), fetchHealth()])
      .then(([m, h]) => {
        setMetrics(m);
        setHealth(h);
      })
      .catch((e) => console.error("Failed to load dashboard", e))
      .finally(() => setLoading(false));
  }, [fetchMetrics, fetchHealth]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tenants"
          value={metrics?.tenantCount ?? 0}
          icon={Building2}
          hint={loading ? undefined : `${metrics?.trialCount ?? 0} in trial`}
        />
        <StatCard
          label="Total Users"
          value={metrics?.userCount ?? 0}
          icon={Users}
          hint={loading ? undefined : `${health?.logins24h ?? 0} logins today`}
        />
        <StatCard
          label="Monthly Recurring Revenue"
          value={formatCurrency(metrics?.mrr ?? 0, "INR")}
          icon={IndianRupee}
          trend={{ value: "+12% vs last month", positive: true }}
        />
        <StatCard
          label="Open Invoices"
          value={formatCurrency(metrics?.openInvoiceAmount ?? 0, "INR")}
          icon={Receipt}
          hint={loading ? undefined : `${metrics?.openInvoiceCount ?? 0} invoices`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dummyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(v) => `₹${v / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sign-ups (7d)</span>
                  <span className="font-medium">{health?.signups7d ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active tenants</span>
                  <span className="font-medium">{health?.activeCompanies ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total companies</span>
                  <span className="font-medium">{health?.totalCompanies ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total users</span>
                  <span className="font-medium">{health?.totalUsers ?? 0}</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Recent events</div>
                  <div className="space-y-2">
                    {(health?.recentAudit ?? []).slice(0, 5).map((a: any) => (
                      <div key={a.id} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{a.action}</span>
                        <span className="mx-1">·</span>
                        {new Date(a.created_at).toLocaleString()}
                      </div>
                    ))}
                    {(health?.recentAudit ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground">No recent events</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Platform Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            This dashboard gives a high-level view of the multi-tenant platform. Use the sidebar to manage tenants, users, subscriptions, billing, and system health.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
