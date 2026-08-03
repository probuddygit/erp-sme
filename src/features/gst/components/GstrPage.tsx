import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/shared/components/StatCard";
import { StatusPill } from "./StatusPill";
import { toast } from "sonner";
import { Download, Send, Loader2, IndianRupee, FileSpreadsheet, ClipboardList, CheckCircle2 } from "lucide-react";
import { formatDate, formatINR } from "../data";
import { fileGstr } from "../api";
import { useGstLedger, useGstrFilings, downloadCsv, monthKey, monthLabel, type GstLedgerRow } from "../gst-api";

interface Props {
  title: string;
  description: string;
  kind: "GSTR1" | "GSTR3B";
}

interface Period {
  key: string;
  period: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  itc: number;
  invoices: number;
  dueDate: string;
  status: "draft" | "filed" | "overdue";
  arn?: string;
  filedAt?: string;
}

function dueDateFor(key: string, kind: "GSTR1" | "GSTR3B") {
  const [y, m] = key.split("-").map(Number);
  const next = new Date(Date.UTC(y, m, kind === "GSTR1" ? 11 : 20));
  return next.toISOString().slice(0, 10);
}

export function GstrPage({ title, description, kind }: Props) {
  const ledger = useGstLedger();
  const filings = useGstrFilings();
  const [busy, setBusy] = useState<string | null>(null);

  const periods = useMemo<Period[]>(() => {
    const rows = (ledger.data ?? []) as GstLedgerRow[];
    const map = new Map<string, Period>();
    for (const r of rows) {
      const key = monthKey(r.txn_date);
      if (!map.has(key)) {
        map.set(key, {
          key, period: monthLabel(key), taxableValue: 0, cgst: 0, sgst: 0, igst: 0, itc: 0,
          invoices: 0, dueDate: dueDateFor(key, kind), status: "draft",
        });
      }
      const p = map.get(key)!;
      const tax = Number(r.cgst) + Number(r.sgst) + Number(r.igst);
      if (r.kind === "output") {
        p.taxableValue += Number(r.taxable_value);
        p.cgst += Number(r.cgst); p.sgst += Number(r.sgst); p.igst += Number(r.igst);
        p.invoices += 1;
      } else {
        p.itc += tax;
      }
    }
    const today = new Date().toISOString().slice(0, 10);
    return [...map.values()]
      .map((p) => {
        const filed = filings.value.find((f) => f.key === `${kind}-${p.key}`);
        return {
          ...p,
          status: filed ? "filed" : p.dueDate < today ? "overdue" : "draft",
          arn: filed?.arn,
          filedAt: filed?.filedAt,
        } as Period;
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [ledger.data, filings.value, kind]);

  const totalTax = periods.reduce((s, p) => s + p.cgst + p.sgst + p.igst, 0);
  const filed = periods.filter((p) => p.status === "filed").length;
  const pending = periods.length - filed;

  async function handleFile(p: Period) {
    setBusy(p.key);
    try {
      const res = await fileGstr(kind, p.period);
      await filings.save([
        ...filings.value.filter((f) => f.key !== `${kind}-${p.key}`),
        { key: `${kind}-${p.key}`, arn: res.arn, filedAt: res.filedAt, status: "filed" },
      ]);
      toast.success(`${title} for ${p.period} filed. ARN ${res.arn}`);
    } finally { setBusy(null); }
  }

  function exportPeriod(p: Period) {
    const rows = (ledger.data ?? []).filter((r) => monthKey(r.txn_date) === p.key);
    downloadCsv(`${kind}-${p.key}.csv`, rows.map((r) => ({
      date: r.txn_date, kind: r.kind, rate: r.rate, taxable_value: r.taxable_value,
      cgst: r.cgst, sgst: r.sgst, igst: r.igst, source: r.source_module ?? "",
    })));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Periods" value={String(periods.length)} icon={kind === "GSTR1" ? FileSpreadsheet : ClipboardList} />
        <StatCard label="Total output tax" value={formatINR(totalTax)} icon={IndianRupee} />
        <StatCard label="Filed" value={String(filed)} icon={CheckCircle2} />
        <StatCard label="Pending" value={String(pending)} icon={ClipboardList} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Entries</TableHead>
                <TableHead className="text-right">Taxable value</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                {kind === "GSTR3B" && <TableHead className="text-right">ITC</TableHead>}
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ARN</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.isLoading ? (
                <TableRow><TableCell colSpan={11} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : periods.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="py-10 text-center text-muted-foreground">No GST transactions posted yet — invoices and vendor bills feed this return automatically.</TableCell></TableRow>
              ) : periods.map((p) => (
                <TableRow key={p.key}>
                  <TableCell className="font-medium">{p.period}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.invoices}</TableCell>
                  <TableCell className="text-right">{formatINR(p.taxableValue)}</TableCell>
                  <TableCell className="text-right">{formatINR(p.cgst)}</TableCell>
                  <TableCell className="text-right">{formatINR(p.sgst)}</TableCell>
                  <TableCell className="text-right">{formatINR(p.igst)}</TableCell>
                  {kind === "GSTR3B" && <TableCell className="text-right">{formatINR(p.itc)}</TableCell>}
                  <TableCell className="text-xs text-muted-foreground">{formatDate(p.dueDate)}</TableCell>
                  <TableCell><StatusPill label={p.status} /></TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{p.arn ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => exportPeriod(p)} title="Download workings"><Download className="h-3.5 w-3.5" /></Button>
                      {busy === p.key ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : p.status === "filed" ? (
                        <span className="text-xs text-muted-foreground">Filed {p.filedAt ? formatDate(p.filedAt) : ""}</span>
                      ) : (
                        <Button size="sm" onClick={() => handleFile(p)}><Send className="mr-1 h-3.5 w-3.5" /> File</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}
