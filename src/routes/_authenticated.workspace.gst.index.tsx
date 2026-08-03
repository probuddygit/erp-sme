import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/shared/components/StatCard";
import { StatusPill } from "@/features/gst/components/StatusPill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Receipt, IndianRupee, TrendingDown, FileCheck2, Loader2 } from "lucide-react";
import { formatINR, formatDate } from "@/features/gst/data";
import { useGstLedger, useEInvoices, useGstrFilings, monthKey, monthLabel } from "@/features/gst/gst-api";

export const Route = createFileRoute("/_authenticated/workspace/gst/")({
  component: GstDashboard,
});

function GstDashboard() {
  const ledger = useGstLedger();
  const { invoices, isLoading } = useEInvoices();
  const filings = useGstrFilings();

  const { output, input, trend, periods } = useMemo(() => {
    const rows = ledger.data ?? [];
    let output = 0, input = 0;
    const m = new Map<string, { period: string; key: string; output: number; input: number }>();
    for (const r of rows) {
      const tax = Number(r.cgst) + Number(r.sgst) + Number(r.igst);
      const key = monthKey(r.txn_date);
      const e = m.get(key) ?? { key, period: monthLabel(key), output: 0, input: 0 };
      if (r.kind === "output") { output += tax; e.output += tax; } else { input += tax; e.input += tax; }
      m.set(key, e);
    }
    const periods = [...m.values()].sort((a, b) => b.key.localeCompare(a.key));
    return { output, input, trend: [...periods].reverse().slice(-6), periods };
  }, [ledger.data]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = periods.flatMap((p) => (["GSTR1", "GSTR3B"] as const).map((kind) => {
    const [y, mm] = p.key.split("-").map(Number);
    const due = new Date(Date.UTC(y, mm, kind === "GSTR1" ? 11 : 20)).toISOString().slice(0, 10);
    const filed = filings.value.some((f) => f.key === `${kind}-${p.key}`);
    return { id: `${kind}-${p.key}`, kind, period: p.period, due, filed, status: filed ? "filed" : due < today ? "overdue" : "draft" };
  })).filter((f) => !f.filed).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6);

  const irnCount = invoices.filter((i) => !!(i.irn ?? i.einvoice_irn)).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Output GST" value={formatINR(output)} icon={IndianRupee} hint="Tax collected on sales" />
        <StatCard label="Input Credit" value={formatINR(input)} icon={TrendingDown} hint="Claimable ITC" />
        <StatCard label="Net GST Payable" value={formatINR(output - input)} icon={Receipt} hint="After ITC set-off" />
        <StatCard label="e-Invoices" value={`${irnCount}/${invoices.length}`} icon={FileCheck2} hint="IRN generated" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">GST liability trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            {ledger.isLoading ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : trend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No GST postings yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatINR(v as number)} />
                  <Tooltip formatter={(v) => formatINR(v as number)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="output" name="Output GST" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="input" name="Input Credit" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming filings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <div className="text-sm text-muted-foreground">All returns are up to date.</div>
            ) : upcoming.map((p) => (
              <Link key={p.id} to={p.kind === "GSTR1" ? "/workspace/gst/gstr1" : "/workspace/gst/gstr3b"}
                className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 transition-colors hover:bg-muted">
                <div>
                  <div className="text-sm font-medium">{p.kind === "GSTR1" ? "GSTR-1" : "GSTR-3B"} · {p.period}</div>
                  <div className="text-xs text-muted-foreground">Due {formatDate(p.due)}</div>
                </div>
                <StatusPill label={p.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent e-Invoices</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>IRN</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : invoices.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No invoices yet.</TableCell></TableRow>
              ) : invoices.slice(0, 5).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.invoice_number}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.invoice_date)}</TableCell>
                  <TableCell>{r.customers?.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.customers?.gst_number ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatINR(Number(r.grand_total))}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{r.irn ?? r.einvoice_irn ?? "—"}</TableCell>
                  <TableCell><StatusPill label={r.irn || r.einvoice_irn ? "generated" : "pending"} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
