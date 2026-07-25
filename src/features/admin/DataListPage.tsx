import { useMemo, useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Trash2, MoreHorizontal, Download } from "lucide-react";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  searchKeys?: (keyof T)[];
  actionLabel?: string;
  onAction?: () => void;
  extraActions?: ReactNode;
  emptyLabel?: string;
  rowActions?: boolean;
}

export function DataListPage<T extends { id: string | number }>({
  columns, rows, searchKeys = [], actionLabel = "New", onAction, extraActions, emptyLabel = "No records", rowActions = true,
}: Props<T>) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) =>
      searchKeys.some((k) => String((r as any)[k] ?? "").toLowerCase().includes(s)),
    );
  }, [q, rows, searchKeys]);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" />Export</Button>
            {extraActions}
            {onAction && (
              <Button size="sm" onClick={onAction}>
                <Plus className="h-4 w-4 mr-1.5" />{actionLabel}
              </Button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {columns.map((c) => (
                  <th key={String(c.key)} className={"px-4 py-2.5 text-left font-medium " + (c.className ?? "")}>
                    {c.header}
                  </th>
                ))}
                {rowActions && <th className="px-4 py-2.5 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (rowActions ? 1 : 0)} className="p-10 text-center text-sm text-muted-foreground">
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={String(r.id)} className="border-t border-border hover:bg-muted/30">
                    {columns.map((c) => (
                      <td key={String(c.key)} className={"px-4 py-3 " + (c.className ?? "")}>
                        {c.render ? c.render(r) : String((r as any)[c.key] ?? "—")}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
          <span>{filtered.length} of {rows.length} records</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>Prev</Button>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "warn" | "danger" | "info" }) {
  const map = {
    default: "bg-muted text-foreground",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  };
  return <Badge variant="secondary" className={"font-medium " + map[tone]}>{children}</Badge>;
}