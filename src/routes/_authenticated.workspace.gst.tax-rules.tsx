import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Scale, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTaxRules, useGstRates, type TaxRuleEntry } from "@/features/gst/gst-api";

export const Route = createFileRoute("/_authenticated/workspace/gst/tax-rules")({
  component: TaxRulesPage,
});

const EMPTY: TaxRuleEntry = { id: "", name: "", scope: "sales", supplyType: "intra-state", hsnPattern: "*", rateId: "", priority: 10, active: true };

function TaxRulesPage() {
  const { value: rules, save, saving, isLoading } = useTaxRules();
  const { rates } = useGstRates();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TaxRuleEntry>(EMPTY);

  const rateName = (id: string) => rates.find((r) => r.id === id)?.name ?? "—";
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  async function submit() {
    const entry = { ...draft, id: draft.id || crypto.randomUUID() };
    await save(draft.id ? rules.map((r) => (r.id === draft.id ? entry : r)) : [...rules, entry]);
    toast.success("Tax rule saved");
    setOpen(false);
  }

  async function toggle(rule: TaxRuleEntry) {
    await save(rules.map((r) => (r.id === rule.id ? { ...r, active: !r.active } : r)));
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Scale className="h-4 w-4" /> Rules resolve the applicable tax slab per line based on scope, supply type and HSN pattern.
          </div>
          <Button size="sm" onClick={() => { setDraft(EMPTY); setOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> New rule</Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Supply</TableHead>
                <TableHead>HSN pattern</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : sorted.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No tax rules configured yet.</TableCell></TableRow>
              ) : sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm text-muted-foreground">{r.priority}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.scope}</Badge></TableCell>
                  <TableCell className="text-xs capitalize text-muted-foreground">{r.supplyType}</TableCell>
                  <TableCell className="font-mono text-xs">{r.hsnPattern}</TableCell>
                  <TableCell>{rateName(r.rateId)}</TableCell>
                  <TableCell><button onClick={() => void toggle(r)}><Badge variant={r.active ? "secondary" : "outline"}>{r.active ? "Active" : "Inactive"}</Badge></button></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setDraft(r); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={async () => { if (confirm(`Delete rule "${r.name}"?`)) { await save(rules.filter((x) => x.id !== r.id)); toast.success("Rule deleted"); } }}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{draft.id ? "Edit tax rule" : "New tax rule"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Rule name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div><Label>Scope</Label>
              <Select value={draft.scope} onValueChange={(v) => setDraft({ ...draft, scope: v as TaxRuleEntry["scope"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="sales">Sales</SelectItem><SelectItem value="purchase">Purchase</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Supply type</Label>
              <Select value={draft.supplyType} onValueChange={(v) => setDraft({ ...draft, supplyType: v as TaxRuleEntry["supplyType"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="intra-state">Intra-state</SelectItem>
                  <SelectItem value="inter-state">Inter-state</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                  <SelectItem value="sez">SEZ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>HSN pattern</Label><Input value={draft.hsnPattern} onChange={(e) => setDraft({ ...draft, hsnPattern: e.target.value })} className="font-mono" /></div>
            <div><Label>Priority</Label><Input type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} /></div>
            <div className="sm:col-span-2"><Label>GST rate</Label>
              <Select value={draft.rateId} onValueChange={(v) => setDraft({ ...draft, rateId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a rate" /></SelectTrigger>
                <SelectContent>{rates.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /><span className="text-sm">Active</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!draft.name || !draft.rateId || saving}>{saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
