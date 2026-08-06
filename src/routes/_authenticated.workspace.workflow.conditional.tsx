import { createFileRoute } from "@tanstack/react-router";
import { GitBranch } from "lucide-react";
import { CrudList } from "@/features/admin/CrudList";
import { Pill } from "@/features/admin/DataListPage";
import { useConditionalRules, type ConditionalRuleRow } from "@/features/workflow/workflow-api";

export const Route = createFileRoute("/_authenticated/workspace/workflow/conditional")({
  component: Page,
});

function Page() {
  const { rows, isLoading, create, update, remove } = useConditionalRules();
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold">Conditional rules</div>
        <div className="text-xs text-muted-foreground">If-this-then-that automations that fire on data events.</div>
      </div>
      <CrudList<ConditionalRuleRow>
        entity="Conditional rule"
        actionLabel="New rule"
        loading={isLoading}
        rows={rows}
        searchKeys={["name", "when", "then"]}
        columns={[
          { key: "name", header: "Rule", render: (r) => (
            <div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-amber-600" /><span className="font-medium">{r.name}</span></div>
          ) },
          { key: "when", header: "When", render: (r) => <span className="font-mono text-xs">{r.when}</span> },
          { key: "then", header: "Then", render: (r) => <span className="font-mono text-xs">{r.then}</span> },
          { key: "active", header: "Status", render: (r) => <Pill tone={r.active ? "success" : "warn"}>{r.active ? "Active" : "Draft"}</Pill> },
        ]}
        fields={[
          { name: "name", label: "Rule name", required: true },
          { name: "when", label: "When (condition)", full: true, required: true, hint: "e.g. stock.qty < reorder_level" },
          { name: "then", label: "Then (action)", full: true, required: true, hint: "e.g. Create Indent draft" },
          { name: "active", label: "Active", type: "switch", default: true },
        ]}
        onCreate={(v) => create({ name: v.name, when: v.when, then: v.then, active: !!v.active } as any)}
        onUpdate={(id, v) => update(id, { name: v.name, when: v.when, then: v.then, active: !!v.active })}
        onDelete={(r) => remove(r.id)}
      />
    </div>
  );
}
