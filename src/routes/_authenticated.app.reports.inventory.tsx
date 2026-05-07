import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/reports/inventory")({
  component: InventoryAnalytics,
});

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const POS = new Set(["receipt", "production_in", "transfer_in", "opening", "adjustment"]);

function InventoryAnalytics() {
  const { company } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!company?.id) return;
    const ch = supabase.channel("rep-inv")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_transactions", filter: `company_id=eq.${company.id}` },
        () => qc.invalidateQueries({ queryKey: ["rep-inv"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [company?.id, qc]);

  const { data } = useQuery({
    enabled: !!company?.id,
    queryKey: ["rep-inv", company?.id],
    queryFn: async () => {
      const cid = company!.id;
      const [items, txns] = await Promise.all([
        supabase.from("items").select("id, sku, name, unit, min_stock, standard_cost").eq("company_id", cid).eq("is_active", true),
        supabase.from("stock_transactions").select("item_id, quantity, total_value, txn_type").eq("company_id", cid),
      ]);
      const stockBy = new Map<string, { qty: number; value: number }>();
      (txns.data ?? []).forEach((t: any) => {
        const e = stockBy.get(t.item_id) ?? { qty: 0, value: 0 };
        const sign = POS.has(t.txn_type) ? 1 : -1;
        e.qty += sign * Number(t.quantity ?? 0);
        e.value += sign * Number(t.total_value ?? 0);
        stockBy.set(t.item_id, e);
      });
      const rows = (items.data ?? []).map((i: any) => {
        const s = stockBy.get(i.id) ?? { qty: 0, value: 0 };
        return { ...i, qty: s.qty, value: s.value, low: s.qty <= Number(i.min_stock ?? 0) };
      });
      const totalValue = rows.reduce((s, r) => s + Math.max(0, r.value), 0);
      const lowStock = rows.filter(r => r.low);
      const top = [...rows].sort((a, b) => b.value - a.value).slice(0, 10);
      return { rows, totalValue, lowStock, top, totalItems: rows.length };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Active SKUs" value={String(data?.totalItems ?? 0)} />
        <Stat label="Stock value" value={fmt(data?.totalValue ?? 0)} />
        <Stat label="Low-stock alerts" value={String(data?.lowStock.length ?? 0)} tone={(data?.lowStock.length ?? 0) > 0 ? "warn" : undefined} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top items by value</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Value</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.top ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right">{r.qty.toFixed(2)} {r.unit}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.value)}</TableCell>
                  <TableCell>{r.low && <Badge variant="destructive">Low</Badge>}</TableCell>
                </TableRow>
              ))}
              {(data?.top.length ?? 0) === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No items.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(data?.lowStock.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base text-amber-600">Low stock items</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Name</TableHead><TableHead className="text-right">On hand</TableHead><TableHead className="text-right">Min</TableHead></TableRow></TableHeader>
              <TableBody>
                {data!.lowStock.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-right">{r.qty.toFixed(2)} {r.unit}</TableCell>
                    <TableCell className="text-right">{Number(r.min_stock).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return <Card><CardContent className="p-5">
    <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className={`mt-2 text-2xl font-bold tracking-tight ${tone === "warn" ? "text-amber-600" : ""}`}>{value}</div>
  </CardContent></Card>;
}