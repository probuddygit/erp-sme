import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Package, Warehouse as WarehouseIcon, Wallet, AlertTriangle, XCircle,
  Layers, ArrowLeftRight, ClipboardCheck, History, ShoppingCart,
} from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/shared/components/StatCard";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import {
  useItems, useWarehouses, useStockLevels, useStockTransactions, fmtINR, fmtNum, fmtDateTime,
} from "@/features/inventory/api";
import {
  useStockBatches, useCycleCounts, useCreateIndentFromReorder, batchStatus,
} from "@/features/inventory/inventory-api";
import { STATUS_TONES } from "@/features/inventory/data";

export const Route = createFileRoute("/_authenticated/workspace/inventory/")({
  component: InventoryDashboard,
});

function InventoryDashboard() {
  const { data: items = [] } = useItems();
  const { data: warehouses = [] } = useWarehouses();
  const { data: levels = [] } = useStockLevels();
  const { data: txns = [] } = useStockTransactions();
  const { data: batches = [] } = useStockBatches();
  const { data: counts = [] } = useCycleCounts();
  const reorder = useCreateIndentFromReorder();

  const onHand = useMemo(() => {
    const m = new Map<string, { qty: number; value: number }>();
    levels.forEach((l) => {
      const p = m.get(l.item_id) ?? { qty: 0, value: 0 };
      m.set(l.item_id, { qty: p.qty + Number(l.on_hand), value: p.value + Number(l.value) });
    });
    return m;
  }, [levels]);

  const stockValue = levels.reduce((s, l) => s + Number(l.value), 0);
  const lowStock = items.filter((i) => {
    const q = onHand.get(i.id)?.qty ?? 0;
    const min = Number(i.reorder_level ?? i.min_stock ?? 0);
    return min > 0 && q < min;
  });
  const outOfStock = items.filter((i) => (onHand.get(i.id)?.qty ?? 0) === 0);
  const expiring = batches.filter((b) => batchStatus(b) === "expiring");
  const expired = batches.filter((b) => batchStatus(b) === "expired");
  const transfers = txns.filter((t) => t.txn_type === "transfer_out").length;
  const countsDue = counts.filter((c) => c.status !== "completed").length;
  const whUtil = useMemo(() => {
    const m = new Map<string, number>();
    levels.forEach((l) => m.set(l.warehouse_id, (m.get(l.warehouse_id) ?? 0) + Number(l.value)));
    return m;
  }, [levels]);
  const maxWhValue = Math.max(1, ...Array.from(whUtil.values()));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Stock Value"    value={fmtINR(stockValue)}          icon={Wallet}         hint="Across all warehouses" />
        <StatCard label="Items"          value={String(items.length)}        icon={Package}        hint={`${warehouses.filter((w) => w.is_active).length} active WH`} />
        <StatCard label="Low Stock"      value={String(lowStock.length)}     icon={AlertTriangle}  hint="Below reorder level" />
        <StatCard label="Out of Stock"   value={String(outOfStock.length)}   icon={XCircle}        hint="Zero on hand" />
        <StatCard label="Expiring"       value={String(expiring.length)}     icon={Layers}         hint="Batches nearing expiry" />
        <StatCard label="Expired"        value={String(expired.length)}      icon={Layers}         hint="Past expiry" />
        <StatCard label="Transfers"      value={String(transfers)}           icon={ArrowLeftRight} hint="Posted movements" />
        <StatCard label="Counts Due"     value={String(countsDue)}           icon={ClipboardCheck} hint="Scheduled" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Reorder Watchlist
            </CardTitle>
            <Button size="sm" variant="outline" disabled={reorder.isPending} onClick={() => reorder.mutate()}>
              <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Raise Indent
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {lowStock.slice(0, 6).map((i) => {
                const q = onHand.get(i.id)?.qty ?? 0;
                return (
                  <div key={i.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">{i.sku}</div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <div className="font-medium">{fmtNum(q)} {i.unit}</div>
                        <div className="text-xs text-muted-foreground">Reorder {Number(i.reorder_level ?? i.min_stock ?? 0)}</div>
                      </div>
                      <StatusBadge label={q === 0 ? "out of stock" : "low stock"} tone={STATUS_TONES[q === 0 ? "out_of_stock" : "low_stock"]} />
                    </div>
                  </div>
                );
              })}
              {!lowStock.length && <p className="py-4 text-sm text-muted-foreground">All items are above their reorder level.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-blue-600" /> Recent Movements
            </CardTitle>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/workspace/inventory/movement-history">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {txns.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{m.item?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{m.reference_type ?? "manual"} · {m.warehouse?.name ?? "—"} · {fmtDateTime(m.occurred_at)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge label={m.txn_type.replace(/_/g, " ")} tone={Number(m.quantity) >= 0 ? STATUS_TONES.IN : STATUS_TONES.OUT} />
                    <div className="w-16 text-right font-medium">{Number(m.quantity) > 0 ? `+${m.quantity}` : m.quantity}</div>
                  </div>
                </div>
              ))}
              {!txns.length && <p className="py-4 text-sm text-muted-foreground">No stock movements yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <WarehouseIcon className="h-4 w-4 text-emerald-600" /> Warehouse Stock Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {warehouses.filter((w) => w.is_active).map((w) => {
              const val = whUtil.get(w.id) ?? 0;
              const pct = Math.round((val / maxWhValue) * 100);
              return (
                <div key={w.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{w.name}</div>
                    <span className="text-xs text-muted-foreground">{w.code}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className={pct > 80 ? "h-full bg-emerald-500" : pct > 40 ? "h-full bg-blue-500" : "h-full bg-slate-400"} style={{ width: `${Math.max(4, pct)}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>{fmtINR(val)}</span>
                    <span>{levels.filter((l) => l.warehouse_id === w.id).length} SKUs</span>
                  </div>
                </div>
              );
            })}
            {!warehouses.length && <p className="text-sm text-muted-foreground">No warehouses configured yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
