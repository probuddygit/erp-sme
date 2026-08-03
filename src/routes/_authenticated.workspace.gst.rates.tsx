import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Percent, Pencil, Trash2, Download, Loader2 } from "lucide-react";
import { useGstRates, downloadCsv, type GstRateRow } from "@/features/gst/gst-api";

export const Route = createFileRoute("/_authenticated/workspace/gst/rates")({
  component: GstRatesPage,
});

type Draft = { id?: string; name: string; rate: number; cgst: number; sgst: number; igst: number; hsn_sac: string; is_active: boolean };
const EMPTY: Draft = { name: "", rate: 18, cgst: 9, sgst: 9, igst: 18, hsn_sac: "", is_active: true };

function GstRatesPage() {
  const { rates, isLoading, save, saving, remove } = useGstRates();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  function edit(r: GstRateRow) {
    setDraft({ id: r.id, name: r.name, rate: Number(r.rate), cgst: Number(r.cgst), sgst: Number(r.sgst), igst: Number(r.igst), hsn_sac: r.hsn_sac ?? "", is_active: r.is_active });
    setOpen(true);
  }

  function setRate(v: number) {
    setDraft((d) => ({ ...d, rate: v, cgst: v / 2, sgst: v / 2, igst: v }));
  }

  async function submit() {
    await save({ ...draft, hsn_sac: draft.hsn_sac || null } as never);
    setOpen(false);
    setDraft(EMPTY);
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Percent className="h-4 w-4" /> Statutory slabs — split into CGST + SGST for intra-state and full IGST for inter-state supplies.
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadCsv("gst-rates.csv", rates.map(({ id: _id, company_id: _c, ...r }) => r))}>
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
            <Button size="sm" onClick={() => { setDraft(EMPTY); setOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> New rate</Button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>HSN / SAC</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">IGST</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></TableCell></TableRow>
              ) : rates.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No GST rates configured yet.</TableCell></TableRow>
              ) : rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.hsn_sac ?? "—"}</TableCell>
                  <TableCell className="text-right">{Number(r.rate)}%</TableCell>
                  <TableCell className="text-right">{Number(r.cgst)}%</TableCell>
                  <TableCell className="text-right">{Number(r.sgst)}%</TableCell>
                  <TableCell className="text-right">{Number(r.igst)}%</TableCell>
                  <TableCell><Badge variant={r.is_active ? "secondary" : "outline"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => edit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm(`Delete ${r.name}?`)) void remove(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft.id ? "Edit GST rate" : "New GST rate"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="GST 18%" /></div>
            <div><Label>Rate %</Label><Input type="number" value={draft.rate} onChange={(e) => setRate(Number(e.target.value))} /></div>
            <div><Label>HSN / SAC</Label><Input value={draft.hsn_sac} onChange={(e) => setDraft({ ...draft, hsn_sac: e.target.value })} placeholder="Optional" /></div>
            <div><Label>CGST %</Label><Input type="number" value={draft.cgst} onChange={(e) => setDraft({ ...draft, cgst: Number(e.target.value) })} /></div>
            <div><Label>SGST %</Label><Input type="number" value={draft.sgst} onChange={(e) => setDraft({ ...draft, sgst: Number(e.target.value) })} /></div>
            <div><Label>IGST %</Label><Input type="number" value={draft.igst} onChange={(e) => setDraft({ ...draft, igst: Number(e.target.value) })} /></div>
            <div className="flex items-end gap-2"><Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} /><span className="text-sm">Active</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!draft.name || saving}>{saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
