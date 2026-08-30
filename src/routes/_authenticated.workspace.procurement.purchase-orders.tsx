import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart, PackageCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SalesDocList, StatusChip, toneForStatus, fmtDate } from "@/features/sales/components/SalesDocList";
import { ProcurementFormDialog, type ProcurementFormValue } from "@/features/procurement/components/ProcurementFormDialog";
import { usePurchaseOrders, useSavePurchaseOrder, useDeletePurchaseOrder, useConvertPoToGRN, type POInput } from "@/features/procurement/api";
import { DocHistoryButton } from "@/features/shared/DocHistoryDialog";
import { DocMetaBadges } from "@/features/shared/DocMetaBadges";
import { inr } from "@/lib/sales-utils";

export const Route = createFileRoute("/_authenticated/workspace/procurement/purchase-orders")({ component: POPage });

function POPage() {
  const { data = [], isLoading } = usePurchaseOrders();
  const save = useSavePurchaseOrder();
  const del = useDeletePurchaseOrder();
  const toGrn = useConvertPoToGRN();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProcurementFormValue | null>(null);

  const openEdit = (r: any) => {
    setEditing({
      id: r.id, supplier_id: r.supplier_id, status: r.status,
      primary_date: r.order_date, secondary_date: r.expected_date, notes: r.notes ?? "",
      freight: Number(r.freight ?? 0), tax_type: "intra_state",
      lines: (r.items ?? []).map((i: any) => ({
        item_name: i.item_name, item_code: i.item_code ?? "", unit: i.unit ?? "",
        quantity: Number(i.quantity), unit_price: Number(i.unit_price), tax_percent: Number(i.tax_percent),
      })),
    });
    setOpen(true);
  };

  return (
    <>
      <SalesDocList
        title="Purchase Orders" description="Formal POs issued to vendors with terms and approvals."
        icon={ShoppingCart} rows={data as any[]} isLoading={isLoading}
        entityType="purchase_order"
        docKind="purchase_order"
        docTitle={(r: any) => `Purchase Order · ${r.po_number}`}
        docSubtitle={(r: any) => `${r.supplier?.name ?? "—"}`}
        docStatus={(r: any) => String(r.status ?? "")} searchable={(r: any) => `${r.po_number} ${r.supplier?.name ?? ""} ${r.status}`}
        totalOf={(r: any) => Number(r.grand_total ?? 0)}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        rowExtraActions={(r: any) => (
          <>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Create GRN" disabled={r.status === "closed" || r.status === "cancelled" || toGrn.isPending} onClick={() => toGrn.mutate(r.id)}>
              <PackageCheck className="h-3.5 w-3.5" />
            </Button>
            <DocHistoryButton kind="purchase_order" id={r.id} label={r.po_number} />
          </>
        )}
        columns={[
          { header: "Number", cell: (r: any) => <span className="font-medium">{r.po_number}</span> },
          { header: "Supplier", cell: (r: any) => r.supplier?.name ?? "—" },
          { header: "Order date", cell: (r: any) => fmtDate(r.order_date) },
          { header: "Expected", cell: (r: any) => fmtDate(r.expected_date) },
          { header: "Status", cell: (r: any) => <StatusChip value={r.status} tone={toneForStatus(r.status)} /> },
          { header: "Posting", cell: (r: any) => <DocMetaBadges financial={r.financial_posting_status} inventory={r.inventory_posting_status} /> },
          { header: "Total", className: "text-right", cell: (r: any) => <span className="tabular-nums font-medium">{inr(r.grand_total)}</span> },
        ]}
      />
      <ProcurementFormDialog
        open={open} onOpenChange={setOpen}
        title={editing?.id ? "Edit purchase order" : "New purchase order"}
        primaryDateLabel="Order date" secondaryDateLabel="Expected delivery"
        statuses={[
          { value: "draft", label: "Draft" }, { value: "sent", label: "Sent" },
          { value: "acknowledged", label: "Acknowledged" }, { value: "partially_received", label: "Partially received" },
          { value: "received", label: "Received" }, { value: "closed", label: "Closed" }, { value: "cancelled", label: "Cancelled" },
        ]}
        showTaxType showPricing showFreight showWarehouse={false}
        attachmentsType="purchase_order" initial={editing}
        onSubmit={async (v) => {
          const input: POInput = {
            id: v.id, supplier_id: v.supplier_id!, order_date: v.primary_date, expected_date: v.secondary_date ?? null,
            status: v.status, freight: v.freight, notes: v.notes, tax_type: v.tax_type ?? "intra_state",
            lines: v.lines.map(l => ({ item_name: l.item_name, item_code: l.item_code, unit: l.unit, quantity: l.quantity, unit_price: l.unit_price ?? 0, tax_percent: l.tax_percent ?? 0 })),
          };
          await save.mutateAsync(input);
        }}
      />
    </>
  );
}
