import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/app/reports/procurement")({
  component: ProcurementAnalytics,
});

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const fmtShort = (n: number) => Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : Math.abs(n) >= 1e3 ? `₹${(n / 1e3).toFixed(1)}k` : `₹${Math.round(n)}`;

function ProcurementAnalytics() {
  const { company } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!company?.id) return;
    const ch = supabase.channel("rep-proc")
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_orders", filter: `company_id=eq.${company.id}` },
        () => qc.invalidateQueries({ queryKey: ["rep-proc"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [company?.id, qc]);

  const { data } = useQuery({
    enabled: !!company?.id,
    queryKey: ["rep-proc", company?.id],
    queryFn: async () => {
      const cid = company!.id;
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString().slice(0, 10);
      const [pos, suppliers, vinvs] = await Promise.all([
        supabase.from("purchase_orders").select("order_date, grand_total, status, supplier_id").eq("company_id", cid).gte("order_date", monthStart),
        supabase.from("suppliers").select("id, name").eq("company_id", cid),
        supabase.from("vendor_invoices").select("amount_due, grand_total, status").eq("company_id", cid),
      ]);

      const months: { key: string; label: string; spend: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-IN", { month: "short" }), spend: 0 });
      }
      const idx = (date: string) => {
        const d = new Date(date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return months.findIndex(m => m.key === key);
      };

      const supMap = new Map<string, string>();
      (suppliers.data ?? []).forEach((s: any) => supMap.set(s.id, s.name));
      const bySup = new Map<string, { spend: number; orders: number }>();
      let totalSpend = 0;
      const statusMap = new Map<string, number>();

      (pos.data ?? []).forEach((p: any) => {
        const x = idx(p.order_date); if (x >= 0) months[x].spend += Number(p.grand_total ?? 0);
        totalSpend += Number(p.grand_total ?? 0);
        statusMap.set(p.status, (statusMap.get(p.status) ?? 0) + 1);
        if (p.supplier_id) {
          const e = bySup.get(p.supplier_id) ?? { spend: 0, orders: 0 };
          e.spend += Number(p.grand_total ?? 0); e.orders += 1;
          bySup.set(p.supplier_id, e);
        }
      });

      const topSuppliers = [...bySup.entries()]
        .map(([id, v]) => ({ name: supMap.get(id) ?? "—", ...v }))
        .sort((a, b) => b.spend - a.spend).slice(0, 8);

      const apOutstanding = (vinvs.data ?? []).reduce((s: number, v: any) => s + Number(v.amount_due ?? 0), 0);

      return { months, topSuppliers, totalSpend, apOutstanding, statusBreakdown: [...statusMap.entries()].map(([s, c]) => ({ status: s, count: c })) };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Spend (6m)" value={fmt(data?.totalSpend ?? 0)} />
        <Stat label="Payables outstanding" value={fmt(data?.apOutstanding ?? 0)} />
        <Stat label="Top supplier" value={data?.topSuppliers[0]?.name ?? "—"} sub={data?.topSuppliers[0] ? fmt(data.topSuppliers[0].spend) : ""} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Monthly procurement spend</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.months ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={fmtShort} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Bar dataKey="spend" name="PO value" fill="hsl(30 80% 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top suppliers</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Spend</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data?.topSuppliers ?? []).map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right">{s.orders}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(s.spend)}</TableCell>
                  </TableRow>
                ))}
                {(data?.topSuppliers.length ?? 0) === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No POs yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">PO status</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data?.statusBreakdown ?? []).map((r) => (
                  <TableRow key={r.status}><TableCell className="capitalize">{r.status?.replace("_", " ")}</TableCell><TableCell className="text-right">{r.count}</TableCell></TableRow>
                ))}
                {(data?.statusBreakdown.length ?? 0) === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">No data.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <Card><CardContent className="p-5">
    <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="mt-2 text-2xl font-bold tracking-tight truncate">{value}</div>
    {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
  </CardContent></Card>;
}