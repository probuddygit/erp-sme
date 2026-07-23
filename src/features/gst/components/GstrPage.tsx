import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/shared/components/StatCard";
import { StatusPill } from "./StatusPill";
import { toast } from "sonner";
import { Download, Send, Loader2, IndianRupee, FileSpreadsheet, ClipboardList, CheckCircle2 } from "lucide-react";
import { formatDate, formatINR, type GstrPeriod } from "../data";
import { fileGstr } from "../api";

interface Props {
  title: string;
  description: string;
  kind: "GSTR1" | "GSTR3B";
  data: GstrPeriod[];
}

export function GstrPage({ title, description, kind, data }: Props) {
  const [rows, setRows] = useState<GstrPeriod[]>(data);
  const [busy, setBusy] = useState<string | null>(null);

  const totalTax = rows.reduce((s, p) => s + p.cgst + p.sgst + p.igst + p.cess, 0);
  const filed = rows.filter((r) => r.status === "filed").length;
  const draft = rows.filter((r) => r.status === "draft").length;

  async function handleFile(row: GstrPeriod) {
    setBusy(row.id);
    try {
      const res = await fileGstr(kind, row.period);
      setRows((s) => s.map((r) => r.id === row.id ? { ...r, status: "filed", filedAt: res.filedAt, arn: res.arn } : r));
      toast.success(`${title} for ${row.period} filed. ARN ${res.arn}`);
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Periods" value={String(rows.length)} icon={kind === "GSTR1" ? FileSpreadsheet : ClipboardList} />
        <StatCard label="Total tax" value={formatINR(totalTax)} icon={IndianRupee} />
        <StatCard label="Filed" value={String(filed)} icon={CheckCircle2} />
        <StatCard label="Draft" value={String(draft)} icon={ClipboardList} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead className="text-right">Taxable value</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">Cess</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ARN</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.period}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.invoices}</TableCell>
                  <TableCell className="text-right">{formatINR(r.taxableValue)}</TableCell>
                  <TableCell className="text-right">{formatINR(r.cgst)}</TableCell>
                  <TableCell className="text-right">{formatINR(r.sgst)}</TableCell>
                  <TableCell className="text-right">{formatINR(r.igst)}</TableCell>
                  <TableCell className="text-right">{formatINR(r.cess)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(r.dueDate)}</TableCell>
                  <TableCell><StatusPill label={r.status} /></TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{r.arn ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost"><Download className="h-3.5 w-3.5" /></Button>
                      {busy === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : r.status === "filed" ? (
                        <span className="text-xs text-muted-foreground">Filed</span>
                      ) : (
                        <Button size="sm" onClick={() => handleFile(r)}><Send className="mr-1 h-3.5 w-3.5" /> File</Button>
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