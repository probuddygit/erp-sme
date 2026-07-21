import { createFileRoute } from "@tanstack/react-router";
import { Package, MoreHorizontal, Pencil, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import {
  ITEMS, STATUS_TONES, WAREHOUSES, CATEGORIES_LIST, formatINR, formatNum,
  itemStockStatus, type Item,
} from "@/features/inventory/data";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/workspace/inventory/items")({
  component: ItemsPage,
});

function ItemsPage() {
  const [category, setCategory] = useState("");
  const [wh, setWh] = useState("");
  const [status, setStatus] = useState("");

  const filtered = ITEMS.filter((i) =>
    (!category || i.category === category) &&
    (!wh || i.warehouse === wh) &&
    (!status || itemStockStatus(i) === status),
  );

  const columns: Column<Item>[] = [
    { header: "Code",    cell: (r) => <span className="font-medium">{r.code}</span> },
    { header: "Item",    cell: (r) => (
      <div>
        <div className="font-medium">{r.name}</div>
        <div className="text-xs text-muted-foreground">HSN {r.hsn} · GST {r.gst}%</div>
      </div>
    ) },
    { header: "Category",  cell: (r) => <span className="text-sm">{r.category}</span> },
    { header: "Warehouse", cell: (r) => <span className="text-sm text-muted-foreground">{r.warehouse}</span> },
    { header: "On Hand", align: "right", cell: (r) => <span className="font-medium">{formatNum(r.onHand)} {r.uom}</span> },
    { header: "Reorder", align: "right", cell: (r) => <span className="text-sm">{r.reorder}</span> },
    { header: "Rate",    align: "right", cell: (r) => formatINR(r.rate) },
    { header: "Stock",   cell: (r) => {
      const s = itemStockStatus(r);
      return <StatusBadge label={s.replace(/_/g, " ")} tone={STATUS_TONES[s]} />;
    } },
    { header: "Status",  cell: (r) => <StatusBadge label={r.status} tone={STATUS_TONES[r.status]} /> },
    { header: "", align: "right", cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
          <DropdownMenuItem><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
          <DropdownMenuItem className="text-rose-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) },
  ];

  const totalValue = filtered.reduce((s, i) => s + i.onHand * i.rate, 0);
  const lowCount = filtered.filter((i) => itemStockStatus(i) === "low_stock").length;
  const outCount = filtered.filter((i) => itemStockStatus(i) === "out_of_stock").length;

  return (
    <InventoryTable<Item>
      title="Items"
      description="Master list of stockable items across warehouses."
      icon={Package}
      data={filtered}
      columns={columns}
      searchable={(r) => `${r.code} ${r.name} ${r.category} ${r.warehouse}`}
      filters={[
        { key: "cat", label: "Category", value: category, onChange: setCategory,
          options: CATEGORIES_LIST.map((c) => ({ value: c, label: c })) },
        { key: "wh", label: "Warehouse", value: wh, onChange: setWh,
          options: WAREHOUSES.map((w) => ({ value: w.name, label: w.name })) },
        { key: "st", label: "Stock", value: status, onChange: setStatus,
          options: [
            { value: "in_stock", label: "In stock" },
            { value: "low_stock", label: "Low stock" },
            { value: "out_of_stock", label: "Out of stock" },
          ] },
      ]}
      kpis={[
        { label: "Items", value: String(filtered.length) },
        { label: "Stock Value", value: formatINR(totalValue) },
        { label: "Low Stock", value: String(lowCount) },
        { label: "Out of Stock", value: String(outCount) },
      ]}
      newLabel="New Item"
    />
  );
}
