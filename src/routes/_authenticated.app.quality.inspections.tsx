import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, AlertTriangle, ClipboardCheck, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/quality/inspections")({
  component: InspectionsPage,
});

type Stage = "incoming" | "in_process" | "finished";
type Result = "pending" | "accepted" | "rejected" | "accepted_with_deviation";

type Inspection = {
  id: string; inspection_number: string; stage: Stage; result: Result;
  inspection_date: string; item_name: string | null; batch_no: string | null;
  reference_type: string | null; reference_number: string | null;
  quantity_inspected: number; quantity_accepted: number; quantity_rejected: number;
  inspector_name: string | null; remarks: string | null;
};

type ItemRow = { id: string; name: string; sku: string };
type GrnRow = { id: string; grn_number: string };
type WoRow = { id: string; wo_number: string };

type Checklist = { parameter: string; expected: string; actual: string; passed: boolean; notes: string };

const DEFAULT_CHECKS: Record<Stage, Checklist[]> = {
  incoming: [
    { parameter: "Visual condition", expected: "No damage", actual: "", passed: true, notes: "" },
    { parameter: "Quantity match", expected: "Matches PO", actual: "", passed: true, notes: "" },
    { parameter: "Material certificate", expected: "Provided", actual: "", passed: true, notes: "" },
    { parameter: "Dimensional check", expected: "Within tolerance", actual: "", passed: true, notes: "" },
  ],
  in_process: [
    { parameter: "Process parameter", expected: "Within spec", actual: "", passed: true, notes: "" },
    { parameter: "Tooling condition", expected: "OK", actual: "", passed: true, notes: "" },
    { parameter: "First-piece check", expected: "Pass", actual: "", passed: true, notes: "" },
  ],
  finished: [
    { parameter: "Final dimensions", expected: "As drawing", actual: "", passed: true, notes: "" },
    { parameter: "Surface finish", expected: "Acceptable", actual: "", passed: true, notes: "" },
    { parameter: "Functional test", expected: "Pass", actual: "", passed: true, notes: "" },
    { parameter: "Packaging & labelling", expected: "Correct", actual: "", passed: true, notes: "" },
  ],
};

