import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/shared/components/StatCard";
import { StatusPill } from "@/features/gst/components/StatusPill";
import { toast } from "sonner";
import { FileCheck2, XCircle, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { EINVOICES, formatDate, formatINR, type EInvoiceRow } from "@/features/gst/data";
import { generateIrn, cancelIrn } from "@/features/gst/api";

export const Route = createFileRoute("/_authenticated/workspace/gst/e-invoice")({
  component: EInvoicePage,
});

function EInvoicePage() {
  const [rows, setRows] = useState<EInvoiceRow[]>(EINVOICES);
  const [busy, setBusy] = useState<string | null>(null);

  const totals = {
    total: rows.length,
    generated: rows.filter((r) => r.status === "generated").length,
    pending: rows.filter((r) => r.status === "pending").length,
    failed: rows.filter((r) => r.status === "failed").length,
  };

  async function handleGenerate(row: EInvoiceRow) {
    setBusy(row.id);
    try {
      const res = await generateIrn({
        invoiceNumber: row.invoiceNumber,
        invoiceDate: row.invoiceDate,
        supplierGstin: "29AABCI1234F1Z5",
        buyerGstin: row.buyerGstin,
        totalValue: row.totalValue,
        taxableValue: row.totalValue * 0.85,
        cgst: 0, sgst: 0, igst: row.totalValue * 0.15,
      });
      setRows((s) => s.map((r) => r.id === row.id ? { ...r, irn: res.irn, ackNo: res.ackNo, ackDate: res.ackDate, status: "generated" } : r));
      toast.success(`IRN generated for ${row.invoiceNumber}`);
    } finally { setBusy(null); }
  }

  async function handleCancel(row: EInvoiceRow) {
    if (!row.irn) return;
    setBusy(row.id);
    try {
      await cancelIrn(row.irn, "Buyer request");
      setRows((s) => s.map((r) => r.id === row.id ? { ...r, status: "cancelled" } : r));
      toast.success(`IRN cancelled for ${row.invoiceNumber}`);
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total invoices" value={String(totals.total)} icon={FileCheck2} />
        <StatCard label="IRN generated" value={String(totals.generated)} icon={CheckCircle2} />
        <StatCard label="Pending" value={String(totals.pending)} icon={RefreshCw} />
        <StatCard label="Failed" value={String(totals.failed)} icon={XCircle} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>IRN</TableHead>
                <TableHead>Ack</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.invoiceNumber}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.invoiceDate)}</TableCell>
                  <TableCell>{r.buyer}</TableCell>
                  <TableCell className="font-mono text-xs">{r.buyerGstin}</TableCell>
                  <TableCell className="text-right">{formatINR(r.totalValue)}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{r.irn ?? "—"}</TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {r.ackNo ? <>{r.ackNo}<br />{r.ackDate && formatDate(r.ackDate)}</> : "—"}
                  </TableCell>
                  <TableCell><StatusPill label={r.status} /></TableCell>
                  <TableCell className="text-right">
                    {busy === r.id ? (
                      <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
                    ) : r.status === "generated" ? (
                      <Button size="sm" variant="ghost" onClick={() => handleCancel(r)}><XCircle className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
                    ) : r.status === "cancelled" ? (
                      <span className="text-xs text-muted-foreground">Cancelled</span>
                    ) : (
                      <Button size="sm" onClick={() => handleGenerate(r)}><FileCheck2 className="mr-1 h-3.5 w-3.5" /> Generate IRN</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-[11px] text-muted-foreground">
        Placeholder adapter — swap to the NIC IRP via <code className="font-mono">configureGstApi()</code> in <code className="font-mono">src/features/gst/api.ts</code>.
      </p>
    </div>
  );
}