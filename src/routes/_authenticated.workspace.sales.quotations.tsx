import { createFileRoute } from "@tanstack/react-router";
import { FileText, ClipboardList, Printer, Download, Mail, Share2, Eye } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SalesDocList, StatusChip, toneForStatus, fmtDate } from "@/features/sales/components/SalesDocList";
import { DocumentFormDialog, type DocFormValue } from "@/features/sales/components/DocumentFormDialog";
import { useQuotations, useSaveQuotation, useDeleteQuotation, useConvertQuotationToSalesOrder, type QuotationInput } from "@/features/sales/api";
import { DocHistoryButton } from "@/features/shared/DocHistoryDialog";
import { inr } from "@/lib/sales-utils";
import {
  downloadQuotationPdf,
  openQuotationPdf,
  shareQuotationPdf,
  sendQuotationEmail,
} from "@/features/sales/quotation-pdf";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/workspace/sales/quotations")({
  component: QuotationsPage,
});

function QuotationsPage() {
  const { company } = useAuth();
  const { data = [], isLoading } = useQuotations();
  const save = useSaveQuotation();
  const del = useDeleteQuotation();
  const toSo = useConvertQuotationToSalesOrder();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DocFormValue | null>(null);

  const runPdf = async (fn: () => Promise<any>) => {
    try { await fn(); } catch (e: any) { toast.error(e?.message ?? "PDF failed"); }
  };

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (row: any) => {
    setEditing({
      id: row.id,
      customer_id: row.customer_id,
      primary_date: row.issue_date,
      secondary_date: row.valid_until,
      status: row.status,
      tax_type: row.tax_type,
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
        title="Quotations"
        description="Proposals shared with prospective customers, with tax breakup and validity."
        icon={FileText}
        rows={data as any[]}
        isLoading={isLoading}
        searchable={(r: any) => `${r.quotation_number} ${r.customer?.name ?? ""} ${r.status}`}
        totalOf={(r: any) => Number(r.grand_total ?? 0)}
        onCreate={openNew}
        onEdit={openEdit}
        onDelete={async (r: any) => { await del.mutateAsync(r.id); }}
        rowExtraActions={(r: any) => (
          <>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Preview PDF"
              onClick={() => company && runPdf(() => openQuotationPdf({ quotationId: r.id, companyId: company.id }, "preview"))}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Print"
              onClick={() => company && runPdf(() => openQuotationPdf({ quotationId: r.id, companyId: company.id }, "print"))}>
              <Printer className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Download PDF"
              onClick={() => company && runPdf(() => downloadQuotationPdf({ quotationId: r.id, companyId: company.id }))}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Send by email"
              onClick={async () => {
                if (!company) return;
                await runPdf(() => downloadQuotationPdf({ quotationId: r.id, companyId: company.id }));
                sendQuotationEmail({ quotation_number: r.quotation_number, grand_total: Number(r.grand_total ?? 0) }, r.customer?.email);
                toast.message("PDF downloaded — attach it in your email client.");
              }}>
              <Mail className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Share"
              onClick={() => company && runPdf(async () => {
                const res = await shareQuotationPdf({ quotationId: r.id, companyId: company.id });
                if (res === "downloaded") toast.message("Sharing not supported — PDF downloaded instead.");
              })}>
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Convert to Sales Order" disabled={r.status === "accepted" || toSo.isPending} onClick={() => toSo.mutate(r.id)}>
              <ClipboardList className="h-3.5 w-3.5" />
            </Button>
            <DocHistoryButton kind="quotation" id={r.id} label={r.quotation_number} />
          </>
        )}
        columns={[
          { header: "Number", cell: (r: any) => <span className="font-medium">{r.quotation_number}</span> },
          { header: "Customer", cell: (r: any) => r.customer?.name ?? "—" },
          { header: "Issue Date", cell: (r: any) => fmtDate(r.issue_date) },
          { header: "Valid Until", cell: (r: any) => fmtDate(r.valid_until) },
          { header: "Status", cell: (r: any) => <StatusChip value={r.status} tone={toneForStatus(r.status)} /> },
          { header: "Total", className: "text-right", cell: (r: any) => <span className="tabular-nums">{inr(r.grand_total)}</span> },
        ]}
      />
      <DocumentFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? "Edit Quotation" : "New Quotation"}
        primaryDateLabel="Issue Date"
        secondaryDateLabel="Valid Until"
        statuses={[
          { value: "draft", label: "Draft" },
          { value: "sent", label: "Sent" },
          { value: "accepted", label: "Accepted" },
          { value: "rejected", label: "Rejected" },
          { value: "expired", label: "Expired" },
        ]}
        initial={editing}
        onSubmit={async (v) => {
          const input: QuotationInput = {
            id: v.id, customer_id: v.customer_id, issue_date: v.primary_date, valid_until: v.secondary_date ?? null,
            status: v.status as any, tax_type: v.tax_type, notes: v.notes, lines: v.lines,
          };
          await save.mutateAsync(input);
        }}
      />
    </>
  );
}