import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Receipt, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/app/finance/")({
  component: FinanceOverview,
});

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function FinanceOverview() {
  const { company } = useAuth();
  const qc = useQueryClient();

  // Realtime — refresh on any new journal entry for this company
  useEffect(() => {
    if (!company?.id) return;
    const ch = supabase.channel("fin-overview")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "journal_entries", filter: `company_id=eq.${company.id}` },
        () => qc.invalidateQueries({ queryKey: ["fin-overview"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [company?.id, qc]);

  const { data } = useQuery({
    enabled: !!company?.id,
    queryKey: ["fin-overview", company?.id],
    queryFn: async () => {
      const { data: bal } = await supabase.rpc("account_balances", { _company_id: company!.id });
      const { data: recent } = await supabase.from("journal_entries").select("id, entry_number, entry_date, narration, total_debit, source_module").eq("company_id", company!.id).order("created_at", { ascending: false }).limit(8);
      const rows = (bal ?? []) as any[];
      const sum = (codes: string[], asPositive: "debit" | "credit") =>
        rows.filter(r => codes.includes(r.code)).reduce((s, r) => s + (asPositive === "debit" ? Number(r.balance) : -Number(r.balance)), 0);
      const revenue = sum(["4000"], "credit");
      const cogs = sum(["5000"], "debit");
      const opex = sum(["5100","5200"], "debit");
      const netProfit = revenue - cogs - opex;
      const cash = sum(["1000","1010"], "debit");
      const ar = sum(["1100"], "debit");
      const ap = sum(["2000"], "credit");
      const gstOut = sum(["2100"], "credit");
      const gstIn = sum(["1300"], "debit");
      return { revenue, cogs, opex, netProfit, cash, ar, ap, gstNet: gstOut - gstIn, recent: recent ?? [] };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue (YTD)" value={fmt(data?.revenue ?? 0)} icon={TrendingUp} tone="success" />
        <Stat label="Net profit" value={fmt(data?.netProfit ?? 0)} icon={(data?.netProfit ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight} tone={(data?.netProfit ?? 0) >= 0 ? "success" : "danger"} />
        <Stat label="Cash & bank" value={fmt(data?.cash ?? 0)} icon={Wallet} />
        <Stat label="GST payable (net)" value={fmt(data?.gstNet ?? 0)} icon={Receipt} tone="warn" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Live P&L</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Revenue" value={data?.revenue ?? 0} positive />
            <Row label="Cost of goods sold" value={-(data?.cogs ?? 0)} />
            <Row label="Operating expenses" value={-(data?.opex ?? 0)} />
            <div className="border-t pt-2 flex justify-between font-semibold"><span>Net profit</span><span>{fmt(data?.netProfit ?? 0)}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Receivables vs Payables</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-500" />Receivable (AR)</div>
              <div className="text-2xl font-bold">{fmt(data?.ar ?? 0)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3 text-amber-500" />Payable (AP)</div>
              <div className="text-2xl font-bold">{fmt(data?.ap ?? 0)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent journal entries</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {data?.recent.length ? (
              <div className="divide-y">
                {data.recent.map((j: any) => (
                  <Link key={j.id} to="/app/finance/ledger" className="flex justify-between py-2 hover:bg-muted/40 px-2 rounded">
                    <div className="min-w-0">
                      <div className="font-mono text-xs">{j.entry_number}</div>
                      <div className="text-xs text-muted-foreground truncate">{j.narration}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div>{fmt(Number(j.total_debit))}</div>
                      <div className="text-muted-foreground capitalize">{j.source_module ?? "—"}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <div className="text-muted-foreground text-center py-6">No transactions yet.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "success" | "warn" | "danger" }) {
  const cls = tone === "success" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "danger" ? "text-destructive" : "text-muted-foreground";
  return (
    <Card><CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${cls}`} />
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
    </CardContent></Card>
  );
}

function Row({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={positive ? "text-emerald-600 font-medium" : value < 0 ? "text-foreground" : ""}>{fmt(value)}</span>
    </div>
  );
}