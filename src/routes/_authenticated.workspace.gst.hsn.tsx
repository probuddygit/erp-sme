import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Plus, Search, Pencil, Trash2, DownloadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useHsnCodes, useItemHsnSuggestions, downloadCsv, type HsnEntry } from "@/features/gst/gst-api";

export const Route = createFileRoute("/_authenticated/workspace/gst/hsn")({
  component: HsnMaster,
});

const EMPTY: HsnEntry = { id: "", code: "", description: "", chapter: "", gstRate: 18, type: "goods", uom: "NOS" };

function HsnMaster() {
  const { value: codes, save, saving, isLoading } = useHsnCodes();
  const items = useItemHsnSuggestions();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<HsnEntry>(EMPTY);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? codes.filter((h) => [h.code, h.description, h.chapter].some((v) => (v ?? "").toLowerCase().includes(t))) : codes;
  }, [q, codes]);

  async function submit() {
    const entry = { ...draft, chapter: draft.chapter || draft.code.slice(0, 2), id: draft.id || crypto.randomUUID() };
    const next = draft.id ? codes.map((c) => (c.id === draft.id ? entry : c)) : [...codes, entry];
    await save(next);
    toast.success("HSN saved");
    setOpen(false);
  }

  async function importFromItems() {
    const data = items.data ?? [];
    const existing = new Set(codes.map((c) => c.code));
    const added: HsnEntry[] = [];
    for (const it of data) {
      const code = String(it.hsn_code ?? "").trim();
      if (!code || existing.has(code)) continue;
      existing.add(code);
      added.push({
        id: crypto.randomUUID(),
        code,
        description: it.name ?? "",
        chapter: code.slice(0, 2),
        gstRate: 18,
        type: it.item_type === "service" ? "service" : "goods",
        uom: (it.unit ?? "NOS").toUpperCase(),
      });
    }
    if (!added.length) { toast.info("No new HSN codes found on items"); return; }
    await save([...codes, ...added]);
    toast.success(`${added.length} HSN code(s) imported from Item master`);
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search HSN / SAC by code, description or chapter…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={importFromItems} disabled={saving}><DownloadCloud className="mr-1.5 h-4 w-4" /> Import from Items</Button>
          <Button size="sm" variant="outline" onClick={() => downloadCsv("hsn-master.csv", rows.map(({ id: _i, ...r }) => r))}><Download className="mr-1.5 h-4 w-4" /> Export</Button>
          <Button size="sm" onClick={() => { setDraft(EMPTY); setOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> New HSN</Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HSN / SAC</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">GST %</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No HSN codes yet — add one or import from your Item master.</TableCell></TableRow>
              ) : rows.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono font-medium">{h.code}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{h.chapter}</TableCell>
                  <TableCell>{h.description}</TableCell>
                  <TableCell><Badge variant={h.type === "goods" ? "secondary" : "outline"} className="capitalize">{h.type}</Badge></TableCell>
                  <TableCell className="text-xs uppercase text-muted-foreground">{h.uom}</TableCell>
                  <TableCell className="text-right font-medium">{h.gstRate}%</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setDraft(h); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={async () => { if (confirm(`Delete HSN ${h.code}?`)) { await save(codes.filter((c) => c.id !== h.id)); toast.success("HSN deleted"); } }}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{draft.id ? "Edit HSN / SAC" : "New HSN / SAC"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Code</Label><Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} className="font-mono" /></div>
            <div><Label>Chapter</Label><Input value={draft.chapter} onChange={(e) => setDraft({ ...draft, chapter: e.target.value })} placeholder="Auto from code" /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
            <div><Label>Type</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v as HsnEntry["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="goods">Goods</SelectItem><SelectItem value="service">Service</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>UOM</Label><Input value={draft.uom} onChange={(e) => setDraft({ ...draft, uom: e.target.value })} /></div>
            <div><Label>GST %</Label><Input type="number" value={draft.gstRate} onChange={(e) => setDraft({ ...draft, gstRate: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!draft.code || saving}>{saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
