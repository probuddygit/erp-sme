import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Truck,
  Boxes,
  ReceiptText,
  Undo2,
  Wallet,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/sales")({
  component: SalesLayout,
});

const TABS: { path: string; label: string; icon: LucideIcon }[] = [
  { path: "/workspace/sales",                  label: "Overview",          icon: LayoutDashboard },
  { path: "/workspace/sales/quotations",       label: "Quotations",        icon: FileText },
  { path: "/workspace/sales/sales-orders",     label: "Sales Orders",      icon: ClipboardList },
  { path: "/workspace/sales/fulfilment",       label: "Fulfilment",        icon: Boxes },
  { path: "/workspace/sales/delivery-notes",   label: "Delivery Notes",    icon: Truck },
  { path: "/workspace/sales/invoices",         label: "Invoices",          icon: ReceiptText },
  { path: "/workspace/sales/credit-notes",     label: "Credit Notes",      icon: StickyNote },
  { path: "/workspace/sales/returns",          label: "Returns",           icon: Undo2 },
  { path: "/workspace/sales/payments",         label: "Customer Payments", icon: Wallet },
];

function SalesLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <PageHeader
        title="Sales"
        description="Order-to-cash: quotations, orders, deliveries, invoices, returns and receipts."
        breadcrumbs={[{ label: "Workspace" }, { label: "Sales" }]}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.path === "/workspace/sales" ? pathname === t.path : pathname.startsWith(t.path);
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