import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/shared/components/PageHeader";
import { StatCard } from "@/shared/components/StatCard";
import { useAuth } from "@/lib/auth-context";
import { modulesForRoles } from "@/shared/modules";
import { TrendingUp, Package, Users2, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, company, roles, isSuperAdmin } = useAuth();
  const modules = modulesForRoles(roles, isSuperAdmin).filter((m) => m.key !== "dashboard");
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={company ? `${company.name} · Head Office · FY 2025-26` : "Platform overview"}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue MTD" value="—" icon={TrendingUp} />
        <StatCard label="Open Orders" value="—" icon={Package} />
        <StatCard label="Active Customers" value="—" icon={Users2} />
        <StatCard label="Cash Position" value="—" icon={Wallet} />
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Modules</h2>
          <span className="text-xs text-muted-foreground">
            {modules.length} available to you
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.key}
                to={m.path}
                className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium tracking-tight">{m.label}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}