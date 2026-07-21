import { createFileRoute } from "@tanstack/react-router";
import {
  Package, Warehouse as WarehouseIcon, Wallet, AlertTriangle, XCircle,
  Layers, ArrowLeftRight, ClipboardCheck, TrendingUp, History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/shared/components/StatCard";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import {
  DASHBOARD, ITEMS, LEDGER, WAREHOUSES, STATUS_TONES,
  formatINR, formatNum, formatDate, itemStockStatus,
} from "@/features/inventory/data";

export const Route = createFileRoute("/_authenticated/workspace/inventory/")({
  component: InventoryDashboard,
});

function InventoryDashboard() {
  const lowStock = ITEMS.filter((i) => itemStockStatus(i) !== "in_stock").slice(0, 6);
  const recentMoves = LEDGER.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Stock Value"    value={formatINR(DASHBOARD.stockValue)} icon={Wallet} hint="Across all warehouses" />
        <StatCard label="Items"          value={DASHBOARD.totalItems}            icon={Package} hint={`${DASHBOARD.totalWarehouses} active WH`} />
        <StatCard label="Low Stock"      value={DASHBOARD.lowStock}              icon={AlertTriangle} hint="Below reorder level" />
        <StatCard label="Out of Stock"   value={DASHBOARD.outOfStock}            icon={XCircle} hint="Zero on hand" />
        <StatCard label="Expiring"       value={DASHBOARD.expiringBatches}       icon={Layers} hint="Batches nearing expiry" />
        <StatCard label="Expired"        value={DASHBOARD.expiredBatches}        icon={Layers} hint="Past expiry" />
        <StatCard label="Transfers Open" value={DASHBOARD.pendingTransfers}      icon={ArrowLeftRight} hint="Not yet posted" />
        <StatCard label="Counts Due"     value={DASHBOARD.cycleCountsDue}        icon={ClipboardCheck} hint="Scheduled" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Reorder Watchlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {lowStock.map((i) => (
                <div key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{i.code} · {i.warehouse}</div>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <div className="font-medium">{formatNum(i.onHand)} {i.uom}</div>
                      <div className="text-xs text-muted-foreground">Reorder {i.reorder}</div>
                    </div>
                    <StatusBadge label={itemStockStatus(i).replace(/_/g, " ")} tone={STATUS_TONES[itemStockStatus(i)]} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-blue-600" /> Recent Movements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {recentMoves.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{m.itemName}</div>
                    <div className="text-xs text-muted-foreground">{m.docNo} · {m.warehouse} · {formatDate(m.date)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge label={m.moveType} tone={STATUS_TONES[m.moveType]} />
                    <div className="w-16 text-right font-medium">{m.qty > 0 ? `+${m.qty}` : m.qty}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <WarehouseIcon className="h-4 w-4 text-emerald-600" /> Warehouse Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WAREHOUSES.filter((w) => w.status === "active").map((w) => (
              <div key={w.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{w.name}</div>
                  <span className="text-xs text-muted-foreground">{w.city}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      w.utilization > 80 ? "h-full bg-rose-500" :
                      w.utilization > 60 ? "h-full bg-amber-500" : "h-full bg-emerald-500"
                    }
                    style={{ width: `${w.utilization}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>{w.utilization}% used</span>
                  <span>{w.bins} bins · {formatNum(w.capacity)} cap</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><TrendingUp className="h-5 w-5 text-blue-600" /><div><div className="text-sm font-medium">Stock Aging</div><div className="text-xs text-muted-foreground">Break down by age buckets</div></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Wallet className="h-5 w-5 text-emerald-600" /><div><div className="text-sm font-medium">Valuation</div><div className="text-xs text-muted-foreground">FIFO / Weighted Avg</div></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><ClipboardCheck className="h-5 w-5 text-violet-600" /><div><div className="text-sm font-medium">Cycle Counts</div><div className="text-xs text-muted-foreground">{DASHBOARD.cycleCountsDue} scheduled</div></div></CardContent></Card>
      </div>
    </div>
  );
}
