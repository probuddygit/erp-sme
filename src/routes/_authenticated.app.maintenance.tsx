import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Lock, Wrench, LayoutDashboard, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/maintenance")({
  component: MaintenanceLayout,
});

type Tab = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const TABS: Tab[] = [
  { to: "/app/maintenance", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/app/maintenance/machines", label: "Machines", icon: HardDrive },
];

function MaintenanceLayout() {
  const { canAccessModule, hasModule, company } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (!hasModule("maintenance")) {
    return (
      <Empty title="Maintenance is disabled" text={`This module isn't enabled for ${company?.name ?? "your company"}.`}>
        <Button asChild><Link to="/app">Back to dashboard</Link></Button>
      </Empty>
    );
  }
  if (!canAccessModule("maintenance")) {
    return <Empty title="Access denied" text="Your role doesn't include the Maintenance module." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-md flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
          <Wrench className="h-6 w-6 text-accent-foreground" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Module</div>
          <h1 className="text-3xl font-bold tracking-tight">Smart Maintenance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Machine master, preventive scheduling, breakdowns, spare parts &amp; technician productivity.
          </p>
        </div>
      </div>

      <div className="border-b border-border">
        <nav className="flex flex-wrap gap-1 -mb-px">
          {TABS.map((t) => {
            const active = t.exact ? path === t.to : path.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  active ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}

function Empty({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-md">
      <div className="h-12 w-12 rounded-md flex items-center justify-center bg-muted">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}