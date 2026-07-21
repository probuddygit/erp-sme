import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface CalendarItem { id: string; date: string; }

interface Props<T extends CalendarItem> {
  items: T[];
  renderItem: (item: T) => ReactNode;
}

export function CalendarView<T extends CalendarItem>({ items, renderItem }: Props<T>) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });

  const { grid, monthLabel } = useMemo(() => {
    const first = new Date(cursor);
    first.setDate(1);
    const startWeekday = first.getDay(); // 0 = Sun
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return {
      grid: cells,
      monthLabel: cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    };
  }, [cursor]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, T[]>();
    items.forEach((it) => {
      const key = new Date(it.date).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    });
    return map;
  }, [items]);

  const today = new Date().toDateString();

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="text-sm font-semibold">{monthLabel}</div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { const n = new Date(); n.setDate(1); setCursor(n); }}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-1.5 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((day, i) => {
          const key = day?.toDateString() ?? `empty-${i}`;
          const dayItems = day ? itemsByDay.get(day.toDateString()) ?? [] : [];
          const isToday = day?.toDateString() === today;
          return (
            <div
              key={key}
              className={cn(
                "min-h-[100px] border-b border-r border-border p-1.5 text-xs",
                !day && "bg-muted/20",
                (i + 1) % 7 === 0 && "border-r-0",
              )}
            >
              {day && (
                <>
                  <div className={cn("mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium", isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((it) => (
                      <div key={it.id}>{renderItem(it)}</div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">+{dayItems.length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}