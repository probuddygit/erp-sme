import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
  onCardDrop?: (itemKey: string, toColumnKey: string, fromColumnKey: string) => void;
}

export function KanbanBoard<T>({ columns, renderCard, getKey, summary, onCardDrop }: Props<T>) {
  const [dragging, setDragging] = useState<{ key: string; from: string } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const dnd = !!onCardDrop;
  return (
    <div className="grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(240px, 1fr))` }}>
      {columns.map((col) => (
        <div
          key={col.key}
          onDragOver={dnd ? (e) => { e.preventDefault(); setOver(col.key); } : undefined}
          onDragLeave={dnd ? () => setOver((c) => (c === col.key ? null : c)) : undefined}
          onDrop={dnd ? (e) => {
            e.preventDefault();
            setOver(null);
            if (dragging && dragging.from !== col.key) onCardDrop!(dragging.key, col.key, dragging.from);
            setDragging(null);
          } : undefined}
          className={cn(
            "flex flex-col rounded-xl border bg-muted/30 transition-colors",
            over === col.key ? "border-primary bg-primary/5" : "border-border",
          )}
        >
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
              col.items.map((item) => {
                const k = getKey(item);
                return (
                  <div
                    key={k}
                    draggable={dnd}
                    onDragStart={dnd ? (e) => {
                      setDragging({ key: k, from: col.key });
                      e.dataTransfer.effectAllowed = "move";
                    } : undefined}
                    onDragEnd={dnd ? () => { setDragging(null); setOver(null); } : undefined}
                    className={cn(
                      "rounded-lg border border-border bg-card p-3 shadow-sm hover:border-primary/40 transition-colors",
                      dnd && "cursor-grab active:cursor-grabbing",
                      dragging?.key === k && "opacity-50",
                    )}
                  >
                    {renderCard(item)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}