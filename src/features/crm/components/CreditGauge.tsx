import { formatINR } from "@/features/crm/api";

export function CreditGauge({ limit, outstanding }: { limit: number; outstanding: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((outstanding / limit) * 100)) : 0;
  const tone = pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  const label = pct >= 90 ? "text-rose-700" : pct >= 70 ? "text-amber-800" : "text-emerald-700";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Credit used</span>
        <span className={`text-xs font-semibold ${label}`}>{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Outstanding {formatINR(outstanding)}</span>
        <span className="font-medium">Limit {formatINR(limit)}</span>
      </div>
    </div>
  );
}