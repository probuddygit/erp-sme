import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/shared/components/StatCard";
import { StatusPill } from "@/features/gst/components/StatusPill";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Receipt, IndianRupee, TrendingDown, FileCheck2 } from "lucide-react";
import {
  gstDashboardTotals, gstTrend, formatINR, formatDate,
  GSTR1_PERIODS, GSTR3B_PERIODS, EINVOICES,
} from "@/features/gst/data";

export const Route = createFileRoute("/_authenticated/workspace/gst/")({
  component: GstDashboard,
});

function GstDashboard() {
  const totals = gstDashboardTotals();
  const trend = gstTrend();
  const upcoming = [...GSTR1_PERIODS, ...GSTR3B_PERIODS]
    .filter((p) => p.status !== "filed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const recentInvoices = EINVOICES.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Output GST" value={formatINR(totals.outputTax)} icon={IndianRupee} hint="Current period (Jul-2026)" />
        <StatCard label="Input Credit" value={formatINR(totals.inputTax)} icon={TrendingDown} hint="Claimable ITC" />
        <StatCard label="Net GST Payable" value={formatINR(totals.netPayable)} icon={Receipt} hint="After ITC set-off" />
        <StatCard label="e-Invoices" value={String(totals.invoices)} icon={FileCheck2} hint="Generated this month" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">GST liability trend</CardTitle></CardHeader>
          <CardContent className="h-72">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming filings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <div className="text-sm text-muted-foreground">All returns are up to date.</div>
            ) : upcoming.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{p.id.startsWith("g1") ? "GSTR-1" : "GSTR-3B"} · {p.period}</div>
                  <div className="text-xs text-muted-foreground">Due {formatDate(p.dueDate)}</div>
                </div>
                <StatusPill label={p.status} />
              </div>
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
              {recentInvoices.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.invoiceNumber}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.invoiceDate)}</TableCell>
                  <TableCell>{r.buyer}</TableCell>
                  <TableCell className="font-mono text-xs">{r.buyerGstin}</TableCell>
                  <TableCell className="text-right">{formatINR(r.totalValue)}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{r.irn ?? "—"}</TableCell>
                  <TableCell><StatusPill label={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}