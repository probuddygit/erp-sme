import { createFileRoute, Link } from "@tanstack/react-router";
import { Workflow as WorkflowIcon, ShieldCheck, Bell, AlarmClock, Play, CheckCircle2, XCircle, Loader2, Bot } from "lucide-react";
import { WORKFLOW_HISTORY, APPROVAL_RULES, NOTIFICATION_RULES } from "@/features/workflow/data";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/workspace/workflow/")({
  component: Overview,
});

function Overview() {
  const kpis = [
    { label: "Active workflows",  value: 12, icon: WorkflowIcon, tone: "text-blue-600" },
    { label: "Approval rules",    value: APPROVAL_RULES.filter((r) => r.status === "Active").length, icon: ShieldCheck, tone: "text-emerald-600" },
    { label: "Notification rules",value: NOTIFICATION_RULES.filter((r) => r.enabled).length, icon: Bell, tone: "text-rose-600" },
    { label: "Escalations today", value: 3, icon: AlarmClock, tone: "text-amber-600" },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <k.icon className={`h-4 w-4 ${k.tone}`} />
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <div className="text-sm font-semibold">Recent runs</div>
              <div className="text-xs text-muted-foreground">Latest workflow executions across the tenant.</div>
            </div>
            <Link to="/workspace/workflow/history" className="text-xs font-medium text-primary hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {WORKFLOW_HISTORY.slice(0, 6).map((r) => {
              const map = {
                Completed: { icon: CheckCircle2, tone: "text-emerald-600" },
                Running:   { icon: Loader2,      tone: "text-blue-600" },
                Failed:    { icon: XCircle,      tone: "text-rose-600" },
                Waiting:   { icon: Play,         tone: "text-amber-600" },
              }[r.status];
              const Icon = map.icon;
              return (
                <div key={r.id} className="flex items-center gap-3 p-4 text-sm">
                  <Icon className={`h-4 w-4 shrink-0 ${map.tone} ${r.status === "Running" ? "animate-spin" : ""}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.workflow}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.trigger}</div>
                  </div>
                  <div className="hidden text-xs text-muted-foreground md:block">{r.startedAt}</div>
                  <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-600"><Bot className="h-5 w-5" /></div>
            <div>
              <div className="text-sm font-semibold">AI-ready</div>
              <div className="text-xs text-muted-foreground">Copilot & AI Steps</div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            The Workflow engine ships with an <span className="font-medium text-foreground">AI Step</span> node and Copilot hooks — plug in your model provider anytime to auto-generate flows, summarize approvals or classify documents.
          </p>
          <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
            <li>• Suggest next best approver</li>
            <li>• Summarize long approval threads</li>
            <li>• Extract data from attachments</li>
            <li>• Auto-draft workflows from prompts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}