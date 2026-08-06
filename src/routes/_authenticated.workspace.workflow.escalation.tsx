import { createFileRoute } from "@tanstack/react-router";
import { AlarmClock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CrudList } from "@/features/admin/CrudList";
import { useEscalationRules, type EscalationRuleRow } from "@/features/workflow/workflow-api";

export const Route = createFileRoute("/_authenticated/workspace/workflow/escalation")({
  component: Page,
});

const ACTIONS = ["Notify", "Reassign", "Auto-approve", "Cancel"];

function Page() {
  const { rows, isLoading, create, update, remove } = useEscalationRules();
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold">Escalation rules</div>
        <div className="text-xs text-muted-foreground">Auto-escalate stuck approvals to keep operations flowing.</div>
      </div>
      <CrudList<EscalationRuleRow>
        entity="Escalation rule"
        actionLabel="New escalation"
        loading={isLoading}
        rows={rows}
        searchKeys={["workflow", "escalate_to", "action"]}
        columns={[
          { key: "workflow", header: "Workflow", render: (r) => (
            <div className="flex items-center gap-2"><AlarmClock className="h-4 w-4 text-amber-600" /><span className="font-medium">{r.workflow}</span></div>
          ) },
          { key: "after_hours", header: "After", render: (r) => `${r.after_hours} hours` },
          { key: "action", header: "Action" },
          { key: "escalate_to", header: "Escalate to" },
          { key: "enabled", header: "Enabled", render: (r) => (
            <Switch checked={!!r.enabled} onCheckedChange={(v) => update(r.id, { enabled: v })} />
          ) },
        ]}
        fields={[
          { name: "workflow", label: "Workflow", required: true },
          { name: "after_hours", label: "Escalate after (hours)", type: "number", default: 24 },
          { name: "action", label: "Action", type: "select", default: "Notify", options: ACTIONS.map((a) => ({ label: a, value: a })) },
          { name: "escalate_to", label: "Escalate to", default: "Manager" },
          { name: "enabled", label: "Enabled", type: "switch", default: true },
        ]}
        onCreate={(v) => create({ workflow: v.workflow, after_hours: Number(v.after_hours) || 24, action: v.action, escalate_to: v.escalate_to, enabled: !!v.enabled } as any)}
        onUpdate={(id, v) => update(id, { workflow: v.workflow, after_hours: Number(v.after_hours) || 24, action: v.action, escalate_to: v.escalate_to, enabled: !!v.enabled })}
        onDelete={(r) => remove(r.id)}
      />
    </div>
  );
}
