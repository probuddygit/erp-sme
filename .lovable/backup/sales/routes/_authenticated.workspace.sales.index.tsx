import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText,
  ClipboardList,
  Truck,
  ReceiptText,
  Undo2,
  Wallet,
  ArrowUpRight,
  IndianRupee,
  Clock,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/shared/components/StatCard";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import {
  ALL_TX,
  APPROVAL_TONES,
  DELIVERY_NOTES,
  INVOICES,
  PAYMENTS,
  QUOTATIONS,
  RETURNS,
  SALES_ORDERS,
  STATUS_TONES,
  formatDate,
  formatINR,
} from "@/features/sales/data";

export const Route = createFileRoute("/_authenticated/workspace/sales/")({
  component: SalesOverview,
});

function SalesOverview() {
  const invoiceValue = INVOICES.reduce((s, t) => s + t.grandTotal, 0);
  const outstanding = INVOICES.filter((i) => i.status !== "paid").reduce((s, t) => s + t.grandTotal, 0);
  const overdue = INVOICES.filter((i) => i.status === "overdue").length;
  const pendingApprovals = ALL_TX.filter((t) => t.approvalStatus === "pending").length;

  const modules: { path: string; label: string; icon: LucideIcon; count: number; value: number }[] = [
    { path: "/workspace/sales/quotations",     label: "Quotations",        icon: FileText,      count: QUOTATIONS.length,     value: QUOTATIONS.reduce((s, t) => s + t.grandTotal, 0) },
    { path: "/workspace/sales/sales-orders",   label: "Sales Orders",      icon: ClipboardList, count: SALES_ORDERS.length,   value: SALES_ORDERS.reduce((s, t) => s + t.grandTotal, 0) },
    { path: "/workspace/sales/delivery-notes", label: "Delivery Notes",    icon: Truck,         count: DELIVERY_NOTES.length, value: DELIVERY_NOTES.reduce((s, t) => s + t.grandTotal, 0) },
    { path: "/workspace/sales/invoices",       label: "Invoices",          icon: ReceiptText,   count: INVOICES.length,       value: invoiceValue },
    { path: "/workspace/sales/returns",        label: "Returns",           icon: Undo2,         count: RETURNS.length,        value: RETURNS.reduce((s, t) => s + t.grandTotal, 0) },
    { path: "/workspace/sales/payments",       label: "Customer Payments", icon: Wallet,        count: PAYMENTS.length,       value: PAYMENTS.reduce((s, t) => s + (t.paymentAmount ?? 0), 0) },
  ];

  const recent = [...ALL_TX].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Invoiced value" value={formatINR(invoiceValue)} icon={IndianRupee} trend={{ value: "+12.4% MoM", positive: true }} />
        <StatCard label="Outstanding"    value={formatINR(outstanding)}  icon={Clock}       hint={`${INVOICES.filter(i => i.status !== "paid").length} open invoices`} />
        <StatCard label="Overdue"        value={String(overdue)}         icon={AlertCircle} hint="Requires follow-up" />
        <StatCard label="Pending approvals" value={String(pendingApprovals)} icon={FileText} hint="Across all documents" />
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
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <div className="mt-3 text-sm font-medium">{m.label}</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">{m.count}</div>
              <div className="mt-1 text-xs text-muted-foreground">{formatINR(m.value)} total</div>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent activity</h3>
            <span className="text-xs text-muted-foreground">Latest across all sales documents</span>
          </div>
          <div className="divide-y divide-border">
            {recent.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="w-24 shrink-0 font-medium">{t.number}</span>
                <span className="min-w-0 flex-1 truncate">{t.customer}</span>
                <StatusBadge label={t.status.replace(/_/g, " ")} tone={STATUS_TONES[t.status]} />
                <StatusBadge label={t.approvalStatus} tone={APPROVAL_TONES[t.approvalStatus]} />
                <span className="w-28 text-right text-xs text-muted-foreground">{formatDate(t.date)}</span>
                <span className="w-28 text-right font-medium">{formatINR(t.grandTotal)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}