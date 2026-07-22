import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ListTree, BookOpen, Wallet, HandCoins, ArrowLeftRight, FileMinus, FilePlus,
  BookOpenCheck, Scale, PieChart, TrendingUp, Landmark, ArrowUpRight, IndianRupee,
  Clock, AlertCircle, type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/shared/components/StatCard";
import { StatusBadge } from "@/features/finance/components/StatusBadge";
import {
  ALL_ENTRIES, CHART_OF_ACCOUNTS, CREDIT_NOTES, CONTRA_ENTRIES, DEBIT_NOTES,
  JOURNAL_ENTRIES, PAYMENTS, RECEIPTS, STATUS_TONES, accountBalance,
  formatDate, formatINR,
} from "@/features/finance/data";

export const Route = createFileRoute("/_authenticated/workspace/finance/")({
  component: FinanceOverview,
});

function FinanceOverview() {
  const cash = accountBalance("1110") + accountBalance("1120") + accountBalance("1121");
  const receivables = accountBalance("1200");
  const payables = -accountBalance("2110");
  const gstPayable = -accountBalance("2120") - accountBalance("1400");
  const pending = ALL_ENTRIES.filter((e) => e.approvalStatus === "pending").length;

  const modules: { path: string; label: string; icon: LucideIcon; count: number }[] = [
    { path: "/workspace/finance/chart-of-accounts", label: "Chart of Accounts", icon: ListTree,       count: CHART_OF_ACCOUNTS.filter((a) => !a.isGroup).length },
    { path: "/workspace/finance/journal-entries",   label: "Journal Entries",   icon: BookOpen,       count: JOURNAL_ENTRIES.length },
    { path: "/workspace/finance/payments",          label: "Payments",          icon: Wallet,         count: PAYMENTS.length },
    { path: "/workspace/finance/receipts",          label: "Receipts",          icon: HandCoins,      count: RECEIPTS.length },
    { path: "/workspace/finance/contra",            label: "Contra",            icon: ArrowLeftRight, count: CONTRA_ENTRIES.length },
    { path: "/workspace/finance/credit-notes",      label: "Credit Notes",      icon: FileMinus,      count: CREDIT_NOTES.length },
    { path: "/workspace/finance/debit-notes",       label: "Debit Notes",       icon: FilePlus,       count: DEBIT_NOTES.length },
    { path: "/workspace/finance/general-ledger",    label: "General Ledger",    icon: BookOpenCheck,  count: 0 },
    { path: "/workspace/finance/trial-balance",     label: "Trial Balance",     icon: Scale,          count: 0 },
    { path: "/workspace/finance/balance-sheet",     label: "Balance Sheet",     icon: Landmark,       count: 0 },
    { path: "/workspace/finance/profit-loss",       label: "Profit & Loss",     icon: PieChart,       count: 0 },
    { path: "/workspace/finance/cash-flow",         label: "Cash Flow",         icon: TrendingUp,     count: 0 },
  ];

  const recent = [...ALL_ENTRIES].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cash & bank" value={formatINR(cash)} icon={IndianRupee} trend={{ value: "+4.2% MoM", positive: true }} />
        <StatCard label="Receivables" value={formatINR(receivables)} icon={Clock} hint="Outstanding from customers" />
        <StatCard label="Payables"    value={formatINR(payables)}    icon={AlertCircle} hint="Due to vendors" />
        <StatCard label="Pending approvals" value={String(pending)} icon={BookOpen} hint={`Net GST due ${formatINR(gstPayable)}`} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.path}
              to={m.path}
              className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <div className="mt-3 text-sm font-medium">{m.label}</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{m.count > 0 ? m.count : "—"}</div>
              <div className="mt-1 text-xs text-muted-foreground">{m.count > 0 ? "records" : "report"}</div>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent vouchers</h3>
            <span className="text-xs text-muted-foreground">Latest across all finance documents</span>
          </div>
          <div className="divide-y divide-border">
            {recent.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="w-32 shrink-0 font-medium">{e.number}</span>
                <span className="min-w-0 flex-1 truncate">{e.narration}</span>
                <StatusBadge label={e.status} tone={STATUS_TONES[e.status]} />
                <span className="w-28 text-right text-xs text-muted-foreground">{formatDate(e.date)}</span>
                <span className="w-28 text-right font-medium">{formatINR(Math.max(e.totalDebit, e.totalCredit))}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}