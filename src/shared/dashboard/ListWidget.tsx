import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Row {
  key: string;
  primary: string;
  secondary?: string;
  value: string;
  meta?: string;
  progress?: number; // 0-100
}

interface Props {
  title: string;
  description?: string;
  rows: Row[];
  action?: ReactNode;
  className?: string;
}

export function ListWidget({ title, description, rows, action, className }: Props) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <ul className="mt-3 divide-y divide-border">
        {rows.map((r, i) => (
          <li key={r.key} className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-medium text-accent-foreground tabular-nums">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.primary}</div>
                  {r.secondary && <div className="text-xs text-muted-foreground truncate">{r.secondary}</div>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold tabular-nums">{r.value}</div>
                {r.meta && <div className="text-xs text-muted-foreground">{r.meta}</div>}
              </div>
            </div>
            {typeof r.progress === "number" && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, r.progress))}%` }} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
