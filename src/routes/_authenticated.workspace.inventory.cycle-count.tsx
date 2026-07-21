import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { CYCLE_COUNTS, STATUS_TONES, formatDate, type CycleCount } from "@/features/inventory/data";

export const Route = createFileRoute("/_authenticated/workspace/inventory/cycle-count")({
  component: CycleCountPage,
});

function CycleCountPage() {
  const columns: Column<CycleCount>[] = [
    { header: "Count #", cell: (r) => <span className="font-medium">{r.number}</span> },
    { header: "Warehouse", cell: (r) => <div><div>{r.warehouse}</div><div className="text-xs text-muted-foreground">{r.zone}</div></div> },
    { header: "Scheduled", cell: (r) => formatDate(r.scheduled) },
    { header: "Completed", cell: (r) => r.completed ? formatDate(r.completed) : <span className="text-xs text-muted-foreground">—</span> },
    { header: "Items", align: "right", cell: (r) => `${r.counted}/${r.items}` },
    { header: "Variance", align: "right", cell: (r) => r.variance },
    { header: "Assigned", cell: (r) => r.assignedTo },
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
    <InventoryTable<CycleCount>
      title="Cycle Counts" description="Periodic physical stock counts by zone." icon={ClipboardCheck}
      data={CYCLE_COUNTS} columns={columns}
      searchable={(r) => `${r.number} ${r.warehouse} ${r.zone} ${r.assignedTo}`}
      kpis={[
        { label: "Total counts", value: String(CYCLE_COUNTS.length) },
        { label: "Scheduled", value: String(CYCLE_COUNTS.filter((c) => c.status === "scheduled").length) },
        { label: "Completed", value: String(CYCLE_COUNTS.filter((c) => c.status === "completed").length) },
        { label: "Variances", value: String(CYCLE_COUNTS.filter((c) => c.status === "variance").length) },
      ]}
      newLabel="Schedule Count"
    />
  );
}
