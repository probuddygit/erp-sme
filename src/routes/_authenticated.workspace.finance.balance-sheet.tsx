import { createFileRoute } from "@tanstack/react-router";
import { ReportCard } from "@/features/finance/components/ReportCard";
import { StatCard } from "@/shared/components/StatCard";
import { Landmark } from "lucide-react";
import { CHART_OF_ACCOUNTS, accountBalance, formatINR } from "@/features/finance/data";

export const Route = createFileRoute("/_authenticated/workspace/finance/balance-sheet")({
  component: BalanceSheetPage,
});

function BalanceSheetPage() {
  const leaves = (type: string) => CHART_OF_ACCOUNTS.filter((a) => a.type === type && !a.isGroup);
  const assets = leaves("asset").map((a) => ({ ...a, bal: accountBalance(a.code) }));
  const liabilities = leaves("liability").map((a) => ({ ...a, bal: -accountBalance(a.code) }));
  const equity = leaves("equity").map((a) => ({ ...a, bal: -accountBalance(a.code) }));
  const revenue = leaves("revenue").reduce((s, a) => s + -accountBalance(a.code), 0);
  const expense = leaves("expense").reduce((s, a) => s + accountBalance(a.code), 0);
  const netProfit = revenue - expense;

  const totalAssets = assets.reduce((s, a) => s + a.bal, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.bal, 0);
  const totalEquity = equity.reduce((s, a) => s + a.bal, 0) + netProfit;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total assets" value={formatINR(totalAssets)} icon={Landmark} />
        <StatCard label="Total liabilities" value={formatINR(totalLiabilities)} icon={Landmark} />
        <StatCard label="Total equity" value={formatINR(totalEquity)} icon={Landmark} hint={`Includes net profit ${formatINR(netProfit)}`} />
      </div>

      <ReportCard title="Balance Sheet" subtitle="Statement of financial position — as of today.">
        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Assets" rows={assets.map((a) => ({ label: `${a.code} · ${a.name}`, value: a.bal }))} total={totalAssets} />
          <div className="space-y-4">
            <Section title="Liabilities" rows={liabilities.map((a) => ({ label: `${a.code} · ${a.name}`, value: a.bal }))} total={liabilities.reduce((s, a) => s + a.bal, 0)} />
            <Section
              title="Equity"
              rows={[
                ...equity.map((a) => ({ label: `${a.code} · ${a.name}`, value: a.bal })),
                { label: "Net profit for the period", value: netProfit },
              ]}
              total={totalEquity}
            />
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
              <span>Liabilities + Equity</span>
              <span>{formatINR(totalLiabilities + totalEquity)}</span>
            </div>
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