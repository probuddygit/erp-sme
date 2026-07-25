import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useState } from "react";
import { SalesDocList, StatusChip, toneForStatus, fmtDate } from "@/features/sales/components/SalesDocList";
import { VendorQuoteDialog } from "@/features/procurement/components/VendorQuoteDialog";
import { useVendorQuotes, useSaveVendorQuote, useDeleteVendorQuote, type VendorQuoteInput } from "@/features/procurement/api";
import { inr } from "@/lib/sales-utils";

export const Route = createFileRoute("/_authenticated/workspace/procurement/vendor-quotations")({ component: VQuotePage });

function VQuotePage() {
  const { data = [], isLoading } = useVendorQuotes();
  const save = useSaveVendorQuote();
  const del = useDeleteVendorQuote();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(VendorQuoteInput & { id?: string }) | null>(null);

  const openEdit = (r: any) => {
    setEditing({
      id: r.id, rfq_id: r.rfq_id, rfq_item_id: r.rfq_item_id, supplier_id: r.supplier_id,
      unit_price: Number(r.unit_price), lead_time_days: r.lead_time_days, notes: r.notes ?? "",
      is_selected: r.is_selected,
    });
    setOpen(true);
  };

  return (
    <>
      <SalesDocList
        title="Vendor Quotations" description="Quotations received from vendors against RFQs."
        icon={FileText} rows={data as any[]} isLoading={isLoading}
        searchable={(r: any) => `${r.supplier?.name ?? ""} ${r.rfq?.rfq_number ?? ""} ${r.rfq_item?.item_name ?? ""}`}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        columns={[
          { header: "RFQ", cell: (r: any) => <span className="font-medium">{r.rfq?.rfq_number ?? "—"}</span> },
          { header: "Item", cell: (r: any) => r.rfq_item?.item_name ?? "—" },
          { header: "Supplier", cell: (r: any) => r.supplier?.name ?? "—" },
          { header: "Lead time", cell: (r: any) => r.lead_time_days ? `${r.lead_time_days}d` : "—" },
          { header: "Selected", cell: (r: any) => r.is_selected ? "✓" : "—" },
          { header: "Received", cell: (r: any) => fmtDate(r.created_at) },
          { header: "Unit price", className: "text-right", cell: (r: any) => <span className="tabular-nums font-medium">{inr(r.unit_price)}</span> },
          { header: "Status", cell: (r: any) => <StatusChip value={r.is_selected ? "selected" : "quoted"} tone={r.is_selected ? "success" : "info"} /> },
        ]}
      />
      <VendorQuoteDialog
        open={open} onOpenChange={setOpen} initial={editing}
        onSubmit={async (v) => { await save.mutateAsync(editing?.id ? { ...v, id: editing.id } : v); }}
      />
    </>
  );
}
