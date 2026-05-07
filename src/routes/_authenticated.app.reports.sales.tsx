import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/app/reports/sales")({
  component: SalesAnalytics,
});

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const fmtShort = (n: number) => Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : Math.abs(n) >= 1e3 ? `₹${(n / 1e3).toFixed(1)}k` : `₹${Math.round(n)}`;

function SalesAnalytics() {
  const { company } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!company?.id) return;
    const ch = supabase.channel("rep-sales")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices", filter: `company_id=eq.${company.id}` },
        () => qc.invalidateQueries({ queryKey: ["rep-sales"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_orders", filter: `company_id=eq.${company.id}` },
        () => qc.invalidateQueries({ queryKey: ["rep-sales"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [company?.id, qc]);

  const { data } = useQuery({
    enabled: !!company?.id,
    queryKey: ["rep-sales", company?.id],
    queryFn: async () => {
      const cid = company!.id;
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString().slice(0, 10);
      const [invs, customers, orders] = await Promise.all([
        supabase.from("invoices").select("invoice_date, grand_total, amount_paid, amount_due, status, customer_id").eq("company_id", cid).gte("invoice_date", monthStart),
        supabase.from("customers").select("id, name").eq("company_id", cid),
        supabase.from("sales_orders").select("status, grand_total").eq("company_id", cid),
      ]);

      const months: { key: string; label: string; sales: number; collected: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ key, label: d.toLocaleDateString("en-IN", { month: "short" }), sales: 0, collected: 0 });
      }
      const idx = (date: string) => {
        const d = new Date(date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return months.findIndex(m => m.key === key);
      };

      const custMap = new Map<string, string>();
      (customers.data ?? []).forEach((c: any) => custMap.set(c.id, c.name));
      const byCust = new Map<string, number>();
      let outstanding = 0, totalInvoiced = 0;

      (invs.data ?? []).forEach((i: any) => {
        const x = idx(i.invoice_date); if (x >= 0) {
          months[x].sales += Number(i.grand_total ?? 0);
          months[x].collected += Number(i.amount_paid ?? 0);
        }
        outstanding += Number(i.amount_due ?? 0);
        totalInvoiced += Number(i.grand_total ?? 0);
        if (i.customer_id) byCust.set(i.customer_id, (byCust.get(i.customer_id) ?? 0) + Number(i.grand_total ?? 0));
      });
      const topCustomers = [...byCust.entries()]
        .map(([id, amt]) => ({ name: custMap.get(id) ?? "—", amount: amt }))
        .sort((a, b) => b.amount - a.amount).slice(0, 8);

      const orderStatus = new Map<string, { count: number; value: number }>();
      (orders.data ?? []).forEach((o: any) => {
        const s = o.status ?? "draft";
        const e = orderStatus.get(s) ?? { count: 0, value: 0 };
        e.count += 1; e.value += Number(o.grand_total ?? 0);
        orderStatus.set(s, e);
      });

      return { months, topCustomers, outstanding, totalInvoiced, orderStatus: [...orderStatus.entries()].map(([k, v]) => ({ status: k, ...v })) };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Invoiced (6m)" value={fmt(data?.totalInvoiced ?? 0)} />
        <Stat label="Outstanding AR" value={fmt(data?.outstanding ?? 0)} />
        <Stat label="Top customer" value={data?.topCustomers[0]?.name ?? "—"} sub={data?.topCustomers[0] ? fmt(data.topCustomers[0].amount) : ""} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Sales vs Collections</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.months ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={fmtShort} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Line type="monotone" dataKey="sales" name="Invoiced" stroke="hsl(220 70% 55%)" strokeWidth={2} />
              <Line type="monotone" dataKey="collected" name="Collected" stroke="hsl(160 60% 45%)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top customers (6m)</CardTitle></CardHeader>
          <CardContent className="h-72">
            {(data?.topCustomers.length ?? 0) === 0 ? <Empty>No data.</Empty> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.topCustomers} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={fmtShort} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="name" width={100} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="amount" fill="hsl(220 70% 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Order pipeline</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data?.orderStatus ?? []).map((r) => (
                  <TableRow key={r.status}>
                    <TableCell className="capitalize">{r.status.replace("_", " ")}</TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.value)}</TableCell>
                  </TableRow>
                ))}
                {(data?.orderStatus.length ?? 0) === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No orders.</TableCell></TableRow>}
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
function Empty({ children }: { children: React.ReactNode }) { return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{children}</div>; }