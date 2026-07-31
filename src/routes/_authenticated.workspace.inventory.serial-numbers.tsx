import { createFileRoute } from "@tanstack/react-router";
import { Hash } from "lucide-react";
import { useMemo, useState } from "react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { RowActions } from "@/components/RowActions";
import { SerialFormDialog } from "@/features/inventory/components/SerialFormDialog";
import { useItems, useWarehouses, fmtDate } from "@/features/inventory/api";
import { useSerials, useInvCustomers, exportCsv, type SerialRow } from "@/features/inventory/inventory-api";
import { STATUS_TONES } from "@/features/inventory/data";

export const Route = createFileRoute("/_authenticated/workspace/inventory/serial-numbers")({
  component: SerialsPage,
});

function SerialsPage() {
  const { data: serials = [], isLoading } = useSerials();
  const { data: items = [] } = useItems();
  const { data: warehouses = [] } = useWarehouses();
  const { data: customers = [] } = useInvCustomers();
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SerialRow | null>(null);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const whMap = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);
  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const data = serials.filter((s) => !status || s.status === status);

  const columns: Column<SerialRow>[] = [
    { header: "Serial #", cell: (r) => <span className="font-mono text-sm font-medium">{r.serial_no}</span> },
    { header: "Item", cell: (r) => {
      const it = itemMap.get(r.item_id);
      return <div><div className="font-medium">{it?.name ?? "—"}</div><div className="text-xs text-muted-foreground">{it?.sku ?? ""}</div></div>;
    } },
    { header: "Warehouse", cell: (r) => (r.warehouse_id ? whMap.get(r.warehouse_id)?.name ?? "—" : "—") },
    { header: "Batch", cell: (r) => r.batch_no ?? "—" },
    { header: "Received", cell: (r) => fmtDate(r.received_on) },
    { header: "Warranty End", cell: (r) => fmtDate(r.warranty_end) },
    { header: "Customer", cell: (r) => (r.customer_id ? custMap.get(r.customer_id)?.name ?? "—" : <span className="text-xs text-muted-foreground">—</span>) },
    { header: "Status", cell: (r) => <StatusBadge label={r.status.replace(/_/g, " ")} tone={STATUS_TONES[r.status] ?? STATUS_TONES.draft} /> },
    { header: "", align: "right", cell: (r) => (
      <RowActions onEdit={() => { setEditing(r); setOpen(true); }} table="item_serials" id={r.id}
        invalidateKeys={[["inv", "serials"]]} label={`serial ${r.serial_no}`} />
    ) },
  ];

  return (
    <>
      <InventoryTable<SerialRow>
        title="Serial Numbers" description="Serialised stock with warranty & customer tracking." icon={Hash}
        data={data} columns={columns} loading={isLoading}
        searchable={(r) => `${r.serial_no} ${itemMap.get(r.item_id)?.name ?? ""} ${itemMap.get(r.item_id)?.sku ?? ""}`}
        filters={[{ key: "s", label: "Status", value: status, onChange: setStatus, options: [
          { value: "in_stock", label: "In stock" }, { value: "reserved", label: "Reserved" },
          { value: "issued", label: "Issued" }, { value: "quarantine", label: "Quarantine" },
        ] }]}
        kpis={[
          { label: "Serials", value: String(serials.length) },
          { label: "In stock", value: String(serials.filter((s) => s.status === "in_stock").length) },
          { label: "Reserved", value: String(serials.filter((s) => s.status === "reserved").length) },
          { label: "Issued", value: String(serials.filter((s) => s.status === "issued").length) },
        ]}
        newLabel="New Serial"
        onNew={() => { setEditing(null); setOpen(true); }}
        onExport={() => exportCsv("serials.csv", data.map((s) => ({
          serial_no: s.serial_no, item: itemMap.get(s.item_id)?.name ?? "", status: s.status,
          warehouse: s.warehouse_id ? whMap.get(s.warehouse_id)?.name ?? "" : "",
          warranty_end: s.warranty_end ?? "",
        })))}
      />
      <SerialFormDialog open={open} onOpenChange={setOpen} initial={editing} />
    </>
  );
}
