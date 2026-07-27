import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, FileQuestion } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SalesDocList, StatusChip, toneForStatus, fmtDate } from "@/features/sales/components/SalesDocList";
import { ProcurementFormDialog, type ProcurementFormValue } from "@/features/procurement/components/ProcurementFormDialog";
import { useIndents, useSaveIndent, useDeleteIndent, useConvertIndentToRFQ, type IndentInput } from "@/features/procurement/api";
import { DocHistoryButton } from "@/features/shared/DocHistoryDialog";

export const Route = createFileRoute("/_authenticated/workspace/procurement/purchase-requests")({
  component: PurchaseRequestsPage,
});

function PurchaseRequestsPage() {
  const { data = [], isLoading } = useIndents();
  const save = useSaveIndent();
  const del = useDeleteIndent();
  const toRfq = useConvertIndentToRFQ();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProcurementFormValue | null>(null);

  const openEdit = (r: any) => {
    setEditing({
      id: r.id, status: r.status, primary_date: r.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      secondary_date: r.required_by, notes: r.notes ?? "",
      lines: (r.items ?? []).map((i: any) => ({
        item_name: i.item_name, item_code: i.item_code ?? "", unit: i.unit ?? "",
        quantity: Number(i.quantity), notes: i.notes ?? "",
      })),
    });
    setOpen(true);
  };

  return (
    <>
      <SalesDocList
        title="Purchase Requests"
        description="Internal requests raised by departments before an RFQ is issued."
        icon={ClipboardList}
        rows={data as any[]} isLoading={isLoading}
        entityType="purchase_indent"
        searchable={(r: any) => `${r.indent_number} ${r.source ?? ""} ${r.status}`}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        rowExtraActions={(r: any) => (
          <>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Create RFQ" disabled={r.status === "converted" || toRfq.isPending} onClick={() => toRfq.mutate(r.id)}>
              <FileQuestion className="h-3.5 w-3.5" />
            </Button>
            <DocHistoryButton kind="purchase_indent" id={r.id} label={r.indent_number} />
          </>
        )}
        columns={[
          { header: "Number", cell: (r: any) => <span className="font-medium">{r.indent_number}</span> },
          { header: "Required by", cell: (r: any) => fmtDate(r.required_by) },
          { header: "Source", cell: (r: any) => r.source ?? "—" },
          { header: "Status", cell: (r: any) => <StatusChip value={r.status} tone={toneForStatus(r.status)} /> },
          { header: "Lines", className: "text-right", cell: (r: any) => <span className="tabular-nums text-muted-foreground">{(r.items ?? []).length}</span> },
        ]}
      />
      <ProcurementFormDialog
        open={open} onOpenChange={setOpen}
        title={editing?.id ? "Edit purchase request" : "New purchase request"}
        primaryDateLabel="Requested on" secondaryDateLabel="Required by"
        statuses={[
          { value: "draft", label: "Draft" },
          { value: "submitted", label: "Submitted" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
        ]}
        showSupplier={false} attachmentsType="purchase_indent"
        initial={editing}
        onSubmit={async (v) => {
          const input: IndentInput = {
            id: v.id, status: v.status, required_by: v.secondary_date ?? null, notes: v.notes,
            lines: v.lines.map(l => ({ item_name: l.item_name, item_code: l.item_code, unit: l.unit, quantity: l.quantity, notes: l.notes })),
          };
          await save.mutateAsync(input);
        }}
      />
    </>
  );
}