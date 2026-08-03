import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileBarChart, Eye } from "lucide-react";
import { formatINR } from "@/features/gst/data";
import { useGstLedger, useEInvoices, useHsnCodes, downloadCsv } from "@/features/gst/gst-api";

export const Route = createFileRoute("/_authenticated/workspace/gst/reports")({
  component: GstReports,
});

const REPORTS = [
  { key: "sales-register", name: "GST Sales Register", desc: "Invoice-wise output GST for the selected period." },
  { key: "purchase-register", name: "GST Purchase Register", desc: "Invoice-wise input GST claimable." },
  { key: "hsn-summary", name: "HSN-wise Summary", desc: "Consolidated turnover grouped by tax rate / HSN." },
  { key: "b2b-invoices", name: "B2B Invoices", desc: "Registered-buyer invoices for GSTR-1 Table 4." },
  { key: "b2c-invoices", name: "B2C Invoices", desc: "Supplies to unregistered buyers." },
  { key: "itc-recon", name: "ITC Reconciliation", desc: "Input tax credit posted from vendor bills." },
  { key: "gstr-9", name: "GSTR-9 Annual Summary", desc: "Output tax, ITC and net liability for the period." },
] as const;

type ReportKey = typeof REPORTS[number]["key"];

function GstReports() {
  const today = new Date();
  const [from, setFrom] = useState(new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [active, setActive] = useState<ReportKey | null>(null);

  const ledger = useGstLedger(from, to);
  const { invoices } = useEInvoices();
  const { value: hsnCodes } = useHsnCodes();

  const invoicesInRange = useMemo(
    () => invoices.filter((i) => i.invoice_date >= from && i.invoice_date <= to),
    [invoices, from, to],
  );

  const build = useMemo(() => {
    const rows = ledger.data ?? [];
    const output = rows.filter((r) => r.kind === "output");
    const input = rows.filter((r) => r.kind === "input");
    const byRate = (src: typeof rows) => {
      const m = new Map<number, { rate: number; taxable: number; cgst: number; sgst: number; igst: number }>();
      for (const r of src) {
        const k = Number(r.rate);
        const e = m.get(k) ?? { rate: k, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        e.taxable += Number(r.taxable_value); e.cgst += Number(r.cgst); e.sgst += Number(r.sgst); e.igst += Number(r.igst);
        m.set(k, e);
      }
      return [...m.values()].sort((a, b) => a.rate - b.rate);
    };

    return (key: ReportKey): Record<string, unknown>[] => {
      switch (key) {
        case "sales-register":
          return output.map((r) => ({ date: r.txn_date, source: r.source_module ?? "", rate: `${r.rate}%`, taxable_value: Number(r.taxable_value), cgst: Number(r.cgst), sgst: Number(r.sgst), igst: Number(r.igst) }));
        case "purchase-register":
          return input.map((r) => ({ date: r.txn_date, source: r.source_module ?? "", rate: `${r.rate}%`, taxable_value: Number(r.taxable_value), cgst: Number(r.cgst), sgst: Number(r.sgst), igst: Number(r.igst) }));
        case "hsn-summary":
          return byRate(output).map((r) => ({
            rate: `${r.rate}%`,
            hsn_codes: hsnCodes.filter((h) => h.gstRate === r.rate).map((h) => h.code).join(" ") || "—",
            taxable_value: r.taxable, cgst: r.cgst, sgst: r.sgst, igst: r.igst,
          }));
        case "b2b-invoices":
          return invoicesInRange.filter((i) => !!i.customers?.gst_number).map((i) => ({
            invoice: i.invoice_number, date: i.invoice_date, buyer: i.customers?.name ?? "", gstin: i.customers?.gst_number ?? "",
            taxable_value: Number(i.subtotal), cgst: Number(i.cgst_total), sgst: Number(i.sgst_total), igst: Number(i.igst_total),
            total: Number(i.grand_total), irn: i.irn ?? "",
          }));
        case "b2c-invoices":
          return invoicesInRange.filter((i) => !i.customers?.gst_number).map((i) => ({
            invoice: i.invoice_number, date: i.invoice_date, buyer: i.customers?.name ?? "",
            taxable_value: Number(i.subtotal), tax: Number(i.cgst_total) + Number(i.sgst_total) + Number(i.igst_total), total: Number(i.grand_total),
          }));
        case "itc-recon":
          return byRate(input).map((r) => ({ rate: `${r.rate}%`, taxable_value: r.taxable, cgst: r.cgst, sgst: r.sgst, igst: r.igst, itc_claimable: r.cgst + r.sgst + r.igst }));
        case "gstr-9": {
          const o = output.reduce((s, r) => s + Number(r.cgst) + Number(r.sgst) + Number(r.igst), 0);
          const i = input.reduce((s, r) => s + Number(r.cgst) + Number(r.sgst) + Number(r.igst), 0);
          return [
            { particulars: "Total outward taxable value", amount: output.reduce((s, r) => s + Number(r.taxable_value), 0) },
            { particulars: "Total output tax", amount: o },
            { particulars: "Total input tax credit", amount: i },
            { particulars: "Net GST payable", amount: o - i },
          ];
        }
        default:
          return [];
      }
    };
  }, [ledger.data, invoicesInRange, hsnCodes]);

  const activeRows = active ? build(active) : [];
  const activeMeta = REPORTS.find((r) => r.key === active);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="text-xs text-muted-foreground">All reports are computed live from posted invoices, vendor bills and the GST ledger.</div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const count = build(r.key).length;
          return (
            <Card key={r.key}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><FileBarChart className="h-4 w-4 text-primary" /> {r.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{r.desc}</p>
                <div className="text-xs font-medium">{count} row{count === 1 ? "" : "s"}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setActive(r.key)}><Eye className="mr-1.5 h-3.5 w-3.5" /> Preview</Button>
                  <Button size="sm" variant="ghost" onClick={() => downloadCsv(`${r.key}-${from}-to-${to}.csv`, build(r.key))}><Download className="mr-1.5 h-3.5 w-3.5" /> CSV</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>{activeMeta?.name} · {from} → {to}</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
            {activeRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No data for this period.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>{Object.keys(activeRows[0]).map((h) => <TableHead key={h} className="capitalize">{h.replace(/_/g, " ")}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {activeRows.map((row, i) => (
                    <TableRow key={i}>
                      {Object.entries(row).map(([k, v]) => (
                        <TableCell key={k} className={typeof v === "number" ? "text-right" : ""}>
                          {typeof v === "number" ? formatINR(v, false) : String(v)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => active && downloadCsv(`${active}-${from}-to-${to}.csv`, activeRows)}><Download className="mr-1.5 h-4 w-4" /> Download CSV</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
