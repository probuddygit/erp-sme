import { createFileRoute } from "@tanstack/react-router";
import { ReportCard } from "@/features/finance/components/ReportCard";
import { StatCard } from "@/shared/components/StatCard";
import { PieChart, IndianRupee } from "lucide-react";
import { CHART_OF_ACCOUNTS, accountBalance, formatINR } from "@/features/finance/data";

export const Route = createFileRoute("/_authenticated/workspace/finance/profit-loss")({
  component: ProfitLossPage,
});

function ProfitLossPage() {
  const leaves = (type: string) => CHART_OF_ACCOUNTS.filter((a) => a.type === type && !a.isGroup);
  const revenue = leaves("revenue").map((a) => ({ ...a, bal: -accountBalance(a.code) }));
  const cogs = leaves("expense").filter((a) => a.group === "COGS").map((a) => ({ ...a, bal: accountBalance(a.code) }));
  const opex = leaves("expense").filter((a) => a.group !== "COGS").map((a) => ({ ...a, bal: accountBalance(a.code) }));

  const totalRevenue = revenue.reduce((s, a) => s + a.bal, 0);
  const totalCogs = cogs.reduce((s, a) => s + a.bal, 0);
  const grossProfit = totalRevenue - totalCogs;
  const totalOpex = opex.reduce((s, a) => s + a.bal, 0);
  const netProfit = grossProfit - totalOpex;
  const margin = totalRevenue ? (netProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatINR(totalRevenue)} icon={IndianRupee} />
        <StatCard label="Gross profit" value={formatINR(grossProfit)} icon={PieChart} />
        <StatCard label="Operating expenses" value={formatINR(totalOpex)} icon={PieChart} />
        <StatCard label="Net profit" value={formatINR(netProfit)} icon={PieChart} trend={{ value: `${margin.toFixed(1)}% margin`, positive: netProfit >= 0 }} />
      </div>

      <ReportCard title="Profit & Loss" subtitle="Statement of earnings for the current period.">
        <div className="space-y-4">
          <Section title="Revenue" rows={revenue.map((a) => ({ label: `${a.code} · ${a.name}`, value: a.bal }))} total={totalRevenue} />
          <Section title="Cost of goods sold" rows={cogs.map((a) => ({ label: `${a.code} · ${a.name}`, value: a.bal }))} total={totalCogs} />
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
            <span>Gross profit</span>
            <span className={grossProfit >= 0 ? "text-emerald-600" : "text-destructive"}>{formatINR(grossProfit)}</span>
          </div>
          <Section title="Operating expenses" rows={opex.map((a) => ({ label: `${a.code} · ${a.name}`, value: a.bal }))} total={totalOpex} />
          <div className="flex items-center justify-between border-t border-border pt-3 text-base font-bold">
            <span>Net profit</span>
            <span className={netProfit >= 0 ? "text-emerald-600" : "text-destructive"}>{formatINR(netProfit)}</span>
          </div>
        </div>
      </ReportCard>
    </div>
  );
}

function Section({ title, rows, total }: { title: string; rows: { label: string; value: number }[]; total: number }) {
  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span>{formatINR(r.value)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between bg-muted/20 px-3 py-2 text-sm font-semibold">
          <span>Total {title.toLowerCase()}</span>
          <span>{formatINR(total)}</span>
        </div>
      </div>
    </div>
  );
}