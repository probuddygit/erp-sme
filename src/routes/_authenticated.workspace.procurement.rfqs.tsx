import { createFileRoute } from "@tanstack/react-router";
import { FileQuestion, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SalesDocList, StatusChip, toneForStatus, fmtDate } from "@/features/sales/components/SalesDocList";
import { ProcurementFormDialog, type ProcurementFormValue } from "@/features/procurement/components/ProcurementFormDialog";
import { useRFQs, useSaveRFQ, useDeleteRFQ, useConvertRfqToPO, type RFQInput } from "@/features/procurement/api";
import { DocHistoryButton } from "@/features/shared/DocHistoryDialog";

export const Route = createFileRoute("/_authenticated/workspace/procurement/rfqs")({ component: RFQsPage });

function RFQsPage() {
  const { data = [], isLoading } = useRFQs();
  const save = useSaveRFQ();
  const del = useDeleteRFQ();
  const toPo = useConvertRfqToPO();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProcurementFormValue | null>(null);

  const openEdit = (r: any) => {
    setEditing({
      id: r.id, status: r.status, primary_date: r.issue_date, secondary_date: r.due_date, notes: r.notes ?? "",
      lines: (r.items ?? []).map((i: any) => ({ item_name: i.item_name, item_code: i.item_code ?? "", unit: i.unit ?? "", quantity: Number(i.quantity) })),
    });
    setOpen(true);
  };

  return (
    <>
      <SalesDocList
        title="RFQs" description="Requests for Quotation issued to vendors."
        icon={FileQuestion} rows={data as any[]} isLoading={isLoading}
        entityType="rfq" searchable={(r: any) => `${r.rfq_number} ${r.status}`}
        onCreate={() => { setEditing(null); setOpen(true); }}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        rowExtraActions={(r: any) => (
          <>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Create Purchase Order" disabled={r.status === "closed" || toPo.isPending} onClick={() => toPo.mutate(r.id)}>
              <ShoppingCart className="h-3.5 w-3.5" />
            </Button>
            <DocHistoryButton kind="rfq" id={r.id} label={r.rfq_number} />
          </>
        )}
        columns={[
          { header: "Number", cell: (r: any) => <span className="font-medium">{r.rfq_number}</span> },
          { header: "Issued", cell: (r: any) => fmtDate(r.issue_date) },
          { header: "Due", cell: (r: any) => fmtDate(r.due_date) },
          { header: "Status", cell: (r: any) => <StatusChip value={r.status} tone={toneForStatus(r.status)} /> },
          { header: "Lines", className: "text-right", cell: (r: any) => <span className="tabular-nums text-muted-foreground">{(r.items ?? []).length}</span> },
        ]}
      />
      <ProcurementFormDialog
        open={open} onOpenChange={setOpen}
        title={editing?.id ? "Edit RFQ" : "New RFQ"}
        primaryDateLabel="Issue date" secondaryDateLabel="Response due"
        statuses={[
          { value: "draft", label: "Draft" }, { value: "sent", label: "Sent" },
          { value: "responded", label: "Responded" }, { value: "closed", label: "Closed" },
        ]}
        showSupplier={false} attachmentsType="rfq" initial={editing}
        onSubmit={async (v) => {
          const input: RFQInput = {
            id: v.id, status: v.status, issue_date: v.primary_date, due_date: v.secondary_date ?? null, notes: v.notes,
            lines: v.lines.map(l => ({ item_name: l.item_name, item_code: l.item_code, unit: l.unit, quantity: l.quantity })),
          };
          await save.mutateAsync(input);
        }}
      />
    </>
  );
}
