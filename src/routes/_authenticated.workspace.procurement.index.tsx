import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList, FileQuestion, FileText, ShoppingCart, PackageCheck,
  ReceiptText, Wallet, Undo2, ArrowUpRight, IndianRupee, Clock, AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/shared/components/StatCard";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import {
  ALL_PURCHASE_TX, APPROVAL_TONES, GRNS, PURCHASE_INVOICES, PURCHASE_ORDERS,
  PURCHASE_REQUESTS, RFQS, STATUS_TONES, VENDOR_PAYMENTS, VENDOR_QUOTATIONS,
  VENDOR_RETURNS, formatDate, formatINR,
} from "@/features/procurement/data";

export const Route = createFileRoute("/_authenticated/workspace/procurement/")({
  component: ProcurementOverview,
});

function ProcurementOverview() {
  const invoiceValue = PURCHASE_INVOICES.reduce((s, t) => s + t.grandTotal, 0);
  const payables = PURCHASE_INVOICES.filter((i) => i.status !== "paid").reduce((s, t) => s + t.grandTotal, 0);
  const overdue = PURCHASE_INVOICES.filter((i) => i.status === "overdue").length;
  const pendingApprovals = ALL_PURCHASE_TX.filter((t) => t.approvalStatus === "pending").length;

  const modules: { path: string; label: string; icon: LucideIcon; count: number; value: number }[] = [
    { path: "/workspace/procurement/purchase-requests", label: "Purchase Requests", icon: ClipboardList, count: PURCHASE_REQUESTS.length,  value: PURCHASE_REQUESTS.reduce((s, t) => s + t.grandTotal, 0) },
    { path: "/workspace/procurement/rfqs",              label: "RFQs",              icon: FileQuestion,  count: RFQS.length,               value: RFQS.reduce((s, t) => s + t.grandTotal, 0) },
    { path: "/workspace/procurement/vendor-quotations", label: "Vendor Quotations", icon: FileText,      count: VENDOR_QUOTATIONS.length,  value: VENDOR_QUOTATIONS.reduce((s, t) => s + t.grandTotal, 0) },
    { path: "/workspace/procurement/purchase-orders",   label: "Purchase Orders",   icon: ShoppingCart,  count: PURCHASE_ORDERS.length,    value: PURCHASE_ORDERS.reduce((s, t) => s + t.grandTotal, 0) },
    { path: "/workspace/procurement/grns",              label: "GRN",               icon: PackageCheck,  count: GRNS.length,               value: GRNS.reduce((s, t) => s + t.grandTotal, 0) },
    { path: "/workspace/procurement/purchase-invoices", label: "Purchase Invoices", icon: ReceiptText,   count: PURCHASE_INVOICES.length,  value: invoiceValue },
    { path: "/workspace/procurement/vendor-payments",   label: "Vendor Payments",   icon: Wallet,        count: VENDOR_PAYMENTS.length,    value: VENDOR_PAYMENTS.reduce((s, t) => s + (t.paymentAmount ?? 0), 0) },
    { path: "/workspace/procurement/vendor-returns",    label: "Vendor Returns",    icon: Undo2,         count: VENDOR_RETURNS.length,     value: VENDOR_RETURNS.reduce((s, t) => s + t.grandTotal, 0) },
  ];

  const recent = [...ALL_PURCHASE_TX].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Purchased value"   value={formatINR(invoiceValue)} icon={IndianRupee} trend={{ value: "+9.1% MoM", positive: true }} />
        <StatCard label="Payables"          value={formatINR(payables)}     icon={Clock}       hint={`${PURCHASE_INVOICES.filter(i => i.status !== "paid").length} open bills`} />
        <StatCard label="Overdue"           value={String(overdue)}         icon={AlertCircle} hint="Requires follow-up" />
        <StatCard label="Pending approvals" value={String(pendingApprovals)} icon={FileText}   hint="Across all documents" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
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
            <span className="text-xs text-muted-foreground">Latest across all procurement documents</span>
          </div>
          <div className="divide-y divide-border">
            {recent.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="w-28 shrink-0 font-medium">{t.number}</span>
                <span className="min-w-0 flex-1 truncate">{t.vendor}</span>
                <StatusBadge label={t.status.replace(/_/g, " ")} tone={STATUS_TONES[t.status]} />
                <StatusBadge label={t.approvalStatus} tone={APPROVAL_TONES[t.approvalStatus]} />
                <span className="w-28 text-right text-xs text-muted-foreground">{formatDate(t.date)}</span>
                <span className="w-28 text-right font-medium">{formatINR(t.paymentAmount ?? t.grandTotal)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}