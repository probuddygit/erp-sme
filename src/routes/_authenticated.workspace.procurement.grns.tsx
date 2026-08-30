import { createFileRoute } from "@tanstack/react-router";
import { PackageCheck, ReceiptText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SalesDocList, StatusChip, toneForStatus, fmtDate } from "@/features/sales/components/SalesDocList";
import { ProcurementFormDialog, type ProcurementFormValue } from "@/features/procurement/components/ProcurementFormDialog";
import { useGRNs, useSaveGRN, useDeleteGRN, useConvertGrnToVInvoice, type GRNInput } from "@/features/procurement/api";
import { DocHistoryButton } from "@/features/shared/DocHistoryDialog";
import { DocMetaBadges } from "@/features/shared/DocMetaBadges";

export const Route = createFileRoute("/_authenticated/workspace/procurement/grns")({ component: GRNsPage });

function GRNsPage() {
  const { data = [], isLoading } = useGRNs();
  const save = useSaveGRN();
  const del = useDeleteGRN();
  const toVinv = useConvertGrnToVInvoice();
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
        entityType="grn"
        docKind="grn"
        docTitle={(r: any) => `GRN · ${r.grn_number}`}
        docSubtitle={(r: any) => `${r.supplier?.name ?? "—"}`}
        docStatus={(r: any) => String(r.status ?? "")} searchable={(r: any) => `${r.grn_number} ${r.supplier?.name ?? ""} ${r.status}`}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        canDelete={(r: any) => r.status !== "posted"}
        rowExtraActions={(r: any) => (
          <>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Create Vendor Invoice" disabled={r.status !== "posted" || toVinv.isPending} onClick={() => toVinv.mutate(r.id)}>
              <ReceiptText className="h-3.5 w-3.5" />
            </Button>
            <DocHistoryButton kind="grn" id={r.id} label={r.grn_number} />
          </>
        )}
        columns={[
          { header: "Number", cell: (r: any) => <span className="font-medium">{r.grn_number}</span> },
          { header: "Supplier", cell: (r: any) => r.supplier?.name ?? "—" },
          { header: "PO", cell: (r: any) => r.po?.po_number ?? "—" },
          { header: "Received", cell: (r: any) => fmtDate(r.received_date) },
          { header: "Status", cell: (r: any) => <StatusChip value={r.status} tone={toneForStatus(r.status)} /> },
          { header: "Posting", cell: (r: any) => <DocMetaBadges inventory={r.inventory_posting_status} /> },
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
        showWarehouse showPurchaseOrder showPricing showFreight requireItemLink
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
