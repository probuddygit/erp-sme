import { createFileRoute } from "@tanstack/react-router";
import { ReceiptText } from "lucide-react";
import { useState } from "react";
import { SalesDocList, StatusChip, toneForStatus, fmtDate } from "@/features/sales/components/SalesDocList";
import { DocumentFormDialog, type DocFormValue } from "@/features/sales/components/DocumentFormDialog";
import { useInvoices, useSaveInvoice, useDeleteInvoice, type InvoiceInput } from "@/features/sales/api";
import { inr } from "@/lib/sales-utils";

export const Route = createFileRoute("/_authenticated/workspace/sales/invoices")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const { data = [], isLoading } = useInvoices();
  const save = useSaveInvoice();
  const del = useDeleteInvoice();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DocFormValue | null>(null);

  const openEdit = (row: any) => {
    setEditing({
      id: row.id, customer_id: row.customer_id, primary_date: row.invoice_date,
      secondary_date: row.due_date, status: row.status, tax_type: row.tax_type,
      notes: row.notes ?? "",
      lines: (row.items ?? []).map((i: any) => ({
        product_name: i.product_name, description: i.description ?? "",
        quantity: Number(i.quantity), unit_price: Number(i.unit_price),
        discount_percent: Number(i.discount_percent), tax_percent: Number(i.tax_percent),
      })),
    });
    setOpen(true);
  };

  return (
    <>
      <SalesDocList
        title="Invoices"
        description="GST-compliant tax invoices with itemised taxes and receivable tracking."
        icon={ReceiptText}
        rows={data as any[]} isLoading={isLoading}
        searchable={(r: any) => `${r.invoice_number} ${r.customer?.name ?? ""} ${r.status}`}
        totalOf={(r: any) => Number(r.grand_total ?? 0)}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        canDelete={(r: any) => Number(r.amount_paid ?? 0) === 0}
        columns={[
          { header: "Number", cell: (r: any) => <span className="font-medium">{r.invoice_number}</span> },
          { header: "Customer", cell: (r: any) => r.customer?.name ?? "—" },
          { header: "Date", cell: (r: any) => fmtDate(r.invoice_date) },
          { header: "Due", cell: (r: any) => fmtDate(r.due_date) },
          { header: "Status", cell: (r: any) => <StatusChip value={r.status} tone={toneForStatus(r.status)} /> },
          { header: "Paid", className: "text-right", cell: (r: any) => <span className="tabular-nums text-muted-foreground">{inr(r.amount_paid)}</span> },
          { header: "Total", className: "text-right", cell: (r: any) => <span className="tabular-nums font-medium">{inr(r.grand_total)}</span> },
        ]}
      />
      <DocumentFormDialog
        open={open} onOpenChange={setOpen}
        title={editing?.id ? "Edit Invoice" : "New Invoice"}
        primaryDateLabel="Invoice Date" secondaryDateLabel="Due Date"
        statuses={[
          { value: "draft", label: "Draft" },
          { value: "sent", label: "Sent" },
          { value: "partially_paid", label: "Partially Paid" },
          { value: "paid", label: "Paid" },
          { value: "overdue", label: "Overdue" },
          { value: "cancelled", label: "Cancelled" },
        ]}
        initial={editing}
        onSubmit={async (v) => {
          const input: InvoiceInput = {
            id: v.id, customer_id: v.customer_id, invoice_date: v.primary_date, due_date: v.secondary_date ?? null,
            status: v.status as any, tax_type: v.tax_type, notes: v.notes, lines: v.lines,
          };
          await save.mutateAsync(input);
        }}
      />
    </>
  );
}