import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Lock, Wallet, LayoutDashboard, BookOpen, ListTree, FileBarChart2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/finance")({
  component: FinanceLayout,
});

const TABS = [
  { to: "/app/finance", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/app/finance/ledger", label: "General Ledger", icon: BookOpen },
  { to: "/app/finance/accounts", label: "Chart of Accounts", icon: ListTree },
  { to: "/app/finance/reports", label: "P&L · Balance Sheet", icon: FileBarChart2 },
  { to: "/app/finance/gst", label: "GST", icon: Receipt },
];

function FinanceLayout() {
  const { canAccessModule, hasModule, company } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (!hasModule("finance")) {
    return (
      <Empty title="Finance is disabled" text={`This module isn't enabled for ${company?.name ?? "your company"}.`}>
        <Button asChild><Link to="/app">Back to dashboard</Link></Button>
      </Empty>
    );
  }
  if (!canAccessModule("finance")) return <Empty title="Access denied" text="Your role doesn't include the Finance module." />;
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-md flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
          <Wallet className="h-6 w-6 text-accent-foreground" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Module</div>
          <h1 className="text-3xl font-bold tracking-tight">Finance & Accounting</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time ledger, AR/AP, GST and financial reports — auto-posted from every module.</p>
        </div>
      </div>
      <div className="border-b border-border">
        <nav className="flex flex-wrap gap-1 -mb-px">
          {TABS.map((t) => {
            const active = t.exact ? path === t.to : path.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to as string} className={cn(
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

function Empty({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-md">
      <div className="h-12 w-12 rounded-md flex items-center justify-center bg-muted"><Lock className="h-5 w-5 text-muted-foreground" /></div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}