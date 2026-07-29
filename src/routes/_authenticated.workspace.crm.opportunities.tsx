import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { RowActions } from "@/components/RowActions";
import {
  useOpportunities, useSaveOpportunity, useStageConfigs, useAccounts,
  formatINR, formatDate, type OpportunityRow,
} from "@/features/crm/api";

export const Route = createFileRoute("/_authenticated/workspace/crm/opportunities")({
  component: OpportunitiesPage,
});

const empty: Partial<OpportunityRow> = { name: "", stage: "prospecting", value: 0, probability: 20 };

function OpportunitiesPage() {
  const { data: opps = [], isLoading } = useOpportunities();
  const { data: stages = [] } = useStageConfigs("opportunity");
  const { data: accounts = [] } = useAccounts();
  const save = useSaveOpportunity();

  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [editing, setEditing] = useState<Partial<OpportunityRow> | null>(null);

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "—";
  const stageMeta = (key: string) => stages.find((s) => s.stage_key === key);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return opps.filter((o) => {
      if (stage && o.stage !== stage) return false;
      if (!term) return true;
      return [o.name, accountName(o.account_id)].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [opps, search, stage, accounts]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search opportunities…"
            filters={[
              { key: "stage", label: "Stage", value: stage, onChange: setStage, options: stages.map((s) => ({ value: s.stage_key, label: s.label })) },
            ]}
            actions={<Button size="sm" onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-1.5" /> New opportunity</Button>}
          />
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Probability</TableHead>
                  <TableHead>Close date</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No opportunities. Convert a lead or create one.</TableCell></TableRow>
                ) : filtered.map((o) => {
                  const meta = stageMeta(o.stage);
                  return (
                    <TableRow key={o.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell>
                        {o.account_id
                          ? <Link to="/workspace/crm/accounts/$accountId" params={{ accountId: o.account_id }} className="hover:text-primary">{accountName(o.account_id)}</Link>
                          : "—"}
                      </TableCell>
                      <TableCell><StatusBadge label={meta?.label ?? o.stage} tone={meta?.tone ?? undefined} /></TableCell>
                      <TableCell className="text-right font-medium">{formatINR(Number(o.value ?? 0))}</TableCell>
                      <TableCell className="text-right text-sm">{o.probability}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(o.expected_close)}</TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          onEdit={() => setEditing(o)}
                          table="crm_opportunities"
                          id={o.id}
                          invalidateKeys={[["crm", "opportunities_v2"]]}
                          label="opportunity"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <FormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing.id ? "Edit opportunity" : "New opportunity"}
          submitting={save.isPending}
          onSubmit={async () => { await save.mutateAsync(editing); }}
        >
          <Field label="Name *"><Input required value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account">
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={editing.account_id ?? ""} onChange={(e) => setEditing({ ...editing, account_id: e.target.value || null })}>
                <option value="">— None —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Stage">
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={editing.stage ?? "prospecting"} onChange={(e) => setEditing({ ...editing, stage: e.target.value })}>
                {stages.map((s) => <option key={s.stage_key} value={s.stage_key}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Value (₹)"><Input type="number" value={editing.value ?? 0} onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })} /></Field>
            <Field label="Probability (%)"><Input type="number" min={0} max={100} value={editing.probability ?? 0} onChange={(e) => setEditing({ ...editing, probability: Number(e.target.value) })} /></Field>
            <Field label="Expected close"><Input type="date" value={editing.expected_close ?? ""} onChange={(e) => setEditing({ ...editing, expected_close: e.target.value || null })} /></Field>
            {editing.stage === "lost" && <Field label="Lost reason"><Input value={editing.lost_reason ?? ""} onChange={(e) => setEditing({ ...editing, lost_reason: e.target.value })} /></Field>}
          </div>
          <Field label="Notes"><Textarea rows={3} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
        </FormDialog>
      )}
    </div>
  );
}