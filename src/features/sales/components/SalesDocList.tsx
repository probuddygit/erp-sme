import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, type LucideIcon } from "lucide-react";
import { FilesCountCell } from "@/features/attachments/components/FilesCountCell";
import type { EntityType } from "@/features/attachments/api";
import { PageHeader } from "@/shared/components/PageHeader";
import { StatCard } from "@/shared/components/StatCard";
import { RowActions } from "@/components/RowActions";
import { inr } from "@/lib/sales-utils";

export interface DocColumn<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T extends { id: string }> {
  title: string;
  description: string;
  icon: LucideIcon;
  rows: T[];
  isLoading?: boolean;
  searchable?: (row: T) => string;
  columns: DocColumn<T>[];
  totalOf?: (row: T) => number;
  onCreate: () => void;
  onEdit: (row: T) => void;
  onDelete: (row: T) => Promise<void>;
  canEdit?: (row: T) => boolean;
  canDelete?: (row: T) => boolean;
  headerActions?: React.ReactNode;
  entityType?: EntityType;
  rowExtraActions?: (row: T) => React.ReactNode;
}

export function SalesDocList<T extends { id: string }>({
  title, description, icon: Icon, rows, isLoading, searchable, columns,
  totalOf, onCreate, onEdit, onDelete, canEdit, canDelete, headerActions, entityType, rowExtraActions,
}: Props<T>) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const term = q.toLowerCase();
    return rows.filter((r) => (searchable?.(r) ?? "").toLowerCase().includes(term));
  }, [rows, q, searchable]);

  const total = useMemo(() => filtered.reduce((s, r) => s + (totalOf?.(r) ?? 0), 0), [filtered, totalOf]);
  const ids = useMemo(() => filtered.map((r) => r.id), [filtered]);

  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description} breadcrumbs={[{ label: "Workspace" }, { label: "Sales" }, { label: title }]} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Records" value={String(filtered.length)} icon={Icon} />
        <StatCard label="Total value" value={inr(total)} icon={Icon} />
        <StatCard label="Loaded" value={isLoading ? "…" : "Live"} icon={Icon} hint="Backend data" />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} className="pl-8" />
            </div>
            {headerActions}
            <Button size="sm" onClick={onCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> New {title.replace(/s$/, "")}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.header} className={c.className}>{c.header}</TableHead>
                  ))}
                  {entityType && <TableHead className="text-center w-20">Files</TableHead>}
                  <TableHead className="text-right w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={columns.length + (entityType ? 2 : 1)} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={columns.length + (entityType ? 2 : 1)} className="py-10 text-center text-muted-foreground">No records yet. Click “New {title.replace(/s$/, "")}” to add one.</TableCell></TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      {columns.map((c) => (
                        <TableCell key={c.header} className={c.className}>{c.cell(row)}</TableCell>
                      ))}
                      {entityType && (
                        <TableCell className="text-center">
                          <FilesCountCell entityType={entityType} entityIds={ids} entityId={row.id} />
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-0.5">
                        {rowExtraActions?.(row)}
                        <RowActions
                          onEdit={() => onEdit(row)}
                          onDelete={() => onDelete(row)}
                          canEdit={canEdit ? canEdit(row) : true}
                          canDelete={canDelete ? canDelete(row) : true}
                          label={title.replace(/s$/, "").toLowerCase()}
                        />
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StatusChip({ value, tone = "muted" }: { value: string; tone?: "muted" | "success" | "warning" | "danger" | "info" }) {
  const map: Record<string, string> = {
    muted: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-primary/10 text-primary",
  };
  return <Badge variant="outline" className={`capitalize ${map[tone]}`}>{value.replace(/_/g, " ")}</Badge>;
}

export function toneForStatus(status: string): "muted" | "success" | "warning" | "danger" | "info" {
  const s = status.toLowerCase();
  if (["paid", "accepted", "delivered", "fulfilled", "received", "confirmed"].includes(s)) return "success";
  if (["draft"].includes(s)) return "muted";
  if (["sent", "dispatched", "processing", "approved"].includes(s)) return "info";
  if (["partial", "partially_paid", "unpaid", "pending"].includes(s)) return "warning";
  if (["cancelled", "rejected", "expired", "overdue"].includes(s)) return "danger";
  return "muted";
}

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}