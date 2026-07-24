import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Loader2, Play, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { WORKFLOW_HISTORY } from "@/features/workflow/data";

export const Route = createFileRoute("/_authenticated/workspace/workflow/history")({
  component: Page,
});

const STATUS = {
  Completed: { icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-500/10" },
  Running:   { icon: Loader2,      tone: "text-blue-600 bg-blue-500/10" },
  Failed:    { icon: XCircle,      tone: "text-rose-600 bg-rose-500/10" },
  Waiting:   { icon: Play,         tone: "text-amber-600 bg-amber-500/10" },
} as const;

function Page() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Workflow history</div>
          <div className="text-xs text-muted-foreground">Immutable log of every workflow execution and approval decision.</div>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search runs…" className="h-9 pl-9 text-sm" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Run</th>
              <th className="px-4 py-3 text-left">Workflow</th>
              <th className="px-4 py-3 text-left">Trigger</th>
              <th className="px-4 py-3 text-left">Started</th>
              <th className="px-4 py-3 text-left">Duration</th>
              <th className="px-4 py-3 text-left">Actor</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {WORKFLOW_HISTORY.map((r) => {
              const s = STATUS[r.status];
              const Icon = s.icon;
              return (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-3 font-medium">{r.workflow}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.trigger}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.startedAt}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.duration}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.actor}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${s.tone}`}>
                      <Icon className={`h-3.5 w-3.5 ${r.status === "Running" ? "animate-spin" : ""}`} />
                      {r.status}
                    </span>
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