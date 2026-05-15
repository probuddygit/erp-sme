import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Paperclip, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/maintenance/tickets")({
  component: TicketsPage,
});

type MType = "preventive" | "breakdown" | "corrective" | "inspection";
type Priority = "low" | "medium" | "high" | "critical";
type Status = "open" | "in_progress" | "completed" | "delayed";
type ChecklistItem = { label: string; done: boolean };
type SparePart = { name: string; quantity: number; unit_cost?: number };
type Attachment = { name: string; url: string };
type Ticket = {
  id: string;
  ticket_number: string;
  machine_id: string;
  maintenance_type: MType;
  scheduled_date: string;
  assigned_to: string | null;
  priority: Priority;
  status: Status;
  checklist: ChecklistItem[];
  spare_parts: SparePart[];
  attachments: Attachment[];
  labour_hours: number;
  downtime_hours: number;
  notes: string | null;
  completed_at: string | null;
};

const TYPES: MType[] = ["preventive", "breakdown", "corrective", "inspection"];
const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];
const STATUSES: Status[] = ["open", "in_progress", "completed", "delayed"];

const STATUS_LABEL: Record<Status, string> = {
  open: "Open", in_progress: "In progress", completed: "Completed", delayed: "Delayed",
};

function priorityVariant(p: Priority): "default" | "secondary" | "destructive" | "outline" {
  if (p === "critical") return "destructive";
  if (p === "high") return "default";
  if (p === "low") return "secondary";
  return "outline";
}
function statusVariant(s: Status): "default" | "secondary" | "destructive" | "outline" {
  if (s === "completed") return "secondary";
  if (s === "delayed") return "destructive";
  if (s === "in_progress") return "default";
  return "outline";
}

const EMPTY: {
  machine_id: string; maintenance_type: MType; scheduled_date: string;
  assigned_to: string; priority: Priority; status: Status;
  notes: string; labour_hours: string; downtime_hours: string;
  checklist: ChecklistItem[]; spare_parts: SparePart[]; attachments: Attachment[];
} = {
  machine_id: "", maintenance_type: "preventive", scheduled_date: new Date().toISOString().slice(0,10),
  assigned_to: "", priority: "medium", status: "open",
  notes: "", labour_hours: "0", downtime_hours: "0",
  checklist: [], spare_parts: [], attachments: [],
};

function TicketsPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("maintenance") || hasRole("production");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  const machinesQ = useQuery({
    enabled: !!company?.id,
    queryKey: ["machines-mini", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("machines").select("id,name,machine_code").eq("company_id", company!.id).order("name");
      if (error) throw error; return data as Array<{id:string;name:string;machine_code:string}>;
    },
  });

  const employeesQ = useQuery({
    enabled: !!company?.id,
    queryKey: ["employees-mini", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id,full_name,employee_code").eq("company_id", company!.id).order("full_name");
      if (error) throw error; return data as Array<{id:string;full_name:string;employee_code:string}>;
    },
  });

  const { data: ticketsRaw } = useQuery({
    enabled: !!company?.id,
    queryKey: ["tickets", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance_tickets").select("*").eq("company_id", company!.id).order("scheduled_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Ticket[];
    },
  });

  // Mark overdue as 'delayed' for display purposes (does not write DB)
  const today = new Date().toISOString().slice(0,10);
  const tickets = useMemo(() => (ticketsRaw ?? []).map((t) => {
    if (t.status !== "completed" && t.scheduled_date < today && t.status !== "delayed") {
      return { ...t, status: "delayed" as Status };
    }
    return t;
  }), [ticketsRaw, today]);

  const machineMap = useMemo(() => Object.fromEntries((machinesQ.data ?? []).map(m => [m.id, m])), [machinesQ.data]);
  const empMap = useMemo(() => Object.fromEntries((employeesQ.data ?? []).map(e => [e.id, e])), [employeesQ.data]);

  const reset = () => { setEditingId(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.machine_id) { toast.error("Choose a machine"); return; }
    const payload = {
      machine_id: form.machine_id,
      maintenance_type: form.maintenance_type,
      scheduled_date: form.scheduled_date,
      assigned_to: form.assigned_to || null,
      priority: form.priority,
      status: form.status,
      notes: form.notes.trim() || null,
      labour_hours: Number(form.labour_hours) || 0,
      downtime_hours: Number(form.downtime_hours) || 0,
      checklist: form.checklist,
      spare_parts: form.spare_parts,
      attachments: form.attachments,
    };
    const { error } = editingId
      ? await supabase.from("maintenance_tickets").update(payload).eq("id", editingId)
      : await supabase.from("maintenance_tickets").insert({ ...payload, company_id: company!.id });
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Ticket updated" : "Ticket created");
    setOpen(false); reset();
    qc.invalidateQueries({ queryKey: ["tickets"] });
    qc.invalidateQueries({ queryKey: ["maint-overview"] });
  };

  const startEdit = (t: Ticket) => {
    setEditingId(t.id);
    setForm({
      machine_id: t.machine_id,
      maintenance_type: t.maintenance_type,
      scheduled_date: t.scheduled_date,
      assigned_to: t.assigned_to ?? "",
      priority: t.priority,
      status: t.status === "delayed" && (t as Ticket).completed_at == null ? "open" : t.status,
      notes: t.notes ?? "",
      labour_hours: String(t.labour_hours ?? 0),
      downtime_hours: String(t.downtime_hours ?? 0),
      checklist: Array.isArray(t.checklist) ? t.checklist : [],
      spare_parts: Array.isArray(t.spare_parts) ? t.spare_parts : [],
      attachments: Array.isArray(t.attachments) ? t.attachments : [],
    });
    setOpen(true);
  };

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("maintenance_tickets").update({
      status, completed_at: status === "completed" ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["tickets"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this ticket?")) return;
    const { error } = await supabase.from("maintenance_tickets").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["tickets"] });
  };

  const techWorkload = useMemo(() => {
    const m = new Map<string, { name: string; open: number; in_progress: number; completed: number }>();
    for (const t of tickets) {
      if (!t.assigned_to) continue;
      const cur = m.get(t.assigned_to) ?? { name: empMap[t.assigned_to]?.full_name ?? "Unknown", open: 0, in_progress: 0, completed: 0 };
      if (t.status === "open" || t.status === "delayed") cur.open++;
      else if (t.status === "in_progress") cur.in_progress++;
      else if (t.status === "completed") cur.completed++;
      m.set(t.assigned_to, cur);
    }
    return Array.from(m.values()).sort((a, b) => (b.open + b.in_progress) - (a.open + a.in_progress));
  }, [tickets, empMap]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{tickets.length} tickets</div>
        {canEdit && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />New ticket</Button>
            </DialogTrigger>
            <TicketDialog
              editingId={editingId} form={form} setForm={setForm}
              machines={machinesQ.data ?? []} employees={employeesQ.data ?? []}
              onSave={save} onCancel={() => setOpen(false)}
            />
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="workload">Technician workload</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {(["open","in_progress","completed","delayed"] as Status[]).map((col) => (
              <Card key={col}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">{STATUS_LABEL[col]}</div>
                    <Badge variant={statusVariant(col)}>{tickets.filter(t => t.status === col).length}</Badge>
                  </div>
                  {tickets.filter(t => t.status === col).map((t) => (
                    <button key={t.id} onClick={() => canEdit && startEdit(t)}
                      className="w-full text-left rounded-md border border-border bg-card hover:bg-accent/30 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">{t.ticket_number}</span>
                        <Badge variant={priorityVariant(t.priority)} className="capitalize text-[10px]">{t.priority}</Badge>
                      </div>
                      <div className="font-medium text-sm leading-tight">{machineMap[t.machine_id]?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground capitalize">{t.maintenance_type} · {t.scheduled_date}</div>
                      {t.assigned_to && <div className="text-xs text-muted-foreground">👷 {empMap[t.assigned_to]?.full_name ?? "Tech"}</div>}
                      {canEdit && (
                        <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                          {col !== "in_progress" && col !== "completed" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(t.id, "in_progress")}>Start</Button>
                          )}
                          {col !== "completed" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(t.id, "completed")}>Complete</Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => remove(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </button>
                  ))}
                  {tickets.filter(t => t.status === col).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-6">Empty</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView tickets={tickets} machineMap={machineMap} onClick={(t) => canEdit && startEdit(t)} />
        </TabsContent>

        <TabsContent value="workload">
          <Card>
            <CardContent className="p-5">
              {techWorkload.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">No assignments yet.</div>
              ) : (
                <div className="space-y-3">
                  {techWorkload.map((w) => {
                    const total = w.open + w.in_progress + w.completed || 1;
                    return (
                      <div key={w.name}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="font-medium">{w.name}</span>
                          <span className="text-xs text-muted-foreground">{w.open} open · {w.in_progress} active · {w.completed} done</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                          <div className="bg-amber-500" style={{ width: `${(w.open/total)*100}%` }} />
                          <div className="bg-primary" style={{ width: `${(w.in_progress/total)*100}%` }} />
                          <div className="bg-emerald-500" style={{ width: `${(w.completed/total)*100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {tickets.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <div className="font-medium">No maintenance tickets yet</div>
            <div className="text-sm text-muted-foreground mt-1">Create one or set runtime thresholds on machines to auto-create tickets.</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CalendarView({ tickets, machineMap, onClick }: {
  tickets: Ticket[]; machineMap: Record<string,{name:string;machine_code:string}>;
  onClick: (t: Ticket) => void;
}) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const start = new Date(month); start.setDate(1);
  const startWeekday = start.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i=0;i<startWeekday;i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const byDate = useMemo(() => {
    const m = new Map<string, Ticket[]>();
    for (const t of tickets) {
      const arr = m.get(t.scheduled_date) ?? [];
      arr.push(t); m.set(t.scheduled_date, arr);
    }
    return m;
  }, [tickets]);

  const monthLabel = month.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">{monthLabel}</div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1))}>‹</Button>
            <Button size="sm" variant="outline" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</Button>
            <Button size="sm" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1))}>›</Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-center text-muted-foreground py-1">{d}</div>
          ))}
          {cells.map((d, i) => {
            const key = d ? d.toISOString().slice(0,10) : `e${i}`;
            const items = d ? (byDate.get(key) ?? []) : [];
            return (
              <div key={key} className={`min-h-20 rounded-md border border-border p-1 ${d ? "bg-card" : "bg-transparent border-transparent"}`}>
                {d && <div className="text-[10px] text-muted-foreground mb-1">{d.getDate()}</div>}
                <div className="space-y-1">
                  {items.slice(0,3).map(t => (
                    <button key={t.id} onClick={() => onClick(t)}
                      className={`block w-full text-left text-[10px] rounded px-1.5 py-0.5 truncate
                        ${t.priority === "critical" ? "bg-destructive/15 text-destructive" :
                          t.priority === "high" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                          "bg-muted"}`}>
                      {machineMap[t.machine_id]?.name ?? t.ticket_number}
                    </button>
                  ))}
                  {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length-3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TicketDialog({ editingId, form, setForm, machines, employees, onSave, onCancel }: {
  editingId: string | null;
  form: typeof EMPTY;
  setForm: (f: typeof EMPTY) => void;
  machines: Array<{id:string;name:string;machine_code:string}>;
  employees: Array<{id:string;full_name:string;employee_code:string}>;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [newCheck, setNewCheck] = useState("");
  const [newSpare, setNewSpare] = useState({ name: "", quantity: "1", unit_cost: "" });
  const [newAtt, setNewAtt] = useState({ name: "", url: "" });

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editingId ? "Edit ticket" : "New maintenance ticket"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Machine *</Label>
            <Select value={form.machine_id} onValueChange={(v) => setForm({ ...form, machine_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choose machine" /></SelectTrigger>
              <SelectContent>{machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.machine_code})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.maintenance_type} onValueChange={(v) => setForm({ ...form, maintenance_type: v as MType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Scheduled date</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assigned technician</Label>
            <Select value={form.assigned_to || "none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Labour hours</Label><Input type="number" step="0.25" value={form.labour_hours} onChange={(e) => setForm({ ...form, labour_hours: e.target.value })} /></div>
          <div><Label>Downtime hours</Label><Input type="number" step="0.25" value={form.downtime_hours} onChange={(e) => setForm({ ...form, downtime_hours: e.target.value })} /></div>
        </div>

        <div>
          <Label>Checklist</Label>
          <div className="space-y-1.5 mt-1.5">
            {form.checklist.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox checked={c.done} onCheckedChange={(v) => {
                  const next = [...form.checklist]; next[i] = { ...c, done: !!v }; setForm({ ...form, checklist: next });
                }} />
                <span className={`text-sm flex-1 ${c.done ? "line-through text-muted-foreground" : ""}`}>{c.label}</span>
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, checklist: form.checklist.filter((_,j) => j!==i) })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Add checklist item…" value={newCheck} onChange={(e) => setNewCheck(e.target.value)} />
              <Button type="button" variant="outline" onClick={() => {
                if (!newCheck.trim()) return;
                setForm({ ...form, checklist: [...form.checklist, { label: newCheck.trim(), done: false }] });
                setNewCheck("");
              }}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </div>

        <div>
          <Label>Spare parts used</Label>
          <div className="space-y-1.5 mt-1.5">
            {form.spare_parts.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{s.name}</span>
                <span className="text-muted-foreground">qty {s.quantity}{s.unit_cost ? ` · ₹${s.unit_cost}` : ""}</span>
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, spare_parts: form.spare_parts.filter((_,j) => j!==i) })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_80px_100px_auto] gap-2">
              <Input placeholder="Part name" value={newSpare.name} onChange={(e) => setNewSpare({ ...newSpare, name: e.target.value })} />
              <Input type="number" placeholder="Qty" value={newSpare.quantity} onChange={(e) => setNewSpare({ ...newSpare, quantity: e.target.value })} />
              <Input type="number" placeholder="Unit cost" value={newSpare.unit_cost} onChange={(e) => setNewSpare({ ...newSpare, unit_cost: e.target.value })} />
              <Button type="button" variant="outline" onClick={() => {
                if (!newSpare.name.trim()) return;
                setForm({ ...form, spare_parts: [...form.spare_parts, {
                  name: newSpare.name.trim(),
                  quantity: Number(newSpare.quantity) || 1,
                  unit_cost: newSpare.unit_cost ? Number(newSpare.unit_cost) : undefined,
                }] });
                setNewSpare({ name: "", quantity: "1", unit_cost: "" });
              }}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </div>

        <div>
          <Label>Attachments (URL)</Label>
          <div className="space-y-1.5 mt-1.5">
            {form.attachments.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <a href={a.url} target="_blank" rel="noreferrer" className="flex-1 hover:underline truncate">{a.name || a.url}</a>
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, attachments: form.attachments.filter((_,j) => j!==i) })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_2fr_auto] gap-2">
              <Input placeholder="Label" value={newAtt.name} onChange={(e) => setNewAtt({ ...newAtt, name: e.target.value })} />
              <Input placeholder="https://…" value={newAtt.url} onChange={(e) => setNewAtt({ ...newAtt, url: e.target.value })} />
              <Button type="button" variant="outline" onClick={() => {
                if (!newAtt.url.trim()) return;
                setForm({ ...form, attachments: [...form.attachments, { name: newAtt.name.trim(), url: newAtt.url.trim() }] });
                setNewAtt({ name: "", url: "" });
              }}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </div>

        <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave}>{editingId ? "Save" : "Create"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}