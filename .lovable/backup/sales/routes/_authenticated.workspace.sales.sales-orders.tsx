import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, ReceiptText, Truck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SalesDocList, StatusChip, toneForStatus, fmtDate } from "@/features/sales/components/SalesDocList";
import { DocumentFormDialog, type DocFormValue } from "@/features/sales/components/DocumentFormDialog";
import { useSalesOrders, useSaveSalesOrder, useDeleteSalesOrder, useConvertSoToInvoice, useConvertSoToDeliveryNote, type SalesOrderInput } from "@/features/sales/api";
import { DocHistoryButton } from "@/features/shared/DocHistoryDialog";
import { inr } from "@/lib/sales-utils";

export const Route = createFileRoute("/_authenticated/workspace/sales/sales-orders")({
  component: SalesOrdersPage,
});

function SalesOrdersPage() {
  const { data = [], isLoading } = useSalesOrders();
  const save = useSaveSalesOrder();
  const del = useDeleteSalesOrder();
  const toInv = useConvertSoToInvoice();
  const toDn = useConvertSoToDeliveryNote();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DocFormValue | null>(null);

  const openEdit = (row: any) => {
    setEditing({
      id: row.id, customer_id: row.customer_id, primary_date: row.order_date,
      secondary_date: row.delivery_date, status: row.status, tax_type: row.tax_type,
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
        title="Sales Orders"
        description="Confirmed customer orders ready for fulfillment."
        icon={ClipboardList}
        rows={data as any[]} isLoading={isLoading}
        searchable={(r: any) => `${r.order_number} ${r.customer?.name ?? ""} ${r.status}`}
        totalOf={(r: any) => Number(r.grand_total ?? 0)}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        rowExtraActions={(r: any) => (
          <>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Create Invoice" disabled={r.status === "fulfilled" || toInv.isPending} onClick={() => toInv.mutate(r.id)}>
              <ReceiptText className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Create Delivery Note" disabled={toDn.isPending} onClick={() => toDn.mutate(r.id)}>
              <Truck className="h-3.5 w-3.5" />
            </Button>
            <DocHistoryButton kind="sales_order" id={r.id} label={r.order_number} />
          </>
        )}
        columns={[
          { header: "Number", cell: (r: any) => <span className="font-medium">{r.order_number}</span> },
          { header: "Customer", cell: (r: any) => r.customer?.name ?? "—" },
          { header: "Order Date", cell: (r: any) => fmtDate(r.order_date) },
          { header: "Delivery", cell: (r: any) => fmtDate(r.delivery_date) },
          { header: "Status", cell: (r: any) => <StatusChip value={r.status} tone={toneForStatus(r.status)} /> },
          { header: "Total", className: "text-right", cell: (r: any) => <span className="tabular-nums">{inr(r.grand_total)}</span> },
        ]}
      />
      <DocumentFormDialog
        open={open} onOpenChange={setOpen}
        title={editing?.id ? "Edit Sales Order" : "New Sales Order"}
        primaryDateLabel="Order Date" secondaryDateLabel="Delivery Date"
        statuses={[
          { value: "draft", label: "Draft" },
          { value: "confirmed", label: "Confirmed" },
          { value: "processing", label: "Processing" },
          { value: "fulfilled", label: "Fulfilled" },
          { value: "cancelled", label: "Cancelled" },
        ]}
        initial={editing}
        onSubmit={async (v) => {
          const input: SalesOrderInput = {
            id: v.id, customer_id: v.customer_id, order_date: v.primary_date, delivery_date: v.secondary_date ?? null,
            status: v.status as any, tax_type: v.tax_type, notes: v.notes, lines: v.lines,
          };
          await save.mutateAsync(input);
        }}
      />
    </>
  );
}