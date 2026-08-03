import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatCard } from "@/shared/components/StatCard";
import { StatusPill } from "@/features/gst/components/StatusPill";
import { toast } from "sonner";
import { FileCheck2, CheckCircle2, Clock3, XCircle, Loader2, Download, Search } from "lucide-react";
import { formatDate, formatINR } from "@/features/gst/data";
import { generateIrn, cancelIrn } from "@/features/gst/api";
import { useEInvoices, useGstProfile, downloadCsv, type EInvoiceLive } from "@/features/gst/gst-api";

export const Route = createFileRoute("/_authenticated/workspace/gst/e-invoice")({
  component: EInvoicePage,
});

function statusOf(r: EInvoiceLive): "pending" | "generated" | "cancelled" {
  const payload = (r.einvoice_payload ?? {}) as { status?: string };
  if (payload.status === "cancelled") return "cancelled";
  return r.irn || r.einvoice_irn ? "generated" : "pending";
}

function EInvoicePage() {
  const { invoices, isLoading, patch } = useEInvoices();
  const { value: profile } = useGstProfile();
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cancelRow, setCancelRow] = useState<EInvoiceLive | null>(null);
  const [reason, setReason] = useState("Data entry error");

  const rows = invoices.filter((r) => {
    const t = q.trim().toLowerCase();
    return !t || r.invoice_number.toLowerCase().includes(t) || (r.customers?.name ?? "").toLowerCase().includes(t);
  });

  const totals = {
    generated: invoices.filter((r) => statusOf(r) === "generated").length,
    pending: invoices.filter((r) => statusOf(r) === "pending").length,
    cancelled: invoices.filter((r) => statusOf(r) === "cancelled").length,
  };

  async function handleGenerate(row: EInvoiceLive) {
    if (!row.customers?.gst_number) {
      toast.error("Buyer GSTIN missing — e-Invoice applies to B2B invoices only");
      return;
    }
    setBusy(row.id);
    try {
      const res = await generateIrn({
        invoiceNumber: row.invoice_number,
        invoiceDate: row.invoice_date,
        supplierGstin: profile.gstin,
        buyerGstin: row.customers.gst_number,
        totalValue: Number(row.grand_total),
        taxableValue: Number(row.subtotal),
        cgst: Number(row.cgst_total),
        sgst: Number(row.sgst_total),
        igst: Number(row.igst_total),
      });
      await patch({
        id: row.id,
        values: {
          irn: res.irn,
          einvoice_irn: res.irn,
          qr_code_data: res.qrCode,
          einvoice_payload: { status: "generated", ackNo: res.ackNo, ackDate: res.ackDate, irn: res.irn },
        },
      });
      toast.success(`IRN generated for ${row.invoice_number}`);
    } finally { setBusy(null); }
  }

  async function handleCancel() {
    if (!cancelRow) return;
    setBusy(cancelRow.id);
    try {
      const res = await cancelIrn(cancelRow.irn ?? cancelRow.einvoice_irn ?? "", reason);
      await patch({
        id: cancelRow.id,
        values: { einvoice_payload: { status: "cancelled", irn: res.irn, reason, cancelledAt: new Date().toISOString() } },
      });
      toast.success(`IRN cancelled for ${cancelRow.invoice_number}`);
      setCancelRow(null);
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total invoices" value={String(invoices.length)} icon={FileCheck2} />
        <StatCard label="IRN generated" value={String(totals.generated)} icon={CheckCircle2} />
        <StatCard label="Pending" value={String(totals.pending)} icon={Clock3} />
        <StatCard label="Cancelled" value={String(totals.cancelled)} icon={XCircle} />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search by invoice number or buyer…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button size="sm" variant="outline" onClick={() => downloadCsv("e-invoices.csv", rows.map((r) => ({
              invoice: r.invoice_number, date: r.invoice_date, buyer: r.customers?.name ?? "", gstin: r.customers?.gst_number ?? "",
              value: r.grand_total, irn: r.irn ?? "", status: statusOf(r),
            })))}><Download className="mr-1.5 h-4 w-4" /> Export</Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>IRN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No invoices found.</TableCell></TableRow>
                ) : rows.map((r) => {
                  const st = statusOf(r);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.invoice_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(r.invoice_date)}</TableCell>
                      <TableCell>{r.customers?.name ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.customers?.gst_number ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(r.grand_total))}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{r.irn ?? r.einvoice_irn ?? "—"}</TableCell>
                      <TableCell><StatusPill label={st} /></TableCell>
                      <TableCell className="text-right">
                        {busy === r.id ? (
                          <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
                        ) : st === "pending" ? (
                          <Button size="sm" onClick={() => handleGenerate(r)}><FileCheck2 className="mr-1 h-3.5 w-3.5" /> Generate IRN</Button>
                        ) : st === "generated" ? (
                          <Button size="sm" variant="outline" onClick={() => { setCancelRow(r); setReason("Data entry error"); }}>Cancel IRN</Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Cancelled</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!cancelRow} onOpenChange={(o) => !o && setCancelRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel IRN — {cancelRow?.invoice_number}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">IRN can be cancelled within 24 hours of generation on the IRP.</p>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cancellation reason" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelRow(null)}>Close</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!reason}>Cancel IRN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
