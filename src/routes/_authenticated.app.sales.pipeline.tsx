import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { LEAD_STAGES, inr } from "@/lib/sales-utils";
import type { Database } from "@/integrations/supabase/types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type LeadSource = Database["public"]["Enums"]["lead_source"];

interface Lead {
  id: string;
  title: string;
  contact_name: string | null;
  company_name: string | null;
  email: string | null;
  source: LeadSource;
  status: LeadStatus;
  expected_value: number;
  win_probability: number;
  expected_close_date: string | null;
}

export const Route = createFileRoute("/_authenticated/app/sales/pipeline")({
  component: PipelinePage,
});

function PipelinePage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const canEdit = isCompanyAdmin || hasRole("sales");

  const { data: leads } = useQuery({
    enabled: !!company?.id,
    queryKey: ["leads", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const onDrop = async (leadId: string, status: LeadStatus) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["leads", company?.id] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New lead</Button>
            </DialogTrigger>
            <LeadDialog
              onClose={() => setOpen(false)}
              onSaved={() => {
                setOpen(false);
                qc.invalidateQueries({ queryKey: ["leads", company?.id] });
              }}
            />
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 overflow-x-auto pb-4">
        {LEAD_STAGES.map((stage) => {
          const items = (leads ?? []).filter((l) => l.status === stage.key);
          const total = items.reduce((s, l) => s + Number(l.expected_value), 0);
          return (
            <div
              key={stage.key}
              className="rounded-md bg-muted/40 border border-border min-h-[300px] flex flex-col"
              onDragOver={(e) => canEdit && e.preventDefault()}
              onDrop={(e) => {
                if (!canEdit) return;
                const id = e.dataTransfer.getData("text/plain");
                if (id) onDrop(id, stage.key);
              }}
            >
              <div className="px-3 py-2 border-b border-border">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{stage.label}</div>
                <div className="text-sm font-semibold mt-0.5">
                  {items.length} · <span className="text-muted-foreground font-normal">{inr(total)}</span>
                </div>
              </div>
              <div className="p-2 space-y-2 flex-1">
                {items.map((l) => (
                  <div
                    key={l.id}
                    draggable={canEdit}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)}
                    className="rounded-md bg-card border border-border p-3 shadow-sm hover:border-accent transition-colors cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{l.title}</div>
                        {l.company_name && (
                          <div className="text-xs text-muted-foreground truncate">{l.company_name}</div>
                        )}
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="font-semibold">{inr(l.expected_value)}</span>
                          <span className="text-muted-foreground">{l.win_probability}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6">Drop leads here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { company, user } = useAuth();
  const [form, setForm] = useState({
    title: "",
    contact_name: "",
    company_name: "",
    email: "",
    phone: "",
    source: "website" as LeadSource,
    expected_value: 0,
    win_probability: 25,
    expected_close_date: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (!company?.id) return;
    setSaving(true);
    const { error } = await supabase.from("leads").insert({
      company_id: company.id,
      created_by: user?.id,
      owner_id: user?.id,
      title: form.title.trim(),
      contact_name: form.contact_name || null,
      company_name: form.company_name || null,
      email: form.email || null,
      phone: form.phone || null,
      source: form.source,
      expected_value: form.expected_value,
      win_probability: form.win_probability,
      expected_close_date: form.expected_close_date || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Lead created");
    onSaved();
  };

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title *" className="sm:col-span-2"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. CNC machine for ACME" /></Field>
        <Field label="Contact name"><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></Field>
        <Field label="Company"><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Source">
          <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as LeadSource })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["website", "referral", "cold_call", "email", "event", "other"] as LeadSource[]).map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Expected close"><Input type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} /></Field>
        <Field label="Expected value (₹)"><Input type="number" min={0} value={form.expected_value} onChange={(e) => setForm({ ...form, expected_value: Number(e.target.value) })} /></Field>
        <Field label="Win probability (%)"><Input type="number" min={0} max={100} value={form.win_probability} onChange={(e) => setForm({ ...form, win_probability: Number(e.target.value) })} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
