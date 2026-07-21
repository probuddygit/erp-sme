import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  sublabel?: string;
  icon?: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive" | "info";
  delta?: { value: string; positive?: boolean };
  spark?: number[];
  className?: string;
}

const accentMap = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-accent text-accent-foreground",
} as const;

export function KpiWidget({ label, value, sublabel, icon: Icon, accent = "info", delta, spark, className }: Props) {
  return (
    <div className={cn("group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
          {sublabel && <div className="mt-0.5 text-xs text-muted-foreground">{sublabel}</div>}
        </div>
        {Icon && (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", accentMap[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        {delta ? (
          <div className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            delta.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
            {delta.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta.value}
          </div>
        ) : <span />}
        {spark && spark.length > 1 && <Sparkline data={spark} positive={delta?.positive} />}
      </div>
    </div>
  );
}

function Sparkline({ data, positive = true }: { data: number[]; positive?: boolean }) {
  const w = 80, h = 28;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        fill="none"
        stroke={positive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
