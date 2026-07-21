import { createFileRoute } from "@tanstack/react-router";
import { Hash, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { SERIALS, STATUS_TONES, formatDate, type SerialNo } from "@/features/inventory/data";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/workspace/inventory/serial-numbers")({
  component: SerialsPage,
});

function SerialsPage() {
  const [status, setStatus] = useState("");
  const data = SERIALS.filter((s) => !status || s.status === status);
  const columns: Column<SerialNo>[] = [
    { header: "Serial #", cell: (r) => <span className="font-mono text-sm font-medium">{r.serialNo}</span> },
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.itemName}</div><div className="text-xs text-muted-foreground">{r.itemCode}</div></div> },
    { header: "Warehouse", cell: (r) => r.warehouse },
    { header: "Received", cell: (r) => formatDate(r.receivedOn) },
    { header: "Warranty End", cell: (r) => formatDate(r.warrantyEnd) },
    { header: "Customer", cell: (r) => r.customer ?? <span className="text-xs text-muted-foreground">—</span> },
    { header: "Status", cell: (r) => <StatusBadge label={r.status.replace(/_/g, " ")} tone={STATUS_TONES[r.status]} /> },
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
    <InventoryTable<SerialNo>
      title="Serial Numbers" description="Serialised stock with warranty & customer tracking." icon={Hash}
      data={data} columns={columns}
      searchable={(r) => `${r.serialNo} ${r.itemCode} ${r.itemName} ${r.customer ?? ""}`}
      filters={[{ key: "s", label: "Status", value: status, onChange: setStatus,
        options: [
          { value: "in_stock", label: "In stock" }, { value: "reserved", label: "Reserved" },
          { value: "OUT", label: "Issued" }, { value: "quarantine", label: "Quarantine" },
        ] }]}
      kpis={[
        { label: "Serials", value: String(SERIALS.length) },
        { label: "In stock", value: String(SERIALS.filter((s) => s.status === "in_stock").length) },
        { label: "Reserved", value: String(SERIALS.filter((s) => s.status === "reserved").length) },
        { label: "Issued", value: String(SERIALS.filter((s) => s.status === "OUT").length) },
      ]}
      newLabel="New Serial"
    />
  );
}
