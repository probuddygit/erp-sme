import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";
import { FilterBar } from "@/features/crm/components/FilterBar";
import { StatusBadge } from "@/features/crm/components/StatusBadge";
import { useLeads, formatINR, formatDate } from "@/features/crm/api";

export const Route = createFileRoute("/_authenticated/workspace/crm/opportunities")({
  component: OpportunitiesPage,
});

// Opportunities in this build are qualified leads (status: qualified | proposal | won | lost).
const OPP_STATUSES = [
  { key: "qualified", label: "Qualified", tone: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "proposal", label: "Proposal", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  { key: "won", label: "Won", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "lost", label: "Lost", tone: "bg-rose-50 text-rose-700 border-rose-200" },
];

function OpportunitiesPage() {
  const { data: leads = [], isLoading } = useLeads();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");

  const opps = useMemo(
    () => leads.filter((l) => ["qualified", "proposal", "won", "lost"].includes(l.status)),
    [leads],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return opps.filter((o) => {
      if (stage && o.status !== stage) return false;
      if (!term) return true;
      return [o.title, o.company_name, o.contact_name].filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [opps, search, stage]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search opportunities…"
            filters={[
              { key: "stage", label: "Stage", value: stage, onChange: setStage, options: OPP_STATUSES.map((s) => ({ value: s.key, label: s.label })) },
            ]}
            actions={
              <Button size="sm" asChild>
                <Link to="/workspace/crm/leads"><Plus className="h-4 w-4 mr-1.5" /> New opportunity</Link>
              </Button>
            }
          />

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Probability</TableHead>
                  <TableHead>Close date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No opportunities. Qualify a lead to see it here.</TableCell></TableRow>
                ) : filtered.map((o) => {
                  const tone = OPP_STATUSES.find((s) => s.key === o.status)?.tone;
                  return (
                    <TableRow key={o.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{o.title}</TableCell>
                      <TableCell>{o.company_name ?? "—"}</TableCell>
                      <TableCell><StatusBadge label={OPP_STATUSES.find((s) => s.key === o.status)?.label ?? o.status} tone={tone} /></TableCell>
                      <TableCell className="text-right font-medium">{formatINR(Number(o.expected_value ?? 0))}</TableCell>
                      <TableCell className="text-right text-sm">{o.win_probability}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(o.expected_close_date)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}