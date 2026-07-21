import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, Warehouse, Grid3x3, BookOpen, ArrowLeftRight,
  Sliders, PlayCircle, ClipboardCheck, Layers, Hash, QrCode,
  TrendingUp, Wallet, History, type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/inventory")({
  component: InventoryLayout,
});

const TABS: { path: string; label: string; icon: LucideIcon }[] = [
  { path: "/workspace/inventory",                    label: "Dashboard",         icon: LayoutDashboard },
  { path: "/workspace/inventory/items",              label: "Items",             icon: Package },
  { path: "/workspace/inventory/warehouses",         label: "Warehouses",        icon: Warehouse },
  { path: "/workspace/inventory/bins",               label: "Bins",              icon: Grid3x3 },
  { path: "/workspace/inventory/stock-ledger",       label: "Stock Ledger",      icon: BookOpen },
  { path: "/workspace/inventory/stock-transfer",     label: "Stock Transfer",    icon: ArrowLeftRight },
  { path: "/workspace/inventory/stock-adjustment",   label: "Stock Adjustment",  icon: Sliders },
  { path: "/workspace/inventory/opening-stock",      label: "Opening Stock",     icon: PlayCircle },
  { path: "/workspace/inventory/cycle-count",        label: "Cycle Count",       icon: ClipboardCheck },
  { path: "/workspace/inventory/batch-numbers",      label: "Batches",           icon: Layers },
  { path: "/workspace/inventory/serial-numbers",     label: "Serial Numbers",    icon: Hash },
  { path: "/workspace/inventory/barcode",            label: "Barcode",           icon: QrCode },
  { path: "/workspace/inventory/stock-aging",        label: "Stock Aging",       icon: TrendingUp },
  { path: "/workspace/inventory/inventory-valuation",label: "Valuation",         icon: Wallet },
  { path: "/workspace/inventory/movement-history",   label: "Movement History",  icon: History },
];

function InventoryLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Multi-warehouse stock control with batches, serials, aging, valuation & cycle counts."
        breadcrumbs={[{ label: "Workspace" }, { label: "Inventory" }]}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.path === "/workspace/inventory" ? pathname === t.path : pathname.startsWith(t.path);
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
