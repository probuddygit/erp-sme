import { createFileRoute } from "@tanstack/react-router";
import { PackageCheck } from "lucide-react";
import { useState } from "react";
import { SalesDocList, StatusChip, toneForStatus, fmtDate } from "@/features/sales/components/SalesDocList";
import { ProcurementFormDialog, type ProcurementFormValue } from "@/features/procurement/components/ProcurementFormDialog";
import { useGRNs, useSaveGRN, useDeleteGRN, type GRNInput } from "@/features/procurement/api";

export const Route = createFileRoute("/_authenticated/workspace/procurement/grns")({ component: GRNsPage });

function GRNsPage() {
  const { data = [], isLoading } = useGRNs();
  const save = useSaveGRN();
  const del = useDeleteGRN();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProcurementFormValue | null>(null);

  const openEdit = (r: any) => {
    setEditing({
      id: r.id, supplier_id: r.supplier_id ?? undefined, po_id: r.po_id ?? undefined,
      warehouse_id: r.warehouse_id ?? undefined,
      status: r.status, primary_date: r.received_date, notes: r.notes ?? "",
      freight: Number(r.freight ?? 0),
      lines: (r.items ?? []).map((i: any) => ({
        item_id: i.item_id, item_name: i.item_name, unit: i.unit ?? "",
        quantity: Number(i.quantity), unit_price: Number(i.unit_cost), batch_no: i.batch_no ?? "",
      })),
    });
    setOpen(true);
  };

  return (
    <>
      <SalesDocList
        title="Goods Receipts" description="Materials received against POs, with warehouse posting and inspection."
        icon={PackageCheck} rows={data as any[]} isLoading={isLoading}
        entityType="grn" searchable={(r: any) => `${r.grn_number} ${r.supplier?.name ?? ""} ${r.status}`}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        canDelete={(r: any) => r.status !== "posted"}
        columns={[
          { header: "Number", cell: (r: any) => <span className="font-medium">{r.grn_number}</span> },
          { header: "Supplier", cell: (r: any) => r.supplier?.name ?? "—" },
          { header: "PO", cell: (r: any) => r.po?.po_number ?? "—" },
          { header: "Received", cell: (r: any) => fmtDate(r.received_date) },
          { header: "Status", cell: (r: any) => <StatusChip value={r.status} tone={toneForStatus(r.status)} /> },
          { header: "Lines", className: "text-right", cell: (r: any) => <span className="tabular-nums text-muted-foreground">{(r.items ?? []).length}</span> },
        ]}
      />
      <ProcurementFormDialog
        open={open} onOpenChange={setOpen}
        title={editing?.id ? "Edit goods receipt" : "New goods receipt"}
        primaryDateLabel="Received date"
        statuses={[
          { value: "draft", label: "Draft" }, { value: "posted", label: "Posted" }, { value: "cancelled", label: "Cancelled" },
        ]}
        showWarehouse showPurchaseOrder showPricing showFreight
        attachmentsType="grn" initial={editing}
        onSubmit={async (v) => {
          const input: GRNInput = {
            id: v.id, supplier_id: v.supplier_id ?? null, po_id: v.po_id ?? null,
            warehouse_id: v.warehouse_id ?? null,
            received_date: v.primary_date, status: v.status, freight: v.freight, notes: v.notes,
            lines: v.lines.map(l => ({ item_id: l.item_id ?? null, item_name: l.item_name, unit: l.unit, quantity: l.quantity, unit_cost: l.unit_price ?? 0, batch_no: l.batch_no ?? null })),
          };
          await save.mutateAsync(input);
        }}
      />
    </>
  );
}
