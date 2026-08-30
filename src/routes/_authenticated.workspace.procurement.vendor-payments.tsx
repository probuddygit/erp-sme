import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { useState } from "react";
import { SalesDocList, StatusChip, fmtDate } from "@/features/sales/components/SalesDocList";
import { VendorPaymentDialog } from "@/features/procurement/components/VendorPaymentDialog";
import { useVendorPayments, useSaveVendorPayment, useDeleteVendorPayment, type VPayInput } from "@/features/procurement/api";
import { inr } from "@/lib/sales-utils";

export const Route = createFileRoute("/_authenticated/workspace/procurement/vendor-payments")({ component: VPayPage });

function VPayPage() {
  const { data = [], isLoading } = useVendorPayments();
  const save = useSaveVendorPayment();
  const del = useDeleteVendorPayment();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(VPayInput & { id?: string }) | null>(null);

  const openEdit = (r: any) => {
    setEditing({
      id: r.id, supplier_id: r.supplier_id, vinv_id: r.vinv_id, payment_date: r.payment_date,
      amount: Number(r.amount), method: r.method, reference: r.reference ?? "", notes: r.notes ?? "",
    });
    setOpen(true);
  };

  return (
    <>
      <SalesDocList
        entityType="supplier_payment"
        docKind="supplier_payment"
        docTitle={(r: any) => `Vendor Payment · ${r.payment_number}`}
        docSubtitle={(r: any) => `${r.supplier?.name ?? "—"}`}
        docStatus={(r: any) => String(r.method ?? "")}
        title="Vendor Payments" description="Outward payments to suppliers with invoice allocation."
        icon={Wallet} rows={data as any[]} isLoading={isLoading}
        searchable={(r: any) => `${r.payment_number} ${r.supplier?.name ?? ""} ${r.method}`}
        totalOf={(r: any) => Number(r.amount ?? 0)}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        columns={[
          { header: "Number", cell: (r: any) => <span className="font-medium">{r.payment_number}</span> },
          { header: "Supplier", cell: (r: any) => r.supplier?.name ?? "—" },
          { header: "Against", cell: (r: any) => r.vinv?.vinv_number ?? "—" },
          { header: "Date", cell: (r: any) => fmtDate(r.payment_date) },
          { header: "Method", cell: (r: any) => <StatusChip value={String(r.method).replace(/_/g, " ")} tone="info" /> },
          { header: "Amount", className: "text-right", cell: (r: any) => <span className="tabular-nums font-medium">{inr(r.amount)}</span> },
        ]}
      />
      <VendorPaymentDialog
        open={open} onOpenChange={setOpen} initial={editing}
        onSubmit={async (v) => { await save.mutateAsync(editing?.id ? { ...v, id: editing.id } : v); }}
      />
    </>
  );
}
