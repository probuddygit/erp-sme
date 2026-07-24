import { createFileRoute } from "@tanstack/react-router";
import { Plus, AlarmClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ESCALATION_RULES } from "@/features/workflow/data";

export const Route = createFileRoute("/_authenticated/workspace/workflow/escalation")({
  component: Page,
});

function Page() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Escalation rules</div>
          <div className="text-xs text-muted-foreground">Auto-escalate stuck approvals to keep operations flowing.</div>
        </div>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" />New escalation</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {ESCALATION_RULES.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                  <AlarmClock className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{r.workflow}</div>
                  <div className="text-[11px] text-muted-foreground">{r.id}</div>
                </div>
              </div>
              <Switch defaultChecked={r.enabled} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <Field label="After">{r.after}</Field>
              <Field label="Action">{r.action}</Field>
              <Field label="Escalate to">{r.escalateTo}</Field>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{children}</div>
    </div>
  );
}