import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { BarChart3, LayoutDashboard, TrendingUp, Truck, Boxes, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/reports")({
  component: ReportsLayout,
});

const TABS = [
  { to: "/app/reports", label: "Executive", icon: LayoutDashboard, exact: true },
  { to: "/app/reports/sales", label: "Sales Analytics", icon: TrendingUp },
  { to: "/app/reports/procurement", label: "Procurement", icon: Truck },
  { to: "/app/reports/inventory", label: "Inventory", icon: Boxes },
];

function ReportsLayout() {
  const { isCompanyAdmin, roles, isSuperAdmin } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const allowed = isSuperAdmin || isCompanyAdmin || roles.includes("finance") || roles.includes("sales") || roles.includes("procurement");
  if (!allowed) {
    return (
      <div className="max-w-md">
        <div className="h-12 w-12 rounded-md flex items-center justify-center bg-muted"><Lock className="h-5 w-5 text-muted-foreground" /></div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">Reports are available to admins, finance, sales and procurement roles.</p>
      </div>
    );
  }
  // Filter tabs based on role
  const visibleTabs = TABS.filter((t) => {
    if (isSuperAdmin || isCompanyAdmin || roles.includes("finance")) return true;
    if (t.to.endsWith("/sales")) return roles.includes("sales");
    if (t.to.endsWith("/procurement") || t.to.endsWith("/inventory")) return roles.includes("procurement");
    return roles.includes("sales") || roles.includes("procurement");
  });
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-md flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
          <BarChart3 className="h-6 w-6 text-accent-foreground" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Module</div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Dashboards</h1>
          <p className="text-sm text-muted-foreground mt-1">Executive insights — live P&L, revenue trends, cost mix and operational analytics.</p>
        </div>
      </div>
      <div className="border-b border-border">
        <nav className="flex flex-wrap gap-1 -mb-px">
          {visibleTabs.map((t) => {
            const active = t.exact ? path === t.to : path.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to} className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                active ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border")}>
                <t.icon className="h-4 w-4" />{t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}