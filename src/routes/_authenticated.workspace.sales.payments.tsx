import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { useState } from "react";
import { SalesDocList, fmtDate } from "@/features/sales/components/SalesDocList";
import { PaymentFormDialog } from "@/features/sales/components/PaymentFormDialog";
import { usePayments, useSavePayment, useDeletePayment, type PaymentInput } from "@/features/sales/api";
import { inr } from "@/lib/sales-utils";

export const Route = createFileRoute("/_authenticated/workspace/sales/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const { data = [], isLoading } = usePayments();
  const save = useSavePayment();
  const del = useDeletePayment();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentInput | null>(null);

  const openEdit = (row: any) => {
    setEditing({
      id: row.id, invoice_id: row.invoice_id, payment_date: row.payment_date,
      amount: Number(row.amount), method: row.method, reference: row.reference ?? "", notes: row.notes ?? "",
    });
    setOpen(true);
  };

  return (
    <>
      <SalesDocList
        title="Customer Payments"
        description="Money received from customers — NEFT, RTGS, UPI, cheque — mapped to invoices."
        icon={Wallet}
        rows={data as any[]} isLoading={isLoading}
        searchable={(r: any) => `${r.reference ?? ""} ${r.invoice?.invoice_number ?? ""} ${r.invoice?.customer?.name ?? ""} ${r.method}`}
        totalOf={(r: any) => Number(r.amount ?? 0)}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        columns={[
          { header: "Date", cell: (r: any) => fmtDate(r.payment_date) },
          { header: "Invoice", cell: (r: any) => <span className="font-medium">{r.invoice?.invoice_number ?? "—"}</span> },
          { header: "Customer", cell: (r: any) => r.invoice?.customer?.name ?? "—" },
          { header: "Method", className: "capitalize", cell: (r: any) => r.method?.replace(/_/g, " ") },
          { header: "Reference", cell: (r: any) => r.reference ?? "—" },
          { header: "Amount", className: "text-right", cell: (r: any) => <span className="tabular-nums font-medium">{inr(r.amount)}</span> },
        ]}
      />
      <PaymentFormDialog open={open} onOpenChange={setOpen} initial={editing} onSubmit={async (v) => { await save.mutateAsync(v); }} />
    </>
  );
}