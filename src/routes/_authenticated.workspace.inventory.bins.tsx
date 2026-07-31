import { createFileRoute } from "@tanstack/react-router";
import { Grid3x3 } from "lucide-react";
import { useMemo, useState } from "react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { RowActions } from "@/components/RowActions";
import { BinFormDialog } from "@/features/inventory/components/BinFormDialog";
import { useWarehouses } from "@/features/inventory/api";
import { useBins, exportCsv, type BinRow } from "@/features/inventory/inventory-api";
import { STATUS_TONES } from "@/features/inventory/data";

export const Route = createFileRoute("/_authenticated/workspace/inventory/bins")({
  component: BinsPage,
});

function BinsPage() {
  const { data: bins = [], isLoading } = useBins();
  const { data: warehouses = [] } = useWarehouses();
  const [wh, setWh] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BinRow | null>(null);

  const whMap = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);
  const data = bins.filter((b) => !wh || b.warehouse_id === wh);

  const columns: Column<BinRow>[] = [
    { header: "Bin Code", cell: (r) => <span className="font-mono text-sm font-medium">{r.code}</span> },
    { header: "Warehouse", cell: (r) => whMap.get(r.warehouse_id)?.name ?? "—" },
    { header: "Zone", cell: (r) => r.zone ?? "—" },
    { header: "Rack", cell: (r) => r.rack ?? "—" },
    { header: "Shelf", cell: (r) => r.shelf ?? "—" },
    { header: "Utilization", cell: (r) => {
      const cap = Number(r.capacity) || 0;
      const pct = cap ? Math.min(100, Math.round((Number(r.used) / cap) * 100)) : 0;
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div className={pct > 80 ? "h-full bg-rose-500" : "h-full bg-emerald-500"} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs">{Number(r.used)}/{cap}</span>
        </div>
      );
    } },
    { header: "Status", cell: (r) => <StatusBadge label={r.is_active ? "active" : "inactive"} tone={STATUS_TONES[r.is_active ? "active" : "inactive"]} /> },
    { header: "", align: "right", cell: (r) => (
      <RowActions onEdit={() => { setEditing(r); setOpen(true); }} table="inventory_bins" id={r.id}
        invalidateKeys={[["inv", "bins"]]} label={`bin ${r.code}`} />
    ) },
  ];

  const totalCap = data.reduce((s, b) => s + Number(b.capacity), 0);
  const totalUsed = data.reduce((s, b) => s + Number(b.used), 0);

  return (
    <>
      <InventoryTable<BinRow>
        title="Bins" description="Bin-level storage locations inside warehouses." icon={Grid3x3}
        data={data} columns={columns} loading={isLoading}
        searchable={(r) => `${r.code} ${r.zone ?? ""} ${r.rack ?? ""} ${whMap.get(r.warehouse_id)?.name ?? ""}`}
        filters={[{ key: "wh", label: "Warehouse", value: wh, onChange: setWh, options: warehouses.map((w) => ({ value: w.id, label: w.name })) }]}
        kpis={[
          { label: "Bins", value: String(data.length) },
          { label: "Active", value: String(data.filter((b) => b.is_active).length) },
          { label: "Capacity", value: String(totalCap) },
          { label: "Utilization", value: `${totalCap ? Math.round((totalUsed / totalCap) * 100) : 0}%` },
        ]}
        newLabel="New Bin"
        onNew={() => { setEditing(null); setOpen(true); }}
        onExport={() => exportCsv("bins.csv", data.map((b) => ({
          code: b.code, warehouse: whMap.get(b.warehouse_id)?.name ?? "", zone: b.zone, rack: b.rack,
          shelf: b.shelf, capacity: b.capacity, used: b.used, active: b.is_active,
        })))}
      />
      <BinFormDialog open={open} onOpenChange={setOpen} initial={editing} />
    </>
  );
}
