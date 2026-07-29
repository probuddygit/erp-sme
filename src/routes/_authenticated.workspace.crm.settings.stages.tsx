import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { useStageConfigs, useSaveStageConfig, useDeleteStageConfig, type StageConfigRow } from "@/features/crm/api";

export const Route = createFileRoute("/_authenticated/workspace/crm/settings/stages")({
  component: StageSettingsPage,
});

function StageSettingsPage() {
  return (
    <Tabs defaultValue="lead">
      <TabsList><TabsTrigger value="lead">Lead statuses</TabsTrigger><TabsTrigger value="opportunity">Opportunity stages</TabsTrigger></TabsList>
      <TabsContent value="lead" className="mt-4"><StageEditor kind="lead" /></TabsContent>
      <TabsContent value="opportunity" className="mt-4"><StageEditor kind="opportunity" /></TabsContent>
    </Tabs>
  );
}

function StageEditor({ kind }: { kind: "lead" | "opportunity" }) {
  const { data: rows = [] } = useStageConfigs(kind);
  const save = useSaveStageConfig();
  const del = useDeleteStageConfig();
  const [editing, setEditing] = useState<Partial<StageConfigRow> | null>(null);

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{rows.length} stages · drag by editing sort order</div>
        <Button size="sm" onClick={() => setEditing({ kind, sort_order: (rows[rows.length - 1]?.sort_order ?? 0) + 1, aging_threshold_days: 14 })}>
          <Plus className="h-4 w-4 mr-1.5" /> Add stage
        </Button>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="w-6 text-xs text-muted-foreground">{r.sort_order}</span>
            <StatusBadge label={r.label} tone={r.tone ?? undefined} />
            <span className="text-xs text-muted-foreground">key: {r.stage_key}</span>
            {r.aging_threshold_days > 0 && <span className="text-xs text-muted-foreground">· age {r.aging_threshold_days}d</span>}
            {r.is_terminal && <span className="text-xs text-rose-700">· terminal</span>}
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-700"
                onClick={() => { if (confirm(`Delete "${r.label}"?`)) del.mutate(r.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <FormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing.id ? "Edit stage" : "Add stage"}
          submitting={save.isPending}
          onSubmit={async () => { await save.mutateAsync(editing as Partial<StageConfigRow> & { kind: "lead" | "opportunity" }); }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label *"><Input required value={editing.label ?? ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></Field>
            <Field label="Stage key *"><Input required value={editing.stage_key ?? ""} onChange={(e) => setEditing({ ...editing, stage_key: e.target.value.toLowerCase().replace(/\s+/g, "_") })} /></Field>
            <Field label="Sort order"><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
            <Field label="Aging threshold (days)"><Input type="number" value={editing.aging_threshold_days ?? 14} onChange={(e) => setEditing({ ...editing, aging_threshold_days: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Tone (Tailwind classes)">
            <Input value={editing.tone ?? ""} onChange={(e) => setEditing({ ...editing, tone: e.target.value })} placeholder="bg-blue-50 text-blue-700 border-blue-200" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editing.is_terminal ?? false} onChange={(e) => setEditing({ ...editing, is_terminal: e.target.checked })} />
            Terminal (won / lost / disqualified)
          </label>
        </FormDialog>
      )}
    </CardContent></Card>
  );
}