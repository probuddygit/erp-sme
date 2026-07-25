import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { RowActions } from "@/components/RowActions";
import { ItemFormDialog } from "@/features/inventory/components/ItemFormDialog";
import { useItems, useStockLevels, fmtINR, fmtNum } from "@/features/inventory/api";
import { STATUS_TONES } from "@/features/inventory/data";
import { useMemo, useState } from "react";
import type { Database } from "@/integrations/supabase/types";

type ItemRow = Database["public"]["Tables"]["items"]["Row"];

export const Route = createFileRoute("/_authenticated/workspace/inventory/items")({
  component: ItemsPage,
});

function ItemsPage() {
  const { data: items = [], isLoading } = useItems();
  const { data: levels = [] } = useStockLevels();
  const [type, setType] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ItemRow | null>(null);

  const onHandByItem = useMemo(() => {
    const m = new Map<string, { qty: number; value: number }>();
    levels.forEach((l) => {
      const prev = m.get(l.item_id) ?? { qty: 0, value: 0 };
      m.set(l.item_id, { qty: prev.qty + Number(l.on_hand), value: prev.value + Number(l.value) });
    });
    return m;
  }, [levels]);

  const stockStatusOf = (i: ItemRow) => {
    const onHand = onHandByItem.get(i.id)?.qty ?? 0;
    const min = Number(i.reorder_level ?? i.min_stock ?? 0);
    if (onHand === 0) return "out_of_stock";
    if (min > 0 && onHand < min) return "low_stock";
    return "in_stock";
  };

  const filtered = items.filter((i) =>
    (!type || i.item_type === type) &&
    (!stockStatus || stockStatusOf(i) === stockStatus),
  );

  const columns: Column<ItemRow>[] = [
    { header: "SKU",  cell: (r) => <span className="font-medium">{r.sku}</span> },
    { header: "Item", cell: (r) => (
      <div>
        <div className="font-medium">{r.name}</div>
        <div className="text-xs text-muted-foreground">HSN {r.hsn_code ?? "—"} · {r.item_type.replace(/_/g, " ")}</div>
      </div>
    ) },
    { header: "UoM", cell: (r) => <span className="text-sm">{r.unit}</span> },
    { header: "On Hand", align: "right", cell: (r) => <span className="font-medium">{fmtNum(onHandByItem.get(r.id)?.qty ?? 0)} {r.unit}</span> },
    { header: "Reorder", align: "right", cell: (r) => <span className="text-sm">{r.reorder_level ?? r.min_stock ?? 0}</span> },
    { header: "Cost",    align: "right", cell: (r) => fmtINR(Number(r.standard_cost ?? 0)) },
    { header: "Stock",   cell: (r) => {
      const s = stockStatusOf(r);
      return <StatusBadge label={s.replace(/_/g, " ")} tone={STATUS_TONES[s]} />;
    } },
    { header: "Status", cell: (r) => <StatusBadge label={r.is_active ? "active" : "inactive"} tone={STATUS_TONES[r.is_active ? "active" : "inactive"]} /> },
    { header: "", align: "right", cell: (r) => (
      <RowActions
        onEdit={() => { setEditing(r); setDialogOpen(true); }}
        table="items" id={r.id}
        invalidateKeys={[["inv", "items"]]}
        label={r.name}
      />
    ) },
  ];

  const totalValue = filtered.reduce((s, i) => s + (onHandByItem.get(i.id)?.value ?? 0), 0);
  const lowCount = filtered.filter((i) => stockStatusOf(i) === "low_stock").length;
  const outCount = filtered.filter((i) => stockStatusOf(i) === "out_of_stock").length;

  return (
    <>
      <InventoryTable<ItemRow>
        title="Items"
        description="Master list of stockable items with live on-hand from stock batches."
        icon={Package}
        data={filtered}
        columns={columns}
        loading={isLoading}
        searchable={(r) => `${r.sku} ${r.name} ${r.hsn_code ?? ""}`}
        filters={[
          { key: "type", label: "Type", value: type, onChange: setType,
            options: [
              { value: "raw_material", label: "Raw material" },
              { value: "wip", label: "WIP" },
              { value: "finished_good", label: "Finished good" },
              { value: "consumable", label: "Consumable" },
              { value: "service", label: "Service" },
            ] },
          { key: "st", label: "Stock", value: stockStatus, onChange: setStockStatus,
            options: [
              { value: "in_stock", label: "In stock" },
              { value: "low_stock", label: "Low stock" },
              { value: "out_of_stock", label: "Out of stock" },
            ] },
        ]}
        kpis={[
          { label: "Items", value: String(filtered.length) },
          { label: "Stock Value", value: fmtINR(totalValue) },
          { label: "Low Stock", value: String(lowCount) },
          { label: "Out of Stock", value: String(outCount) },
        ]}
        newLabel="New Item"
        onNew={() => { setEditing(null); setDialogOpen(true); }}
      />
      <ItemFormDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} />
    </>
  );
}
