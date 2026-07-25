import { createFileRoute } from "@tanstack/react-router";
import { ReceiptText } from "lucide-react";
import { useState } from "react";
import { SalesDocList, StatusChip, toneForStatus, fmtDate } from "@/features/sales/components/SalesDocList";
import { ProcurementFormDialog, type ProcurementFormValue } from "@/features/procurement/components/ProcurementFormDialog";
import { useVendorInvoices, useSaveVendorInvoice, useDeleteVendorInvoice, type VInvInput } from "@/features/procurement/api";
import { inr } from "@/lib/sales-utils";

export const Route = createFileRoute("/_authenticated/workspace/procurement/purchase-invoices")({ component: VInvPage });

function VInvPage() {
  const { data = [], isLoading } = useVendorInvoices();
  const save = useSaveVendorInvoice();
  const del = useDeleteVendorInvoice();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProcurementFormValue | null>(null);

  const openEdit = (r: any) => {
    setEditing({
      id: r.id, supplier_id: r.supplier_id, status: r.status,
      primary_date: r.invoice_date, secondary_date: r.due_date, notes: r.notes ?? "",
      tax_type: "intra_state",
      lines: (r.items ?? []).map((i: any) => ({
        item_name: i.item_name, unit: i.unit ?? "",
        quantity: Number(i.quantity), unit_price: Number(i.unit_price), tax_percent: Number(i.tax_percent),
      })),
    });
    setOpen(true);
  };

  return (
    <>
      <SalesDocList
        title="Vendor Invoices" description="Vendor bills booked against POs/GRNs with GST breakup."
        icon={ReceiptText} rows={data as any[]} isLoading={isLoading}
        entityType="vendor_invoice" searchable={(r: any) => `${r.vinv_number} ${r.supplier?.name ?? ""} ${r.status}`}
        totalOf={(r: any) => Number(r.grand_total ?? 0)}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        canDelete={(r: any) => Number(r.amount_paid ?? 0) === 0}
        columns={[
          { header: "Number", cell: (r: any) => <span className="font-medium">{r.vinv_number}</span> },
          { header: "Supplier", cell: (r: any) => r.supplier?.name ?? "—" },
          { header: "Invoice date", cell: (r: any) => fmtDate(r.invoice_date) },
          { header: "Due", cell: (r: any) => fmtDate(r.due_date) },
          { header: "Status", cell: (r: any) => <StatusChip value={r.status} tone={toneForStatus(r.status)} /> },
          { header: "Total", className: "text-right", cell: (r: any) => <span className="tabular-nums font-medium">{inr(r.grand_total)}</span> },
        ]}
      />
      <ProcurementFormDialog
        open={open} onOpenChange={setOpen}
        title={editing?.id ? "Edit vendor invoice" : "New vendor invoice"}
        primaryDateLabel="Invoice date" secondaryDateLabel="Due date"
        statuses={[
          { value: "draft", label: "Draft" }, { value: "matched", label: "Matched" }, { value: "approved", label: "Approved" },
          { value: "partially_paid", label: "Partially paid" }, { value: "paid", label: "Paid" }, { value: "cancelled", label: "Cancelled" },
        ]}
        showTaxType showPricing attachmentsType="vendor_invoice" initial={editing}
        onSubmit={async (v) => {
          const input: VInvInput = {
            id: v.id, supplier_id: v.supplier_id!, invoice_date: v.primary_date, due_date: v.secondary_date ?? null,
            status: v.status, notes: v.notes, tax_type: v.tax_type ?? "intra_state",
            lines: v.lines.map(l => ({ item_name: l.item_name, unit: l.unit, quantity: l.quantity, unit_price: l.unit_price ?? 0, tax_percent: l.tax_percent ?? 0 })),
          };
          await save.mutateAsync(input);
        }}
      />
    </>
  );
}
