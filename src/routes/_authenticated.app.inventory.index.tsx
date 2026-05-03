import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Warehouse, AlertTriangle, IndianRupee, ArrowLeftRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/inventory/")({
  component: InventoryOverview,
});

type Item = { id: string; sku: string; name: string; item_type: string; unit: string; min_stock: number };
type Level = { item_id: string; warehouse_id: string; on_hand: number; value: number };

function InventoryOverview() {
  const { company } = useAuth();

  const { data } = useQuery({
    enabled: !!company?.id,
    queryKey: ["inv-overview", company?.id],
    queryFn: async () => {
      const [items, whs, levels, txns] = await Promise.all([
        supabase.from("items").select("*").eq("company_id", company!.id),
        supabase.from("warehouses").select("id, name").eq("company_id", company!.id),
        supabase.rpc("item_stock_levels", { _company_id: company!.id }),
        supabase.from("stock_transactions").select("id, item_id, txn_type, quantity, occurred_at, total_value")
          .eq("company_id", company!.id).order("occurred_at", { ascending: false }).limit(8),
      ]);
      return {
        items: (items.data ?? []) as Item[],
        warehouses: whs.data ?? [],
        levels: (levels.data ?? []) as Level[],
        txns: txns.data ?? [],
      };
    },
  });

  const items = data?.items ?? [];
  const levels = data?.levels ?? [];
  const totals = items.map((it) => {
    const oh = levels.filter((l) => l.item_id === it.id).reduce((s, l) => s + Number(l.on_hand), 0);
    const v = levels.filter((l) => l.item_id === it.id).reduce((s, l) => s + Number(l.value), 0);
    return { ...it, on_hand: oh, value: v, low: oh < Number(it.min_stock) };
  });
  const totalValue = totals.reduce((s, t) => s + t.value, 0);
  const lowItems = totals.filter((t) => t.low && Number(t.min_stock) > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Items" value={String(items.length)} icon={Package} />
        <StatCard label="Warehouses" value={String(data?.warehouses.length ?? 0)} icon={Warehouse} />
        <StatCard label="Inventory value" value={`₹${totalValue.toFixed(2)}`} icon={IndianRupee} highlight />
        <StatCard label="Low stock" value={String(lowItems.length)} icon={AlertTriangle} warn={lowItems.length > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Low stock alerts</CardTitle>
            <Button asChild size="sm" variant="outline"><Link to="/app/inventory/items">All items</Link></Button>
          </CardHeader>
          <CardContent>
            {lowItems.length ? (
              <div className="space-y-2">
                {lowItems.slice(0, 8).map((it) => (
                  <div key={it.id} className="flex items-center justify-between p-2 rounded-md border border-border">
                    <div>
                      <div className="font-medium text-sm">{it.name}</div>
                      <div className="text-xs text-muted-foreground">{it.sku} · {it.item_type}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">{Number(it.on_hand).toFixed(2)} {it.unit}</Badge>
                      <div className="text-xs text-muted-foreground mt-0.5">min {Number(it.min_stock)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-sm text-muted-foreground py-6 text-center">All items above minimum.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ArrowLeftRight className="h-4 w-4" />Recent movements</CardTitle>
            <Button asChild size="sm" variant="outline"><Link to="/app/inventory/movements">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {data?.txns.length ? (
              <div className="space-y-2">
                {data.txns.map((t) => {
                  const it = items.find((i) => i.id === t.item_id);
                  return (
                    <div key={t.id} className="flex items-center justify-between text-sm p-2 rounded-md border border-border">
                      <div className="truncate">
                        <div className="font-medium truncate">{it?.name ?? "Item"}</div>
                        <div className="text-xs text-muted-foreground">{t.txn_type}</div>
                      </div>
                      <div className={Number(t.quantity) >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                        {Number(t.quantity) > 0 ? "+" : ""}{Number(t.quantity).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div className="text-sm text-muted-foreground py-6 text-center">No movements yet.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, highlight, warn }: { label: string; value: string; icon: typeof Package; highlight?: boolean; warn?: boolean }) {
  return (
    <Card className={highlight ? "border-accent" : warn ? "border-destructive/50" : ""}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <Icon className={`h-4 w-4 ${warn ? "text-destructive" : "text-muted-foreground"}`} />
        </div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}