import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Lock, ShoppingCart, LayoutDashboard, Users2, FileText, ClipboardList, Receipt, Kanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/sales")({
  component: SalesLayout,
});

type Tab = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const TABS: Tab[] = [
  { to: "/app/sales", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/app/sales/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/app/sales/customers", label: "Customers", icon: Users2 },
  { to: "/app/sales/quotations", label: "Quotations", icon: FileText },
  { to: "/app/sales/orders", label: "Sales Orders", icon: ClipboardList },
  { to: "/app/sales/invoices", label: "Invoices", icon: Receipt },
];

function SalesLayout() {
  const { canAccessModule, hasModule, company } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (!hasModule("sales")) {
    return (
      <Empty title="Sales is disabled" text={`This module isn't enabled for ${company?.name ?? "your company"}.`}>
        <Button asChild><Link to="/app/company">Open company settings</Link></Button>
      </Empty>
    );
  }
  if (!canAccessModule("sales")) {
    return <Empty title="Access denied" text="Your role doesn't include the Sales module." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div
          className="h-12 w-12 rounded-md flex items-center justify-center"
          style={{ background: "var(--gradient-accent)" }}
        >
          <ShoppingCart className="h-6 w-6 text-accent-foreground" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Module</div>
          <h1 className="text-3xl font-bold tracking-tight">Sales &amp; CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Leads, quotations, sales orders, GST invoices &amp; payments.
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
                to={t.to as string}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  active
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
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
