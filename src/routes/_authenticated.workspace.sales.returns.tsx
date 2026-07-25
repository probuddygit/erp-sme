import { createFileRoute } from "@tanstack/react-router";
import { Undo2 } from "lucide-react";
import { useState } from "react";
import { SalesDocList, StatusChip, toneForStatus, fmtDate } from "@/features/sales/components/SalesDocList";
import { ReturnFormDialog } from "@/features/sales/components/ReturnFormDialog";
import { useSalesReturns, useSaveSalesReturn, useDeleteSalesReturn, type ReturnInput } from "@/features/sales/api";
import { inr } from "@/lib/sales-utils";

export const Route = createFileRoute("/_authenticated/workspace/sales/returns")({
  component: ReturnsPage,
});

function ReturnsPage() {
  const { data = [], isLoading } = useSalesReturns();
  const save = useSaveSalesReturn();
  const del = useDeleteSalesReturn();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReturnInput | null>(null);

  const openEdit = (row: any) => {
    setEditing({
      id: row.id, customer_id: row.customer_id, invoice_id: row.invoice_id,
      return_date: row.return_date, status: row.status, reason: row.reason ?? "", notes: row.notes ?? "",
      lines: (row.items ?? []).map((i: any) => ({ item_id: i.item_id, qty: Number(i.qty), uom: i.uom ?? "", rate: Number(i.rate), tax_pct: Number(i.tax_pct) })),
    });
    setOpen(true);
  };

  return (
    <>
      <SalesDocList
        title="Sales Returns"
        description="Customer returns with credit-note workflow and restocking updates."
        icon={Undo2}
        rows={data as any[]} isLoading={isLoading}
        searchable={(r: any) => `${r.return_no} ${r.customer?.name ?? ""} ${r.invoice?.invoice_number ?? ""} ${r.status}`}
        totalOf={(r: any) => Number(r.total ?? 0)}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        columns={[
          { header: "Number", cell: (r: any) => <span className="font-medium">{r.return_no}</span> },
          { header: "Customer", cell: (r: any) => r.customer?.name ?? "—" },
          { header: "Against Invoice", cell: (r: any) => r.invoice?.invoice_number ?? "—" },
          { header: "Date", cell: (r: any) => fmtDate(r.return_date) },
          { header: "Reason", cell: (r: any) => r.reason ?? "—" },
          { header: "Status", cell: (r: any) => <StatusChip value={r.status} tone={toneForStatus(r.status)} /> },
          { header: "Total", className: "text-right", cell: (r: any) => <span className="tabular-nums">{inr(r.total)}</span> },
        ]}
      />
      <ReturnFormDialog open={open} onOpenChange={setOpen} initial={editing} onSubmit={async (v) => { await save.mutateAsync(v); }} />
    </>
  );
}