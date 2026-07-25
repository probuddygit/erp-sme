import { createFileRoute } from "@tanstack/react-router";
import { Warehouse as WarehouseIcon } from "lucide-react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { RowActions } from "@/components/RowActions";
import { WarehouseFormDialog } from "@/features/inventory/components/WarehouseFormDialog";
import { useWarehouses, useStockLevels, fmtINR } from "@/features/inventory/api";
import { STATUS_TONES } from "@/features/inventory/data";
import { useMemo, useState } from "react";
import type { Database } from "@/integrations/supabase/types";

type WhRow = Database["public"]["Tables"]["warehouses"]["Row"];

export const Route = createFileRoute("/_authenticated/workspace/inventory/warehouses")({
  component: WarehousesPage,
});

function WarehousesPage() {
  const { data: warehouses = [], isLoading } = useWarehouses();
  const { data: levels = [] } = useStockLevels();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WhRow | null>(null);

  const totalsByWh = useMemo(() => {
    const m = new Map<string, { qty: number; value: number; skus: Set<string> }>();
    levels.forEach((l) => {
      const prev = m.get(l.warehouse_id) ?? { qty: 0, value: 0, skus: new Set() };
      prev.qty += Number(l.on_hand); prev.value += Number(l.value); prev.skus.add(l.item_id);
      m.set(l.warehouse_id, prev);
    });
    return m;
  }, [levels]);

  const columns: Column<WhRow>[] = [
    { header: "Code", cell: (r) => <span className="font-medium">{r.code}</span> },
    { header: "Warehouse", cell: (r) => <div><div className="font-medium">{r.name}</div>{r.address && <div className="text-xs text-muted-foreground">{r.address}</div>}</div> },
    { header: "SKUs", align: "right", cell: (r) => totalsByWh.get(r.id)?.skus.size ?? 0 },
    { header: "On Hand", align: "right", cell: (r) => totalsByWh.get(r.id)?.qty.toFixed(2) ?? "0" },
    { header: "Value", align: "right", cell: (r) => fmtINR(totalsByWh.get(r.id)?.value ?? 0) },
    { header: "Status", cell: (r) => <StatusBadge label={r.is_active ? "active" : "inactive"} tone={STATUS_TONES[r.is_active ? "active" : "inactive"]} /> },
    { header: "", align: "right", cell: (r) => (
      <RowActions
        onEdit={() => { setEditing(r); setOpen(true); }}
        table="warehouses" id={r.id}
        invalidateKeys={[["inv", "warehouses"]]}
        label={r.name}
      />
    ) },
  ];

  const totalValue = warehouses.reduce((s, w) => s + (totalsByWh.get(w.id)?.value ?? 0), 0);

  return (
    <>
      <InventoryTable<WhRow>
        title="Warehouses"
        description="Physical storage locations with live on-hand & value."
        icon={WarehouseIcon}
        data={warehouses}
        columns={columns}
        loading={isLoading}
        searchable={(r) => `${r.code} ${r.name} ${r.address ?? ""}`}
        kpis={[
          { label: "Warehouses", value: String(warehouses.length) },
          { label: "Active", value: String(warehouses.filter((w) => w.is_active).length) },
          { label: "Total SKUs", value: String(new Set(levels.map((l) => l.item_id)).size) },
          { label: "Total Value", value: fmtINR(totalValue) },
        ]}
        newLabel="New Warehouse"
        onNew={() => { setEditing(null); setOpen(true); }}
      />
      <WarehouseFormDialog open={open} onOpenChange={setOpen} initial={editing} />
    </>
  );
}
