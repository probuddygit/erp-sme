import { createFileRoute } from "@tanstack/react-router";
import { ReportCard } from "@/features/finance/components/ReportCard";
import { StatCard } from "@/shared/components/StatCard";
import { TrendingUp, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { ALL_ENTRIES, accountBalance, formatINR, formatINRSigned } from "@/features/finance/data";

export const Route = createFileRoute("/_authenticated/workspace/finance/cash-flow")({
  component: CashFlowPage,
});

const CASH_CODES = ["1110", "1120", "1121"];

function CashFlowPage() {
  const opening = CASH_CODES.reduce((s, c) => {
    const bal = accountBalance(c);
    const moves = ALL_ENTRIES.filter((e) => e.status === "posted").flatMap((e) => e.lines.filter((l) => l.accountCode === c));
    const flow = moves.reduce((sum, l) => sum + l.debit - l.credit, 0);
    return s + (bal - flow);
  }, 0);

  const cashEntries = ALL_ENTRIES.filter((e) => e.status === "posted" && e.lines.some((l) => CASH_CODES.includes(l.accountCode)));
  const bucket = (e: (typeof cashEntries)[number]): "operating" | "investing" | "financing" => {
    const codes = e.lines.map((l) => l.accountCode);
    if (codes.some((c) => ["1510", "1520", "1530"].includes(c))) return "investing";
    if (codes.some((c) => ["2200", "3100"].includes(c))) return "financing";
    return "operating";
  };

  const rows = cashEntries.map((e) => {
    const cashChange = e.lines.filter((l) => CASH_CODES.includes(l.accountCode)).reduce((s, l) => s + l.debit - l.credit, 0);
    return { entry: e, activity: bucket(e), amount: cashChange };
  });

  const operating = rows.filter((r) => r.activity === "operating").reduce((s, r) => s + r.amount, 0);
  const investing = rows.filter((r) => r.activity === "investing").reduce((s, r) => s + r.amount, 0);
  const financing = rows.filter((r) => r.activity === "financing").reduce((s, r) => s + r.amount, 0);
  const netChange = operating + investing + financing;
  const closing = opening + netChange;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Opening cash" value={formatINR(opening)} icon={TrendingUp} />
        <StatCard label="Inflows" value={formatINR(rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0))} icon={ArrowDownRight} />
        <StatCard label="Outflows" value={formatINR(Math.abs(rows.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0)))} icon={ArrowUpRight} />
        <StatCard label="Closing cash" value={formatINR(closing)} icon={TrendingUp} trend={{ value: formatINRSigned(netChange), positive: netChange >= 0 }} />
      </div>

      <ReportCard title="Cash Flow Statement" subtitle="Cash and cash-equivalents movements, grouped by activity.">
        <div className="space-y-4">
          <Activity title="Operating activities" rows={rows.filter((r) => r.activity === "operating")} total={operating} />
          <Activity title="Investing activities" rows={rows.filter((r) => r.activity === "investing")} total={investing} />
          <Activity title="Financing activities" rows={rows.filter((r) => r.activity === "financing")} total={financing} />
          <div className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <Row label="Opening cash & bank" value={opening} />
            <Row label="Net change during period" value={netChange} bold />
            <Row label="Closing cash & bank" value={closing} bold />
          </div>
        </div>
      </ReportCard>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={"flex items-center justify-between " + (bold ? "font-semibold" : "text-muted-foreground")}>
      <span>{label}</span>
      <span className={bold ? (value >= 0 ? "text-emerald-600" : "text-destructive") : ""}>{formatINRSigned(value)}</span>
    </div>
  );
}

function Activity({ title, rows, total }: { title: string; rows: { entry: { number: string; narration: string; date: string }; amount: number }[]; total: number }) {
  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="divide-y divide-border">
        {rows.length === 0 ? (
          <div className="px-3 py-3 text-sm text-muted-foreground">No cash movements in this activity.</div>
        ) : rows.map((r) => (
          <div key={r.entry.number} className="flex items-center justify-between px-3 py-2 text-sm">
            <div>
              <div className="font-medium">{r.entry.number}</div>
              <div className="text-[11px] text-muted-foreground">{r.entry.narration}</div>
            </div>
            <span className={r.amount >= 0 ? "text-emerald-600" : "text-destructive"}>{formatINRSigned(r.amount)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between bg-muted/20 px-3 py-2 text-sm font-semibold">
          <span>Net {title.toLowerCase()}</span>
          <span className={total >= 0 ? "text-emerald-600" : "text-destructive"}>{formatINRSigned(total)}</span>
        </div>
      </div>
    </div>
  );
}