import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/finance/gst")({
  component: GstPage,
});
const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function GstPage() {
  const { company } = useAuth();
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data } = useQuery({
    enabled: !!company?.id,
    queryKey: ["gst", company?.id, from, to],
    queryFn: async () => {
      const { data } = await supabase.from("gst_ledger").select("*").eq("company_id", company!.id).gte("txn_date", from).lte("txn_date", to).order("txn_date", { ascending: false });
      return data ?? [];
    },
  });

  const totals = (data ?? []).reduce((acc: any, r: any) => {
    const k = r.kind;
    acc[k].taxable += Number(r.taxable_value);
    acc[k].cgst += Number(r.cgst); acc[k].sgst += Number(r.sgst); acc[k].igst += Number(r.igst);
    return acc;
  }, { output: { taxable: 0, cgst: 0, sgst: 0, igst: 0 }, input: { taxable: 0, cgst: 0, sgst: 0, igst: 0 } });
  const outputTotal = totals.output.cgst + totals.output.sgst + totals.output.igst;
  const inputTotal = totals.input.cgst + totals.input.sgst + totals.input.igst;
  const netPayable = outputTotal - inputTotal;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3 max-w-xl">
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Output GST (collected)</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{fmt(outputTotal)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Input GST (credit)</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{fmt(inputTotal)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Net GST payable</CardTitle></CardHeader><CardContent className={`text-2xl font-bold ${netPayable > 0 ? "text-amber-600" : "text-emerald-600"}`}>{fmt(netPayable)}</CardContent></Card>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Kind</TableHead><TableHead>Source</TableHead>
            <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">IGST</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(data?.length ?? 0) === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No GST transactions in this period.</TableCell></TableRow>
            ) : data!.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{r.txn_date}</TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded ${r.kind === "output" ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"}`}>{r.kind}</span></TableCell>
                <TableCell className="text-xs capitalize text-muted-foreground">{r.source_module}</TableCell>
                <TableCell className="text-right">{fmt(Number(r.taxable_value))}</TableCell>
                <TableCell className="text-right">{fmt(Number(r.cgst))}</TableCell>
                <TableCell className="text-right">{fmt(Number(r.sgst))}</TableCell>
                <TableCell className="text-right">{fmt(Number(r.igst))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}