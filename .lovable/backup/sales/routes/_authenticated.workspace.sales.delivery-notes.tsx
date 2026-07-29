import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SalesDocList, StatusChip, toneForStatus, fmtDate } from "@/features/sales/components/SalesDocList";
import { DeliveryFormDialog } from "@/features/sales/components/DeliveryFormDialog";
import { useDeliveryNotes, useSaveDeliveryNote, useDeleteDeliveryNote, type DeliveryInput } from "@/features/sales/api";
import { DocHistoryButton } from "@/features/shared/DocHistoryDialog";
import { DocMetaBadges } from "@/features/shared/DocMetaBadges";

export const Route = createFileRoute("/_authenticated/workspace/sales/delivery-notes")({
  component: DeliveryNotesPage,
});

function DeliveryNotesPage() {
  const { data = [], isLoading } = useDeliveryNotes();
  const save = useSaveDeliveryNote();
  const del = useDeleteDeliveryNote();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryInput | null>(null);

  const openEdit = (row: any) => {
    setEditing({
      id: row.id, customer_id: row.customer_id, delivery_date: row.delivery_date,
      status: row.status, vehicle_no: row.vehicle_no, driver_name: row.driver_name, driver_phone: row.driver_phone,
      notes: row.notes ?? "",
      lines: (row.items ?? []).map((i: any) => ({ item_id: i.item_id, qty: Number(i.qty), uom: i.uom ?? "", notes: i.notes ?? "" })),
    });
    setOpen(true);
  };

  return (
    <>
      <SalesDocList
        title="Delivery Notes"
        description="Goods shipped to customers with vehicle, driver and dispatch tracking."
        icon={Truck}
        rows={data as any[]} isLoading={isLoading}
        searchable={(r: any) => `${r.dn_no} ${r.customer?.name ?? ""} ${r.status} ${r.vehicle_no ?? ""}`}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        rowExtraActions={(r: any) => <DocHistoryButton kind="delivery_note" id={r.id} label={r.dn_no} />}
        columns={[
          { header: "Number", cell: (r: any) => <span className="font-medium">{r.dn_no}</span> },
          { header: "Customer", cell: (r: any) => r.customer?.name ?? "—" },
          { header: "Source", cell: (r: any) => r.sales_order_id ? <Badge variant="outline" className="text-[10px]">SO linked</Badge> : "—" },
          { header: "Delivery Date", cell: (r: any) => fmtDate(r.delivery_date) },
          { header: "Vehicle", cell: (r: any) => r.vehicle_no ?? "—" },
          { header: "Items", className: "text-right", cell: (r: any) => (r.items?.length ?? 0) },
          { header: "Status", cell: (r: any) => <StatusChip value={r.status} tone={toneForStatus(r.status)} /> },
          { header: "Posting", cell: (r: any) => <DocMetaBadges inventory={r.inventory_posting_status} /> },
        ]}
      />
      <DeliveryFormDialog open={open} onOpenChange={setOpen} initial={editing} onSubmit={async (v) => { await save.mutateAsync(v); }} />
    </>
  );
}