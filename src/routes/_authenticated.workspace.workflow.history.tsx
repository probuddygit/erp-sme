import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Loader2, Play, Search, RefreshCw, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWorkflowRuns } from "@/features/workflow/workflow-api";
import { exportRowsToCsv } from "@/features/admin/admin-api";

export const Route = createFileRoute("/_authenticated/workspace/workflow/history")({
  component: Page,
});

const STATUS: Record<string, { icon: any; tone: string }> = {
  approved: { icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-500/10" },
  pending:  { icon: Loader2,      tone: "text-blue-600 bg-blue-500/10" },
  rejected: { icon: XCircle,      tone: "text-rose-600 bg-rose-500/10" },
  cancelled:{ icon: Play,         tone: "text-amber-600 bg-amber-500/10" },
};

const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function Page() {
  const { rows, isLoading, decide, refetch } = useWorkflowRuns();
  const [q, setQ] = useState("");

  const filtered = rows.filter((r) =>
    [r.rule_name, r.entity_type, r.status].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Workflow history</div>
          <div className="text-xs text-muted-foreground">Immutable log of every workflow execution and approval decision.</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search runs…" className="h-9 pl-9 text-sm" />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh</Button>
          <Button variant="outline" size="sm" onClick={() => exportRowsToCsv("workflow-history", filtered, [
            { key: "rule_name", header: "Workflow" }, { key: "entity_type", header: "Document" },
            { key: "status", header: "Status" }, { key: "created_at", header: "Started" },
          ])}><Download className="mr-1 h-3.5 w-3.5" />Export</Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Run</th>
              <th className="px-4 py-3 text-left">Workflow</th>
              <th className="px-4 py-3 text-left">Document</th>
              <th className="px-4 py-3 text-left">Started</th>
              <th className="px-4 py-3 text-left">Step</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">Loading…</td></tr>}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">No workflow runs yet</td></tr>
            )}
            {filtered.map((r) => {
              const s = STATUS[r.status] ?? STATUS.pending;
              const Icon = s.icon;
              return (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{r.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-medium">{r.rule_name ?? "Ad-hoc approval"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{label(r.entity_type)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.current_step}/{r.total_steps}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${s.tone}`}>
                      <Icon className={`h-3.5 w-3.5 ${r.status === "pending" ? "animate-spin" : ""}`} />
                      {label(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => decide.mutate({ id: r.id, status: "approved" })}>Approve</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                          onClick={() => decide.mutate({ id: r.id, status: "rejected" })}>Reject</Button>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
