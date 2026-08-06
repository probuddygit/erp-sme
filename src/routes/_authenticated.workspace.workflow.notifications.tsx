import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CrudList } from "@/features/admin/CrudList";
import { useNotificationRules, type NotificationRuleRow } from "@/features/workflow/workflow-api";

export const Route = createFileRoute("/_authenticated/workspace/workflow/notifications")({
  component: Page,
});

function Page() {
  const { rows, isLoading, create, update, remove } = useNotificationRules();
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold">Notification rules</div>
        <div className="text-xs text-muted-foreground">Deliver alerts across in-app, email, SMS and push channels.</div>
      </div>
      <CrudList<NotificationRuleRow>
        entity="Notification rule"
        actionLabel="New rule"
        loading={isLoading}
        rows={rows}
        searchKeys={["event", "audience", "template"]}
        columns={[
          { key: "event", header: "Event", render: (r) => (
            <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-rose-600" /><span className="font-medium">{r.event}</span></div>
          ) },
          { key: "channels", header: "Channels", render: (r) => (
            <div className="flex flex-wrap gap-1">
              {String(r.channels || "").split(",").map((c) => c.trim()).filter(Boolean).map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
              ))}
            </div>
          ) },
          { key: "audience", header: "Audience" },
          { key: "template", header: "Template", render: (r) => <span className="font-mono text-xs">{r.template}</span> },
          { key: "enabled", header: "Enabled", render: (r) => (
            <Switch checked={!!r.enabled} onCheckedChange={(v) => update(r.id, { enabled: v })} />
          ) },
        ]}
        fields={[
          { name: "event", label: "Event", required: true },
          { name: "channels", label: "Channels", hint: "Comma-separated: In-app, Email, SMS, Push", default: "In-app, Email" },
          { name: "audience", label: "Audience", default: "All users" },
          { name: "template", label: "Template key", default: "generic_event" },
          { name: "enabled", label: "Enabled", type: "switch", default: true },
        ]}
        onCreate={(v) => create({ event: v.event, channels: v.channels, audience: v.audience, template: v.template, enabled: !!v.enabled } as any)}
        onUpdate={(id, v) => update(id, { event: v.event, channels: v.channels, audience: v.audience, template: v.template, enabled: !!v.enabled })}
        onDelete={(r) => remove(r.id)}
      />
    </div>
  );
}
