import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Plus, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/quality/ncr")({
  component: NcrPage,
});

type Severity = "minor" | "major" | "critical";
type Status = "open" | "investigating" | "resolved" | "closed";

type Ncr = {
  id: string; ncr_number: string; raised_date: string;
  source_stage: string | null; reference_number: string | null;
  item_name: string | null; batch_no: string | null; quantity: number;
  severity: Severity; status: Status;
  defect_description: string; root_cause: string | null;
  corrective_action: string | null; preventive_action: string | null;
  assigned_to_name: string | null;
};

function NcrPage() {
  const { company, isCompanyAdmin, hasRole } = useAuth();
  const canManage = isCompanyAdmin || hasRole("quality") || hasRole("production");
  const [list, setList] = useState<Ncr[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ncr | null>(null);
  const [form, setForm] = useState({
    raised_date: new Date().toISOString().slice(0, 10),
    source_stage: "incoming", item_name: "", batch_no: "",
    quantity: 0, severity: "minor" as Severity, status: "open" as Status,
    defect_description: "", root_cause: "", corrective_action: "",
    preventive_action: "", assigned_to_name: "",
  });

  const load = async () => {
    if (!company?.id) return;
    let q = supabase.from("ncr_records").select("*").eq("company_id", company.id).order("raised_date", { ascending: false });
    if (filterStatus !== "all") q = q.eq("status", filterStatus as Status);
    const { data } = await q;
    setList((data ?? []) as Ncr[]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [company?.id, filterStatus]);

  const counts = {
    open: list.filter((n) => n.status === "open").length,
    investigating: list.filter((n) => n.status === "investigating").length,
    resolved: list.filter((n) => n.status === "resolved").length,
    closed: list.filter((n) => n.status === "closed").length,
  };

  const submit = async () => {
    if (!company?.id) return;
    if (!form.defect_description.trim()) { toast.error("Defect description required"); return; }
    if (editing) {
      const { error } = await supabase.from("ncr_records").update({
        raised_date: form.raised_date,
        source_stage: form.source_stage as Severity, // typed loosely
        item_name: form.item_name || null,
        batch_no: form.batch_no || null,
        quantity: Number(form.quantity),
        severity: form.severity, status: form.status,
        defect_description: form.defect_description,
        root_cause: form.root_cause || null,
        corrective_action: form.corrective_action || null,
        preventive_action: form.preventive_action || null,
        assigned_to_name: form.assigned_to_name || null,
        resolved_at: form.status === "resolved" || form.status === "closed" ? new Date().toISOString() : null,
      }).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("NCR updated");
    } else {
      const { error } = await supabase.from("ncr_records").insert({
        company_id: company.id,
        ncr_number: `NCR-${Date.now().toString().slice(-6)}`,
        raised_date: form.raised_date,
        source_stage: form.source_stage as "incoming",
        item_name: form.item_name || null,
        batch_no: form.batch_no || null,
        quantity: Number(form.quantity),
        severity: form.severity, status: form.status,
        defect_description: form.defect_description,
        root_cause: form.root_cause || null,
        corrective_action: form.corrective_action || null,
        preventive_action: form.preventive_action || null,
        assigned_to_name: form.assigned_to_name || null,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("NCR raised");
    }
    setOpen(false); setEditing(null);
    setForm({ ...form, defect_description: "", root_cause: "", corrective_action: "", preventive_action: "", item_name: "", batch_no: "", quantity: 0 });
    load();
  };

  const openEdit = (n: Ncr) => {
    setEditing(n);
    setForm({
      raised_date: n.raised_date,
      source_stage: n.source_stage ?? "incoming",
      item_name: n.item_name ?? "",
      batch_no: n.batch_no ?? "",
      quantity: Number(n.quantity),
      severity: n.severity, status: n.status,
      defect_description: n.defect_description,
      root_cause: n.root_cause ?? "",
      corrective_action: n.corrective_action ?? "",
      preventive_action: n.preventive_action ?? "",
      assigned_to_name: n.assigned_to_name ?? "",
    });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete NCR?")) return;
    const { error } = await supabase.from("ncr_records").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Open" value={counts.open} tone="destructive" />
        <Stat label="Investigating" value={counts.investigating} tone="secondary" />
        <Stat label="Resolved" value={counts.resolved} tone="default" />
        <Stat label="Closed" value={counts.closed} tone="outline" />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Non-Conformance Reports</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            {canManage && (
              <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
                <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" /> Raise NCR</Button></DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editing ? `Edit ${editing.ncr_number}` : "Raise NCR"}</DialogTitle></DialogHeader>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.raised_date} onChange={(e) => setForm({ ...form, raised_date: e.target.value })} /></div>
                    <div className="space-y-1.5">
                      <Label>Stage</Label>
                      <Select value={form.source_stage} onValueChange={(v) => setForm({ ...form, source_stage: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="incoming">Incoming</SelectItem>
                          <SelectItem value="in_process">In-process</SelectItem>
                          <SelectItem value="finished">Finished</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>Item</Label><Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Batch / Lot</Label><Input value={form.batch_no} onChange={(e) => setForm({ ...form, batch_no: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
                    <div className="space-y-1.5">
                      <Label>Severity</Label>
                      <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as Severity })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minor">Minor</SelectItem>
                          <SelectItem value="major">Major</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="investigating">Investigating</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>Assigned to</Label><Input value={form.assigned_to_name} onChange={(e) => setForm({ ...form, assigned_to_name: e.target.value })} /></div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5"><Label>Defect description</Label><Textarea value={form.defect_description} onChange={(e) => setForm({ ...form, defect_description: e.target.value })} rows={2} /></div>
                    <div className="space-y-1.5"><Label>Root cause</Label><Textarea value={form.root_cause} onChange={(e) => setForm({ ...form, root_cause: e.target.value })} rows={2} /></div>
                    <div className="space-y-1.5"><Label>Corrective action</Label><Textarea value={form.corrective_action} onChange={(e) => setForm({ ...form, corrective_action: e.target.value })} rows={2} /></div>
                    <div className="space-y-1.5"><Label>Preventive action</Label><Textarea value={form.preventive_action} onChange={(e) => setForm({ ...form, preventive_action: e.target.value })} rows={2} /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
                    <Button onClick={submit}>{editing ? "Update" : "Raise NCR"}</Button>
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
                <TableHead>Defect</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="w-20"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow><TableCell colSpan={canManage ? 9 : 8} className="text-center text-muted-foreground py-8">No NCRs.</TableCell></TableRow>
              ) : list.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-mono text-xs">{n.ncr_number}</TableCell>
                  <TableCell>{n.raised_date}</TableCell>
                  <TableCell><Badge variant="outline">{(n.source_stage ?? "—").replace("_", " ")}</Badge></TableCell>
                  <TableCell>{n.item_name ?? "—"}</TableCell>
                  <TableCell>{n.batch_no ?? "—"}</TableCell>
                  <TableCell className="max-w-[260px] truncate" title={n.defect_description}>{n.defect_description}</TableCell>
                  <TableCell><Badge variant={n.severity === "critical" ? "destructive" : n.severity === "major" ? "secondary" : "outline"}>{n.severity}</Badge></TableCell>
                  <TableCell><Badge variant={n.status === "open" ? "destructive" : n.status === "closed" ? "outline" : "default"}>{n.status}</Badge></TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(n)}>Edit</Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(n.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "default" | "destructive" | "secondary" | "outline" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <Badge variant={tone}>{label}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}