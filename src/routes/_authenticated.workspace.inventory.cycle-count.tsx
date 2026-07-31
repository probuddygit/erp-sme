import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { RowActions } from "@/components/RowActions";
import { CycleCountDialog } from "@/features/inventory/components/CycleCountDialog";
import { useWarehouses, fmtDate } from "@/features/inventory/api";
import { useCycleCounts, usePostCycleCount, exportCsv, type CycleCountWithLines } from "@/features/inventory/inventory-api";
import { STATUS_TONES } from "@/features/inventory/data";

export const Route = createFileRoute("/_authenticated/workspace/inventory/cycle-count")({
  component: CycleCountPage,
});

function CycleCountPage() {
  const { data: counts = [], isLoading } = useCycleCounts();
  const { data: warehouses = [] } = useWarehouses();
  const post = usePostCycleCount();
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CycleCountWithLines | null>(null);

  const whMap = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);
  const data = counts.filter((c) => !status || c.status === status);

  const columns: Column<CycleCountWithLines>[] = [
    { header: "Count #", cell: (r) => <span className="font-medium">{r.count_number}</span> },
    { header: "Warehouse", cell: (r) => <div><div>{whMap.get(r.warehouse_id)?.name ?? "—"}</div>{r.zone && <div className="text-xs text-muted-foreground">{r.zone}</div>}</div> },
    { header: "Scheduled", cell: (r) => fmtDate(r.scheduled_date) },
    { header: "Lines", align: "right", cell: (r) => r.line_count },
    { header: "Variance", align: "right", cell: (r) => (
      <span className={r.variance === 0 ? "text-muted-foreground" : r.variance > 0 ? "font-medium text-emerald-600" : "font-medium text-rose-600"}>
        {r.variance > 0 ? `+${r.variance}` : r.variance}
      </span>
    ) },
    { header: "Completed", cell: (r) => r.completed_at ? fmtDate(r.completed_at) : "—" },
    { header: "Status", cell: (r) => <StatusBadge label={r.status} tone={STATUS_TONES[r.status] ?? STATUS_TONES.draft} /> },
    { header: "", align: "right", cell: (r) => (
      <div className="flex items-center justify-end gap-1">
        {r.status !== "completed" && (
          <Button size="sm" variant="outline" disabled={post.isPending || r.line_count === 0}
            onClick={() => post.mutate(r.id)}>
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Post
          </Button>
        )}
        <RowActions
          onEdit={r.status === "completed" ? undefined : () => { setEditing(r); setOpen(true); }}
          table="cycle_counts" id={r.id} invalidateKeys={[["inv", "cycle-counts"]]}
          label={`cycle count ${r.count_number}`} canDelete={r.status !== "completed"} />
      </div>
    ) },
  ];

  return (
    <>
      <InventoryTable<CycleCountWithLines>
        title="Cycle Counts" description="Scheduled physical counts; posting auto-creates stock adjustments for variances." icon={ClipboardCheck}
        data={data} columns={columns} loading={isLoading}
        searchable={(r) => `${r.count_number} ${r.zone ?? ""} ${whMap.get(r.warehouse_id)?.name ?? ""}`}
        filters={[{ key: "s", label: "Status", value: status, onChange: setStatus, options: [
          { value: "scheduled", label: "Scheduled" }, { value: "completed", label: "Completed" },
        ] }]}
        kpis={[
          { label: "Counts", value: String(data.length) },
          { label: "Scheduled", value: String(data.filter((c) => c.status !== "completed").length) },
          { label: "Completed", value: String(data.filter((c) => c.status === "completed").length) },
          { label: "Lines counted", value: String(data.reduce((s, c) => s + c.line_count, 0)) },
        ]}
        newLabel="New Cycle Count"
        onNew={() => { setEditing(null); setOpen(true); }}
        onExport={() => exportCsv("cycle-counts.csv", data.map((c) => ({
          count_number: c.count_number, warehouse: whMap.get(c.warehouse_id)?.name ?? "",
          scheduled: c.scheduled_date, status: c.status, lines: c.line_count, variance: c.variance,
        })))}
      />
      <CycleCountDialog open={open} onOpenChange={setOpen} initial={editing} />
    </>
  );
}
