import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Receipt, Factory, ShoppingCart } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/reports/")({
  component: ExecutiveDashboard,
});

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
};

function ExecutiveDashboard() {
  const { company, roles, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const showFinance = isCompanyAdmin || roles.includes("finance");

  useEffect(() => {
    if (!company?.id) return;
    const ch = supabase
      .channel("reports-exec")
      .on("postgres_changes", { event: "*", schema: "public", table: "journal_entries", filter: `company_id=eq.${company.id}` },
        () => qc.invalidateQueries({ queryKey: ["reports-exec"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices", filter: `company_id=eq.${company.id}` },
        () => qc.invalidateQueries({ queryKey: ["reports-exec"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [company?.id, qc]);

  const { data, isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["reports-exec", company?.id],
    queryFn: async () => {
      const cid = company!.id;
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);
      const fromIso = monthStart.toISOString().slice(0, 10);

      const [bal, invs, pos, jeRows, jlRows, coaRows, mc] = await Promise.all([
        supabase.rpc("account_balances", { _company_id: cid }),
        supabase.from("invoices").select("invoice_date, grand_total, amount_paid, amount_due, status").eq("company_id", cid).gte("invoice_date", fromIso),
        supabase.from("purchase_orders").select("order_date, grand_total, status").eq("company_id", cid).gte("order_date", fromIso),
        supabase.from("journal_entries").select("id, entry_date").eq("company_id", cid).gte("entry_date", fromIso),
        supabase.from("journal_lines").select("entry_id, account_id, debit, credit").eq("company_id", cid),
        supabase.from("chart_of_accounts").select("id, code, type").eq("company_id", cid),
        supabase.from("material_consumption").select("total_cost, consumed_at").eq("company_id", cid).gte("consumed_at", fromIso),
      ]);

      const jeMap = new Map<string, string>();
      (jeRows.data ?? []).forEach((j: any) => jeMap.set(j.id, j.entry_date));
      const coaMap = new Map<string, { code: string; type: string }>();
      (coaRows.data ?? []).forEach((a: any) => coaMap.set(a.id, { code: a.code, type: a.type }));
      const cogsRows = (jlRows.data ?? [])
        .map((l: any) => {
          const date = jeMap.get(l.entry_id);
          const acc = coaMap.get(l.account_id);
          if (!date || !acc) return null;
          return { debit: Number(l.debit ?? 0), code: acc.code, date };
        })
        .filter(Boolean) as { debit: number; code: string; date: string }[];

      const rows = (bal.data ?? []) as any[];
      const sumBal = (codes: string[], side: "debit" | "credit") =>
        rows.filter(r => codes.includes(r.code)).reduce((s, r) => s + (side === "debit" ? Number(r.balance) : -Number(r.balance)), 0);

      const revenue = sumBal(["4000"], "credit");
      const cogs = sumBal(["5000"], "debit");
      const opex = sumBal(["5100", "5200"], "debit");
      const netProfit = revenue - cogs - opex;
      const cash = sumBal(["1000", "1010"], "debit");
      const ar = sumBal(["1100"], "debit");
      const ap = sumBal(["2000"], "credit");
      const inventory = sumBal(["1200"], "debit");

      // Build 6-month trend buckets
      const months: { key: string; label: string; revenue: number; cogs: number; opex: number; profit: number; orders: number; purchases: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ key, label: d.toLocaleDateString("en-IN", { month: "short" }), revenue: 0, cogs: 0, opex: 0, profit: 0, orders: 0, purchases: 0 });
      }
      const idx = (date: string) => {
        const d = new Date(date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return months.findIndex(m => m.key === key);
      };

      (invs.data ?? []).forEach((i: any) => {
        const x = idx(i.invoice_date); if (x < 0) return;
        months[x].revenue += Number(i.grand_total ?? 0);
        months[x].orders += 1;
      });
      (pos.data ?? []).forEach((p: any) => {
        const x = idx(p.order_date); if (x < 0) return;
        months[x].purchases += Number(p.grand_total ?? 0);
      });
      cogsRows.forEach((l) => {
        const x = idx(l.date); if (x < 0) return;
        if (l.code === "5000") months[x].cogs += l.debit;
        if (l.code === "5100" || l.code === "5200") months[x].opex += l.debit;
      });
      months.forEach(m => { m.profit = m.revenue - m.cogs - m.opex; });

      // Cost breakdown YTD
      let mat = 0, labour = 0, overhead = 0;
      cogsRows.forEach((l) => {
        if (l.code === "5000") mat += l.debit;
        if (l.code === "5100") labour += l.debit;
        if (l.code === "5200") overhead += l.debit;
      });
      // include direct material consumption if recorded
      const matWithMc = mat + (mc.data ?? []).reduce((s: number, r: any) => s + Number(r.total_cost ?? 0), 0);
      const costBreakdown = [
        { name: "Material", value: Math.max(0, matWithMc), color: "hsl(var(--chart-1, 220 70% 50%))" },
        { name: "Labour", value: Math.max(0, labour), color: "hsl(var(--chart-2, 160 60% 45%))" },
        { name: "Overhead", value: Math.max(0, overhead), color: "hsl(var(--chart-3, 30 80% 55%))" },
      ].filter(c => c.value > 0);

      return { revenue, cogs, opex, netProfit, cash, ar, ap, inventory, months, costBreakdown };
    },
  });

  const margin = useMemo(() => {
    if (!data || !data.revenue) return 0;
    return (data.netProfit / data.revenue) * 100;
  }, [data]);

  return (
    <div className="space-y-6">
      {showFinance && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Stat label="Revenue (YTD)" value={fmt(data?.revenue ?? 0)} icon={TrendingUp} tone="success" />
          <Stat label="Net profit" value={fmt(data?.netProfit ?? 0)} sub={`${margin.toFixed(1)}% margin`} icon={(data?.netProfit ?? 0) >= 0 ? TrendingUp : TrendingDown} tone={(data?.netProfit ?? 0) >= 0 ? "success" : "danger"} />
          <Stat label="Cash & bank" value={fmt(data?.cash ?? 0)} icon={Wallet} />
          <Stat label="Inventory value" value={fmt(data?.inventory ?? 0)} icon={Receipt} />
        </div>
      )}

      {showFinance && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue vs Profit — last 6 months</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? <Skeleton /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.months ?? []}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160 60% 45%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(160 60% 45%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(220 70% 55%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(220 70% 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={fmtShort} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(160 60% 45%)" fill="url(#rev)" strokeWidth={2} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="hsl(220 70% 55%)" fill="url(#prof)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {showFinance && (
          <Card>
            <CardHeader><CardTitle className="text-base">Cost breakdown (YTD)</CardTitle></CardHeader>
            <CardContent className="h-72">
              {(data?.costBreakdown?.length ?? 0) === 0 ? (
                <Empty>No cost data yet.</Empty>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data!.costBreakdown} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} paddingAngle={2}>
                      {data!.costBreakdown.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Sales orders vs Purchases</CardTitle></CardHeader>
          <CardContent className="h-72">
            {isLoading ? <Skeleton /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.months ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={fmtShort} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Bar dataKey="revenue" name="Sales" fill="hsl(220 70% 55%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchases" name="Purchases" fill="hsl(30 80% 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {showFinance && (
        <div className="grid gap-4 md:grid-cols-3">
          <MiniStat label="Receivables" value={fmt(data?.ar ?? 0)} icon={ShoppingCart} />
          <MiniStat label="Payables" value={fmt(data?.ap ?? 0)} icon={Factory} />
          <MiniStat label="Working capital" value={fmt((data?.cash ?? 0) + (data?.ar ?? 0) - (data?.ap ?? 0))} icon={Wallet} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon: any; tone?: "success" | "warn" | "danger" }) {
  const cls = tone === "success" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "danger" ? "text-destructive" : "text-muted-foreground";
  return (
    <Card><CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${cls}`} />
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </CardContent></Card>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card><CardContent className="p-4 flex items-center justify-between">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-bold">{value}</div>
      </div>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardContent></Card>
  );
}

function Skeleton() { return <div className="h-full w-full animate-pulse bg-muted/40 rounded" />; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{children}</div>; }