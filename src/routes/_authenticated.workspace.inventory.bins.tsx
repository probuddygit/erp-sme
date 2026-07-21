import { createFileRoute } from "@tanstack/react-router";
import { Grid3x3, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { BINS, WAREHOUSES, STATUS_TONES, type Bin } from "@/features/inventory/data";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/workspace/inventory/bins")({
  component: BinsPage,
});

function BinsPage() {
  const [wh, setWh] = useState("");
  const data = BINS.filter((b) => !wh || b.warehouse === wh);
  const columns: Column<Bin>[] = [
    { header: "Bin Code", cell: (r) => <span className="font-mono text-sm font-medium">{r.code}</span> },
    { header: "Warehouse", cell: (r) => r.warehouse },
    { header: "Zone", cell: (r) => r.zone },
    { header: "Rack", cell: (r) => r.rack },
    { header: "Shelf", cell: (r) => r.shelf },
    { header: "Items", align: "right", cell: (r) => r.items },
    { header: "Utilization", cell: (r) => {
      const pct = Math.round((r.used / r.capacity) * 100);
      return <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
          <div className={pct > 80 ? "h-full bg-rose-500" : "h-full bg-emerald-500"} style={{ width: `${pct}%` }} />
        </div><span className="text-xs">{r.used}/{r.capacity}</span>
      </div>;
    } },
    { header: "Status", cell: (r) => <StatusBadge label={r.status} tone={STATUS_TONES[r.status]} /> },
    { header: "", align: "right", cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
          <DropdownMenuItem><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
          <DropdownMenuItem className="text-rose-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) },
  ];

  return (
    <InventoryTable<Bin>
      title="Bins"
      description="Bin-level storage locations inside warehouses."
      icon={Grid3x3}
      data={data}
      columns={columns}
      searchable={(r) => `${r.code} ${r.warehouse} ${r.zone} ${r.rack}`}
      filters={[{ key: "wh", label: "Warehouse", value: wh, onChange: setWh, options: WAREHOUSES.map((w) => ({ value: w.name, label: w.name })) }]}
      kpis={[
        { label: "Bins", value: String(data.length) },
        { label: "Active", value: String(data.filter((b) => b.status === "active").length) },
        { label: "Capacity", value: String(data.reduce((s, b) => s + b.capacity, 0)) },
        { label: "Utilization", value: `${Math.round((data.reduce((s, b) => s + b.used, 0) / Math.max(1, data.reduce((s, b) => s + b.capacity, 0))) * 100)}%` },
      ]}
      newLabel="New Bin"
    />
  );
}