function InspectionsPage() {
  const { company, isCompanyAdmin, hasRole, profile } = useAuth();
  const canManage = isCompanyAdmin || hasRole("quality") || hasRole("production");

  const [list, setList] = useState<Inspection[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [grns, setGrns] = useState<GrnRow[]>([]);
  const [wos, setWos] = useState<WoRow[]>([]);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Inspection | null>(null);
  const [viewing, setViewing] = useState<Inspection | null>(null);
  const [viewChecks, setViewChecks] = useState<Array<{ parameter: string; expected_value: string | null; actual_value: string | null; passed: boolean; notes: string | null }>>([]);

  const [form, setForm] = useState({
    stage: "incoming" as Stage,
    inspection_date: new Date().toISOString().slice(0, 10),
    item_id: "",
    batch_no: "",
    reference_id: "",
    quantity_inspected: 0,
    quantity_accepted: 0,
    quantity_rejected: 0,
    inspector_name: profile?.full_name ?? "",
    remarks: "",
    result: "pending" as Result,
  });
  const [checks, setChecks] = useState<Checklist[]>(DEFAULT_CHECKS.incoming);

  const load = async () => {
    if (!company?.id) return;
    let q = supabase.from("qc_inspections").select("*").eq("company_id", company.id).order("inspection_date", { ascending: false });
    if (filterStage !== "all") q = q.eq("stage", filterStage as Stage);
    const { data } = await q;
    setList((data ?? []) as Inspection[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [company?.id, filterStage]);

  useEffect(() => {
    if (!company?.id) return;
    (async () => {
      const [{ data: it }, { data: gr }, { data: w }] = await Promise.all([
        supabase.from("items").select("id,name,sku").eq("company_id", company.id).eq("is_active", true).order("name"),
        supabase.from("grns").select("id,grn_number").eq("company_id", company.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("work_orders").select("id,wo_number").eq("company_id", company.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setItems((it ?? []) as ItemRow[]);
      setGrns((gr ?? []) as GrnRow[]);
      setWos((w ?? []) as WoRow[]);
    })();
  }, [company?.id]);

  const referenceOptions = useMemo(() => {
    if (form.stage === "incoming") return grns.map((g) => ({ id: g.id, label: g.grn_number, type: "grn" }));
    if (form.stage === "in_process") return wos.map((w) => ({ id: w.id, label: w.wo_number, type: "work_order" }));
    return wos.map((w) => ({ id: w.id, label: w.wo_number, type: "work_order" }));
  }, [form.stage, grns, wos]);

  const referenceType = form.stage === "incoming" ? "grn" : "work_order";

  const onStageChange = (v: Stage) => {
    setForm((f) => ({ ...f, stage: v, reference_id: "" }));
    setChecks(DEFAULT_CHECKS[v].map((c) => ({ ...c })));
  };

  const setCheck = (i: number, patch: Partial<Checklist>) =>
    setChecks((arr) => arr.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const addCheck = () => setChecks((a) => [...a, { parameter: "", expected: "", actual: "", passed: true, notes: "" }]);
  const removeCheck = (i: number) => setChecks((a) => a.filter((_, idx) => idx !== i));

  const computedResult = (): Result => {
    if (form.result !== "pending") return form.result;
    const anyFail = checks.some((c) => !c.passed);
    const rej = Number(form.quantity_rejected) > 0;
    if (anyFail || rej) return Number(form.quantity_accepted) > 0 ? "accepted_with_deviation" : "rejected";
    if (Number(form.quantity_inspected) > 0 && Number(form.quantity_accepted) > 0) return "accepted";
    return "pending";
  };

  const submit = async () => {
    if (!company?.id) return;
    setSubmitting(true);
    try {
      const item = items.find((x) => x.id === form.item_id);
      const ref = referenceOptions.find((r) => r.id === form.reference_id);
      const result = computedResult();
      let inspId: string;
      if (editing) {
        const { error } = await supabase.from("qc_inspections").update({
          stage: form.stage,
          inspection_date: form.inspection_date,
          reference_type: ref ? referenceType : null,
          reference_id: ref?.id ?? null,
          reference_number: ref?.label ?? null,
          item_id: form.item_id || null,
          item_name: item?.name ?? null,
          batch_no: form.batch_no || null,
          quantity_inspected: Number(form.quantity_inspected),
          quantity_accepted: Number(form.quantity_accepted),
          quantity_rejected: Number(form.quantity_rejected),
          result,
          inspector_name: form.inspector_name || null,
          remarks: form.remarks || null,
        }).eq("id", editing.id);
        if (error) throw error;
        inspId = editing.id;
        await supabase.from("qc_inspection_items").delete().eq("inspection_id", inspId);
      } else {
        const number = `QC-${Date.now().toString().slice(-6)}`;
        const { data: insp, error } = await supabase.from("qc_inspections").insert({
        company_id: company.id,
        inspection_number: number,
        stage: form.stage,
        inspection_date: form.inspection_date,
        reference_type: ref ? referenceType : null,
        reference_id: ref?.id ?? null,
        reference_number: ref?.label ?? null,
        item_id: form.item_id || null,
        item_name: item?.name ?? null,
        batch_no: form.batch_no || null,
        quantity_inspected: Number(form.quantity_inspected),
        quantity_accepted: Number(form.quantity_accepted),
        quantity_rejected: Number(form.quantity_rejected),
        result,
        inspector_name: form.inspector_name || null,
        remarks: form.remarks || null,
      }).select().single();
        if (error) throw error;
        inspId = insp.id;
      }
      const rows = checks.filter((c) => c.parameter.trim()).map((c, i) => ({
        company_id: company.id,
        inspection_id: inspId,
        position: i,
        parameter: c.parameter,
        expected_value: c.expected || null,
        actual_value: c.actual || null,
        passed: c.passed,
        notes: c.notes || null,
      }));
      if (rows.length) await supabase.from("qc_inspection_items").insert(rows);

      // Auto-raise NCR on rejection
      if (!editing && (result === "rejected" || result === "accepted_with_deviation")) {
        const failed = checks.filter((c) => !c.passed).map((c) => c.parameter).join(", ");
        await supabase.from("ncr_records").insert({
          company_id: company.id,
          ncr_number: `NCR-${Date.now().toString().slice(-6)}`,
          raised_date: form.inspection_date,
          inspection_id: inspId,
          source_stage: form.stage,
          reference_type: ref ? referenceType : null,
          reference_id: ref?.id ?? null,
          reference_number: ref?.label ?? null,
          item_id: form.item_id || null,
          item_name: item?.name ?? null,
          batch_no: form.batch_no || null,
          quantity: Number(form.quantity_rejected) || Number(form.quantity_inspected),
          severity: result === "rejected" ? "major" : "minor",
          status: "open",
          defect_description: failed || form.remarks || "Failed inspection",
        });
        toast.success(`Inspection saved · NCR auto-raised`);
      } else {
        toast.success(editing ? "Inspection updated" : "Inspection saved");
      }
      setOpen(false);
      setEditing(null);
      setForm({ ...form, item_id: "", batch_no: "", reference_id: "", quantity_inspected: 0, quantity_accepted: 0, quantity_rejected: 0, remarks: "", result: "pending" });
      setChecks(DEFAULT_CHECKS[form.stage].map((c) => ({ ...c })));
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete inspection?")) return;
    const { error } = await supabase.from("qc_inspections").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const openEdit = async (r: Inspection) => {
    setEditing(r);
    setForm({
      stage: r.stage,
      inspection_date: r.inspection_date,
      item_id: "",
      batch_no: r.batch_no ?? "",
      reference_id: "",
      quantity_inspected: Number(r.quantity_inspected),
      quantity_accepted: Number(r.quantity_accepted),
      quantity_rejected: Number(r.quantity_rejected),
      inspector_name: r.inspector_name ?? "",
      remarks: r.remarks ?? "",
      result: r.result,
    });
    const { data: full } = await supabase.from("qc_inspections").select("item_id,reference_id").eq("id", r.id).single();
    const { data: items } = await supabase.from("qc_inspection_items").select("parameter,expected_value,actual_value,passed,notes").eq("inspection_id", r.id).order("position");
    setForm((f) => ({ ...f, item_id: full?.item_id ?? "", reference_id: full?.reference_id ?? "" }));
    setChecks((items ?? []).map((c) => ({
      parameter: c.parameter,
      expected: c.expected_value ?? "",
      actual: c.actual_value ?? "",
      passed: c.passed,
      notes: c.notes ?? "",
    })));
    setOpen(true);
  };

  const openView = async (r: Inspection) => {
    setViewing(r);
    const { data } = await supabase.from("qc_inspection_items").select("parameter,expected_value,actual_value,passed,notes").eq("inspection_id", r.id).order("position");
    setViewChecks(data ?? []);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> QC Inspections</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                <SelectItem value="incoming">Incoming (GRN)</SelectItem>
                <SelectItem value="in_process">In-process</SelectItem>
                <SelectItem value="finished">Finished goods</SelectItem>
              </SelectContent>
            </Select>
            {canManage && (
              <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
                <DialogTrigger asChild><Button onClick={() => { setEditing(null); setForm({ ...form, item_id: "", batch_no: "", reference_id: "", quantity_inspected: 0, quantity_accepted: 0, quantity_rejected: 0, remarks: "", result: "pending" }); setChecks(DEFAULT_CHECKS[form.stage].map((c) => ({ ...c }))); }}><Plus className="h-4 w-4 mr-1" /> New inspection</Button></DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editing ? `Edit ${editing.inspection_number}` : "New QC inspection"}</DialogTitle></DialogHeader>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Stage</Label>
                      <Select value={form.stage} onValueChange={(v) => onStageChange(v as Stage)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="incoming">Incoming (GRN)</SelectItem>
                          <SelectItem value="in_process">In-process</SelectItem>
                          <SelectItem value="finished">Finished goods</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date</Label>
                      <Input type="date" value={form.inspection_date} onChange={(e) => setForm({ ...form, inspection_date: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{form.stage === "incoming" ? "GRN" : "Work order"}</Label>
                      <Select value={form.reference_id} onValueChange={(v) => setForm({ ...form, reference_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {referenceOptions.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Item</Label>
                      <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>
                          {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.sku})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Batch / Lot</Label>
                      <Input value={form.batch_no} onChange={(e) => setForm({ ...form, batch_no: e.target.value })} placeholder="BATCH-001" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Inspector</Label>
                      <Input value={form.inspector_name} onChange={(e) => setForm({ ...form, inspector_name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Qty inspected</Label>
                      <Input type="number" value={form.quantity_inspected} onChange={(e) => setForm({ ...form, quantity_inspected: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Qty accepted</Label>
                      <Input type="number" value={form.quantity_accepted} onChange={(e) => setForm({ ...form, quantity_accepted: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Qty rejected</Label>
                      <Input type="number" value={form.quantity_rejected} onChange={(e) => setForm({ ...form, quantity_rejected: Number(e.target.value) })} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Checklist</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addCheck}><Plus className="h-3 w-3 mr-1" /> Add row</Button>
                    </div>
                    <div className="border border-border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parameter</TableHead>
                            <TableHead>Expected</TableHead>
                            <TableHead>Actual</TableHead>
                            <TableHead className="w-24">Result</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {checks.map((c, i) => (
                            <TableRow key={i}>
                              <TableCell><Input value={c.parameter} onChange={(e) => setCheck(i, { parameter: e.target.value })} /></TableCell>
                              <TableCell><Input value={c.expected} onChange={(e) => setCheck(i, { expected: e.target.value })} /></TableCell>
                              <TableCell><Input value={c.actual} onChange={(e) => setCheck(i, { actual: e.target.value })} /></TableCell>
                              <TableCell>
                                <Select value={c.passed ? "pass" : "fail"} onValueChange={(v) => setCheck(i, { passed: v === "pass" })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pass">Pass</SelectItem>
                                    <SelectItem value="fail">Fail</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Button size="icon" variant="ghost" onClick={() => removeCheck(i)}><Trash2 className="h-3 w-3" /></Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Override result (optional)</Label>
                      <Select value={form.result} onValueChange={(v) => setForm({ ...form, result: v as Result })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Auto from checklist</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="accepted_with_deviation">Accepted with deviation</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Remarks</Label>
                      <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2} />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Rejected or deviated inspections automatically raise an NCR.
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
                    <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : editing ? "Update" : "Save inspection"}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Insp / Acc / Rej</TableHead>
                <TableHead>Result</TableHead>
                {canManage && <TableHead className="w-10"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow><TableCell colSpan={canManage ? 9 : 8} className="text-center text-muted-foreground py-8">No inspections yet.</TableCell></TableRow>
              ) : list.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.inspection_number}</TableCell>
                  <TableCell>{r.inspection_date}</TableCell>
                  <TableCell><Badge variant="outline">{r.stage.replace("_", " ")}</Badge></TableCell>
                  <TableCell>{r.item_name ?? "—"}</TableCell>
                  <TableCell>{r.batch_no ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.reference_number ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.quantity_inspected} / {r.quantity_accepted} / {r.quantity_rejected}</TableCell>
                  <TableCell>
                    <Badge variant={r.result === "accepted" ? "default" : r.result === "rejected" ? "destructive" : "secondary"}>
                      {r.result.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" title="View" onClick={() => openView(r)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" title="Delete" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(v) => { if (!v) { setViewing(null); setViewChecks([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewing?.inspection_number}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-muted-foreground">Date</div><div>{viewing.inspection_date}</div></div>
                <div><div className="text-xs text-muted-foreground">Stage</div><div className="capitalize">{viewing.stage.replace("_", " ")}</div></div>
                <div><div className="text-xs text-muted-foreground">Item</div><div>{viewing.item_name ?? "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Batch</div><div>{viewing.batch_no ?? "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Reference</div><div>{viewing.reference_number ?? "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Inspector</div><div>{viewing.inspector_name ?? "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Inspected / Accepted / Rejected</div><div className="font-mono">{viewing.quantity_inspected} / {viewing.quantity_accepted} / {viewing.quantity_rejected}</div></div>
                <div><div className="text-xs text-muted-foreground">Result</div><div><Badge variant={viewing.result === "accepted" ? "default" : viewing.result === "rejected" ? "destructive" : "secondary"}>{viewing.result.replace(/_/g, " ")}</Badge></div></div>
              </div>
              {viewing.remarks && <div><div className="text-xs text-muted-foreground">Remarks</div><div>{viewing.remarks}</div></div>}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Checklist</div>
                <Table>
                  <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead>Expected</TableHead><TableHead>Actual</TableHead><TableHead className="w-20">Result</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {viewChecks.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No checklist items.</TableCell></TableRow>
                    ) : viewChecks.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell>{c.parameter}</TableCell>
                        <TableCell>{c.expected_value ?? "—"}</TableCell>
                        <TableCell>{c.actual_value ?? "—"}</TableCell>
                        <TableCell><Badge variant={c.passed ? "default" : "destructive"}>{c.passed ? "Pass" : "Fail"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}