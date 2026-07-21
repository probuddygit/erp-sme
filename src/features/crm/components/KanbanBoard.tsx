import type { ReactNode } from "react";

export interface KanbanColumn<T> {
  key: string;
  label: string;
  tone?: string;
  items: T[];
}

interface Props<T> {
  columns: KanbanColumn<T>[];
  renderCard: (item: T) => ReactNode;
  getKey: (item: T) => string;
  summary?: (items: T[]) => ReactNode;
}

export function KanbanBoard<T>({ columns, renderCard, getKey, summary }: Props<T>) {
  return (
    <div className="grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(240px, 1fr))` }}>
      {columns.map((col) => (
        <div key={col.key} className="flex flex-col rounded-xl border border-border bg-muted/30">
          <div className="flex items-center justify-between border-b border-border/70 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[11px] font-medium ${col.tone ?? "bg-card text-foreground border-border"}`}>
                {col.label}
              </span>
              <span className="text-xs text-muted-foreground">{col.items.length}</span>
            </div>
            {summary && <div className="text-xs text-muted-foreground">{summary(col.items)}</div>}
          </div>
          <div className="flex flex-col gap-2 p-2">
            {col.items.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">
                No records
              </div>
            ) : (
              col.items.map((item) => (
                <div key={getKey(item)} className="rounded-lg border border-border bg-card p-3 shadow-sm hover:border-primary/40 transition-colors">
                  {renderCard(item)}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}