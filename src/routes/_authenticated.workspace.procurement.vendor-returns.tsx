import { createFileRoute } from "@tanstack/react-router";
import { Undo2 } from "lucide-react";
import { useState } from "react";
import { SalesDocList, StatusChip, toneForStatus, fmtDate } from "@/features/sales/components/SalesDocList";
import { ProcurementFormDialog, type ProcurementFormValue } from "@/features/procurement/components/ProcurementFormDialog";
import { useVendorReturns, useSaveVendorReturn, useDeleteVendorReturn, type VRetInput } from "@/features/procurement/api";
import { inr } from "@/lib/sales-utils";

export const Route = createFileRoute("/_authenticated/workspace/procurement/vendor-returns")({ component: VRetPage });

function VRetPage() {
  const { data = [], isLoading } = useVendorReturns();
  const save = useSaveVendorReturn();
  const del = useDeleteVendorReturn();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProcurementFormValue | null>(null);

  const openEdit = (r: any) => {
    setEditing({
      id: r.id, supplier_id: r.supplier_id, status: r.status, primary_date: r.return_date,
      reason: r.reason ?? "", notes: r.notes ?? "", tax_type: "intra_state",
      lines: (r.items ?? []).map((i: any) => ({
        item_id: i.item_id, item_name: i.description, unit: i.unit ?? "",
        quantity: Number(i.quantity), unit_price: Number(i.rate), tax_percent: Number(i.tax_rate),
      })),
    });
    setOpen(true);
  };

  return (
    <>
      <SalesDocList
        title="Vendor Returns" description="Return of received goods to vendors — debit note / refund."
        icon={Undo2} rows={data as any[]} isLoading={isLoading}
        entityType="vendor_return" searchable={(r: any) => `${r.vret_number} ${r.supplier?.name ?? ""} ${r.status}`}
        totalOf={(r: any) => Number(r.grand_total ?? 0)}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        columns={[
          { header: "Number", cell: (r: any) => <span className="font-medium">{r.vret_number}</span> },
          { header: "Supplier", cell: (r: any) => r.supplier?.name ?? "—" },
          { header: "Return date", cell: (r: any) => fmtDate(r.return_date) },
          { header: "Reason", cell: (r: any) => r.reason ?? "—" },
          { header: "Status", cell: (r: any) => <StatusChip value={r.status} tone={toneForStatus(r.status)} /> },
          { header: "Total", className: "text-right", cell: (r: any) => <span className="tabular-nums font-medium">{inr(r.grand_total)}</span> },
        ]}
      />
      <ProcurementFormDialog
        open={open} onOpenChange={setOpen}
        title={editing?.id ? "Edit vendor return" : "New vendor return"}
        primaryDateLabel="Return date"
        statuses={[
          { value: "draft", label: "Draft" }, { value: "sent", label: "Sent" },
          { value: "accepted", label: "Accepted" }, { value: "settled", label: "Settled" },
        ]}
        showTaxType showPricing showReason attachmentsType="vendor_return" initial={editing}
        onSubmit={async (v) => {
          const input: VRetInput = {
            id: v.id, supplier_id: v.supplier_id!, return_date: v.primary_date, status: v.status,
            reason: v.reason ?? null, notes: v.notes, tax_type: v.tax_type ?? "intra_state",
            lines: v.lines.map(l => ({ item_id: l.item_id ?? null, description: l.item_name, unit: l.unit, quantity: l.quantity, rate: l.unit_price ?? 0, tax_rate: l.tax_percent ?? 0 })),
          };
          await save.mutateAsync(input);
        }}
      />
    </>
  );
}
