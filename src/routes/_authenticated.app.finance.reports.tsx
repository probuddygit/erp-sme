import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/app/finance/reports")({
  component: ReportsPage,
});

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function ReportsPage() {
  const { company } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: bal } = useQuery({
    enabled: !!company?.id,
    queryKey: ["bal", company?.id, from, to],
    queryFn: async () => (await supabase.rpc("account_balances", { _company_id: company!.id, _from: from || null, _to: to || null })).data ?? [],
  });

  const rows = (bal ?? []) as any[];
  const sum = (type: string, asPositive: "debit" | "credit") =>
    rows.filter(r => r.type === type).reduce((s, r) => s + (asPositive === "debit" ? Number(r.balance) : -Number(r.balance)), 0);
  const revenue = sum("revenue", "credit");
  const expense = sum("expense", "debit");
  const cogs = rows.filter(r => r.code === "5000").reduce((s, r) => s + Number(r.balance), 0);
  const opex = expense - cogs;
  const netProfit = revenue - expense;
  const assets = sum("asset", "debit");
  const liabilities = sum("liability", "credit");
  const equity = sum("equity", "credit") + netProfit;

  // Cash flow simplified: net change in cash + bank
  const cash = rows.filter(r => ["1000","1010"].includes(r.code)).reduce((s, r) => s + Number(r.balance), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3 max-w-xl">
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
      </div>
      <Tabs defaultValue="pl">
        <TabsList>
          <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cf">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="pl">
          <Card><CardHeader><CardTitle className="text-base">Profit & Loss</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            <SectionTitle>Revenue</SectionTitle>
            {rows.filter(r => r.type === "revenue").map(r => <Line key={r.account_id} label={`${r.code} ${r.name}`} value={-Number(r.balance)} />)}
            <Total label="Total revenue" value={revenue} />
            <SectionTitle>Cost of goods sold</SectionTitle>
            {rows.filter(r => r.code === "5000").map(r => <Line key={r.account_id} label={`${r.code} ${r.name}`} value={Number(r.balance)} />)}
            <Total label="Gross profit" value={revenue - cogs} />
            <SectionTitle>Operating expenses</SectionTitle>
            {rows.filter(r => r.type === "expense" && r.code !== "5000").map(r => <Line key={r.account_id} label={`${r.code} ${r.name}`} value={Number(r.balance)} />)}
            <Total label="Total opex" value={opex} />
            <div className="border-t pt-3 flex justify-between font-bold text-base"><span>Net profit</span><span className={netProfit >= 0 ? "text-emerald-600" : "text-destructive"}>{fmt(netProfit)}</span></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="bs">
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-base">Assets</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
              {rows.filter(r => r.type === "asset").map(r => <Line key={r.account_id} label={`${r.code} ${r.name}`} value={Number(r.balance)} />)}
              <Total label="Total assets" value={assets} />
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Liabilities & Equity</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
              <SectionTitle>Liabilities</SectionTitle>
              {rows.filter(r => r.type === "liability").map(r => <Line key={r.account_id} label={`${r.code} ${r.name}`} value={-Number(r.balance)} />)}
              <Total label="Total liabilities" value={liabilities} />
              <SectionTitle>Equity</SectionTitle>
              {rows.filter(r => r.type === "equity").map(r => <Line key={r.account_id} label={`${r.code} ${r.name}`} value={-Number(r.balance)} />)}
              <Line label="Current period profit" value={netProfit} />
              <Total label="Total equity" value={equity} />
              <div className="border-t pt-3 flex justify-between font-bold text-base"><span>Liabilities + Equity</span><span>{fmt(liabilities + equity)}</span></div>
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="cf">
          <Card><CardHeader><CardTitle className="text-base">Cash Flow (simplified)</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            <Line label="Net profit" value={netProfit} />
            <SectionTitle>Working capital changes</SectionTitle>
            <Line label="Change in AR" value={-rows.filter(r => r.code === "1100").reduce((s, r) => s + Number(r.balance), 0)} />
            <Line label="Change in Inventory" value={-rows.filter(r => r.code === "1200").reduce((s, r) => s + Number(r.balance), 0)} />
            <Line label="Change in AP" value={-rows.filter(r => r.code === "2000").reduce((s, r) => s + Number(r.balance), 0)} />
            <div className="border-t pt-3 flex justify-between font-bold text-base"><span>Closing cash position</span><span>{fmt(cash)}</span></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-widest text-muted-foreground pt-2">{children}</div>;
}
function Line({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{fmt(value)}</span></div>;
}
function Total({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between border-t pt-2 font-medium"><span>{label}</span><span>{fmt(value)}</span></div>;
}