import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Plus, Loader2, Sparkles, Mail, Phone, MessageCircle, ArrowRightLeft, Search, Trash2, Pencil } from "lucide-react";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { ScoreBadge } from "@/features/crm/components/ScoreBadge";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import {
  useLeads, useSaveLead, useConvertLeadToAccount, useStageConfigs,
  formatINR, formatDate, formatDateTime,
  scoreLead, suggestNextAction,
  type LeadRow,
} from "@/features/crm/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/crm/leads")({
  component: LeadInboxPage,
});

const SOURCES = ["website", "referral", "trade_show", "cold_call", "linkedin", "partner", "email", "other"];
const CHANNELS = [
  { key: "email", label: "Email", Icon: Mail },
  { key: "phone", label: "Phone", Icon: Phone },
  { key: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
];

const emptyLead: Partial<LeadRow> = {
  title: "", contact_name: "", email: "", phone: "", company_name: "",
  source: "website", status: "new", expected_value: 0, win_probability: 20,
};

function LeadInboxPage() {
  const { data: leads = [], isLoading } = useLeads();
  const { data: stages = [] } = useStageConfigs("lead");
  const save = useSaveLead();
  const convert = useConvertLeadToAccount();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [territory, setTerritory] = useState("");
  const [editing, setEditing] = useState<Partial<LeadRow> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const territories = useMemo(
    () => Array.from(new Set(leads.map((l) => (l as LeadRow & { territory?: string | null }).territory).filter(Boolean))) as string[],
    [leads],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (status && l.status !== status) return false;
      if (source && l.source !== source) return false;
      if (territory && (l as LeadRow & { territory?: string | null }).territory !== territory) return false;
      if (!term) return true;
      return [l.title, l.contact_name, l.company_name, l.email, l.phone].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [leads, search, status, source, territory]);

  const selected = filtered.find((l) => l.id === selectedId) ?? null;

  const stageTone = (key: string) => stages.find((s) => s.stage_key === key)?.tone ?? "bg-muted text-foreground border-border";
  const stageLabel = (key: string) => stages.find((s) => s.stage_key === key)?.label ?? key;

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      {/* Left rail: filters */}
      <aside className="space-y-3">
        <Card><CardContent className="p-3 space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filters</div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-sm" />
          </div>
          <FacetGroup label="Status" value={status} onChange={setStatus} options={stages.map((s) => ({ value: s.stage_key, label: s.label }))} />
          <FacetGroup label="Source" value={source} onChange={setSource} options={SOURCES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))} />
          {territories.length > 0 && <FacetGroup label="Territory" value={territory} onChange={setTerritory} options={territories.map((t) => ({ value: t, label: t }))} />}
        </CardContent></Card>
      </aside>

      {/* Center: card list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{filtered.length} leads</div>
          <Button size="sm" onClick={() => setEditing({ ...emptyLead })}><Plus className="h-4 w-4 mr-1.5" /> New lead</Button>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No leads match these filters.</CardContent></Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((l) => {
              const score = scoreLead(l);
              const channelKey = (l as LeadRow & { channel?: string | null }).channel ?? (l.email ? "email" : l.phone ? "phone" : null);
              const CIcon = CHANNELS.find((c) => c.key === channelKey)?.Icon;
              const lastActivity = (l as LeadRow & { last_activity_at?: string | null }).last_activity_at ?? l.updated_at;
              return (
                <button
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={cn(
                    "text-left rounded-lg border bg-card p-3 transition-colors hover:border-primary/40 shadow-sm",
                    selectedId === l.id ? "border-primary ring-1 ring-primary/30" : "border-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{l.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{l.company_name ?? l.contact_name ?? "—"}</div>
                    </div>
                    <ScoreBadge result={score} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <StatusBadge label={stageLabel(l.status)} tone={stageTone(l.status)} />
                    <span className="font-medium">{formatINR(Number(l.expected_value ?? 0))}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">{CIcon && <CIcon className="h-3 w-3" />}<span className="capitalize">{l.source.replace(/_/g, " ")}</span></span>
                    <span>Last: {formatDateTime(lastActivity)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Right slide-over: detail */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <SheetTitle className="text-lg">{selected.title}</SheetTitle>
                    <SheetDescription>{selected.company_name ?? "—"}</SheetDescription>
                  </div>
                  <ScoreBadge result={scoreLead(selected)} />
                </div>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" /> AI · Next best action
                  </div>
                  <div className="mt-1 text-sm">{suggestNextAction(selected)}</div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <Meta label="Contact" value={selected.contact_name ?? "—"} />
                  <Meta label="Email" value={selected.email ?? "—"} />
                  <Meta label="Phone" value={selected.phone ?? "—"} />
                  <Meta label="Source" value={<span className="capitalize">{selected.source.replace(/_/g, " ")}</span>} />
                  <Meta label="Value" value={formatINR(Number(selected.expected_value ?? 0))} />
                  <Meta label="Probability" value={`${selected.win_probability}%`} />
                  <Meta label="Expected close" value={formatDate(selected.expected_close_date)} />
                  <Meta label="Status" value={<StatusBadge label={stageLabel(selected.status)} tone={stageTone(selected.status)} />} />
                </dl>

                {selected.notes && (
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                    <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Notes</div>
                    <div className="whitespace-pre-wrap text-sm">{selected.notes}</div>
                  </div>
                )}

                <div className="rounded-md border border-border bg-card p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Score factors</div>
                  <ul className="space-y-1 text-xs">
                    {scoreLead(selected).factors.map((f, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{f.label}</span>
                        <span className={cn("font-medium", f.delta >= 0 ? "text-emerald-700" : "text-rose-700")}>{f.delta > 0 ? "+" : ""}{f.delta}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={convert.isPending || selected.status === "converted" || selected.status === "disqualified"}
                    onClick={async () => {
                      const res = await convert.mutateAsync(selected.id);
                      setSelectedId(null);
                      navigate({ to: "/workspace/crm/accounts/$accountId", params: { accountId: res.account_id } });
                    }}
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Convert to Account
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(selected)}>
                    <Pencil className="h-4 w-4 mr-1.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-rose-700 hover:text-rose-700"
                    onClick={async () => {
                      if (!confirm("Delete this lead?")) return;
                      const { error } = await supabase.from("leads").delete().eq("id", selected.id);
                      if (error) toast.error(error.message); else {
                        qc.invalidateQueries({ queryKey: ["crm", "leads"] });
                        toast.success("Deleted");
                        setSelectedId(null);
                      }
                    }}>
                    <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {editing && (
        <FormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing.id ? "Edit lead" : "New lead"}
          submitting={save.isPending}
          onSubmit={async () => { await save.mutateAsync(editing); }}
        >
          <Field label="Title *"><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact name"><Input value={editing.contact_name ?? ""} onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })} /></Field>
            <Field label="Company"><Input value={editing.company_name ?? ""} onChange={(e) => setEditing({ ...editing, company_name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Field label="Source">
              <Select value={editing.source ?? "other"} onValueChange={(v) => setEditing({ ...editing, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={editing.status ?? "new"} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{stages.map((s) => <SelectItem key={s.stage_key} value={s.stage_key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Expected value (₹)"><Input type="number" value={editing.expected_value ?? 0} onChange={(e) => setEditing({ ...editing, expected_value: Number(e.target.value) })} /></Field>
            <Field label="Win probability (%)"><Input type="number" min={0} max={100} value={editing.win_probability ?? 0} onChange={(e) => setEditing({ ...editing, win_probability: Number(e.target.value) })} /></Field>
            <Field label="Expected close"><Input type="date" value={editing.expected_close_date ?? ""} onChange={(e) => setEditing({ ...editing, expected_close_date: e.target.value || null })} /></Field>
            <Field label="Product interest"><Input value={(editing as LeadRow & { product_interest?: string | null }).product_interest ?? ""} onChange={(e) => setEditing({ ...editing, product_interest: e.target.value } as Partial<LeadRow>)} /></Field>
            <Field label="Territory"><Input value={(editing as LeadRow & { territory?: string | null }).territory ?? ""} onChange={(e) => setEditing({ ...editing, territory: e.target.value } as Partial<LeadRow>)} /></Field>
          </div>
          <Field label="Notes"><Textarea rows={3} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
        </FormDialog>
      )}
    </div>
  );
}

function FacetGroup({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => onChange("")}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px]",
            value === "" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
          )}
        >All</button>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(value === o.value ? "" : o.value)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] capitalize",
              value === o.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
            )}
          >{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}