import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ListTree, BookOpen, Wallet, HandCoins, ArrowLeftRight,
  FileMinus, FilePlus, BookOpenCheck, Scale, PieChart, TrendingUp, Landmark,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/finance")({
  component: FinanceLayout,
});

const TABS: { path: string; label: string; icon: LucideIcon; group: string }[] = [
  { path: "/workspace/finance",                      label: "Overview",           icon: LayoutDashboard, group: "Overview" },
  { path: "/workspace/finance/chart-of-accounts",    label: "Chart of Accounts",  icon: ListTree,        group: "Masters" },
  { path: "/workspace/finance/journal-entries",      label: "Journal Entry",      icon: BookOpen,        group: "Vouchers" },
  { path: "/workspace/finance/payments",             label: "Payments",           icon: Wallet,          group: "Vouchers" },
  { path: "/workspace/finance/receipts",             label: "Receipts",           icon: HandCoins,       group: "Vouchers" },
  { path: "/workspace/finance/contra",               label: "Contra",             icon: ArrowLeftRight,  group: "Vouchers" },
  { path: "/workspace/finance/credit-notes",         label: "Credit Note",        icon: FileMinus,       group: "Vouchers" },
  { path: "/workspace/finance/debit-notes",          label: "Debit Note",         icon: FilePlus,        group: "Vouchers" },
  { path: "/workspace/finance/general-ledger",       label: "General Ledger",     icon: BookOpenCheck,   group: "Reports" },
  { path: "/workspace/finance/trial-balance",        label: "Trial Balance",      icon: Scale,           group: "Reports" },
  { path: "/workspace/finance/balance-sheet",        label: "Balance Sheet",      icon: Landmark,        group: "Reports" },
  { path: "/workspace/finance/profit-loss",          label: "Profit & Loss",      icon: PieChart,        group: "Reports" },
  { path: "/workspace/finance/cash-flow",            label: "Cash Flow",          icon: TrendingUp,      group: "Reports" },
];

function FinanceLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <PageHeader
        title="Finance & Accounting"
        description="Double-entry books: vouchers, ledgers and statutory financial statements."
        breadcrumbs={[{ label: "Workspace" }, { label: "Finance" }]}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.path === "/workspace/finance" ? pathname === t.path : pathname.startsWith(t.path);
          const Icon = t.icon;
          return (
            <Link
              key={t.path}
              to={t.path}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}