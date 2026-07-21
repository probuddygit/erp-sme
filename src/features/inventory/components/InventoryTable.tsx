import { useMemo, useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, type LucideIcon } from "lucide-react";
import { StatCard } from "@/shared/components/StatCard";
import { FilterBar, type FilterSpec } from "@/features/crm/components/FilterBar";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}

interface Props<T> {
  title: string;
  description: string;
  icon: LucideIcon;
  data: T[];
  columns: Column<T>[];
  searchable?: (row: T) => string;
  filters?: FilterSpec[];
  kpis?: { label: string; value: string; hint?: string }[];
  newLabel?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
}

export function InventoryTable<T extends { id: string }>({
  title, description, icon: Icon, data, columns, searchable, filters,
  kpis, newLabel = "New", pageSize = 8, onRowClick,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || !searchable) return data;
    return data.filter((r) => searchable(r).toLowerCase().includes(term));
  }, [data, search, searchable]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      {kpis && kpis.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <StatCard key={k.label} label={k.label} value={k.value} icon={Icon} hint={k.hint} />
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <FilterBar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
            placeholder={`Search ${title.toLowerCase()}…`}
            filters={filters}
            actions={
              <>
                <Button size="sm" variant="outline"><Download className="mr-1.5 h-4 w-4" /> Export</Button>
                <Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> {newLabel}</Button>
              </>
            }
          />

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead
                      key={c.header}
                      className={c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}
                    >
                      {c.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                      No records match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageData.map((r) => (
                    <TableRow
                      key={r.id}
                      className={onRowClick ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/30"}
                      onClick={onRowClick ? () => onRowClick(r) : undefined}
                    >
                      {columns.map((c) => (
                        <TableCell
                          key={c.header}
                          className={[
                            c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "",
                            c.className ?? "",
                          ].join(" ")}
                        >
                          {c.cell(r)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
            <div>
              Showing {(pageData.length === 0 ? 0 : (page - 1) * pageSize + 1)}–
              {(page - 1) * pageSize + pageData.length} of {filtered.length}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <span className="px-2">Page {page} / {pageCount}</span>
              <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}
