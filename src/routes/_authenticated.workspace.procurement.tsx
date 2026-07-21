import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ClipboardList, FileQuestion, FileText, ShoppingCart,
  PackageCheck, ReceiptText, Wallet, Undo2, type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/procurement")({
  component: ProcurementLayout,
});

const TABS: { path: string; label: string; icon: LucideIcon }[] = [
  { path: "/workspace/procurement",                    label: "Overview",           icon: LayoutDashboard },
  { path: "/workspace/procurement/purchase-requests",  label: "Purchase Requests",  icon: ClipboardList },
  { path: "/workspace/procurement/rfqs",               label: "RFQs",               icon: FileQuestion },
  { path: "/workspace/procurement/vendor-quotations",  label: "Vendor Quotations",  icon: FileText },
  { path: "/workspace/procurement/purchase-orders",    label: "Purchase Orders",    icon: ShoppingCart },
  { path: "/workspace/procurement/grns",               label: "GRN",                icon: PackageCheck },
  { path: "/workspace/procurement/purchase-invoices",  label: "Purchase Invoices",  icon: ReceiptText },
  { path: "/workspace/procurement/vendor-payments",    label: "Vendor Payments",    icon: Wallet },
  { path: "/workspace/procurement/vendor-returns",     label: "Vendor Returns",     icon: Undo2 },
];

function ProcurementLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <PageHeader
        title="Procurement"
        description="Procure-to-pay: requests, RFQs, vendor quotes, POs, receipts, invoices, payments & returns."
        breadcrumbs={[{ label: "Workspace" }, { label: "Procurement" }]}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.path === "/workspace/procurement" ? pathname === t.path : pathname.startsWith(t.path);
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