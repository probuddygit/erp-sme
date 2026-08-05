import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsForm } from "@/features/admin/SettingsForm";
import { CrudList } from "@/features/admin/CrudList";
import { useSettingsCollection, type CollectionRow } from "@/features/admin/admin-api";
import { Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/sms")({
  component: SmsPage,
});

interface TplRow extends CollectionRow { name: string; dlt_id: string; body: string; active: boolean }

function SmsTemplates() {
  const { rows, isLoading, create, update, remove } = useSettingsCollection<TplRow>("admin.sms.templates");
  return (
    <CrudList<TplRow>
      entity="SMS template"
      loading={isLoading}
      rows={rows}
      searchKeys={["name", "dlt_id"]}
      columns={[
        { key: "name", header: "Template" },
        { key: "dlt_id", header: "DLT template ID" },
        { key: "body", header: "Body" },
        { key: "active", header: "Status", render: (r) => <Pill tone={r.active ? "success" : "warn"}>{r.active ? "Active" : "Paused"}</Pill> },
      ]}
      fields={[
        { name: "name", label: "Template name", required: true },
        { name: "dlt_id", label: "DLT template ID" },
        { name: "body", label: "Message body", type: "textarea", required: true },
        { name: "active", label: "Active", type: "switch", default: true },
      ]}
      onCreate={(v) => create(v as any)}
      onUpdate={(id, v) => update(id, v as any)}
      onDelete={(r) => remove(r.id)}
    />
  );
}

function SmsPage() {
  return (
    <Tabs defaultValue="gateway" className="space-y-4">
      <TabsList>
        <TabsTrigger value="gateway">Gateway</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
      </TabsList>
      <TabsContent value="gateway">
        <SettingsForm settingsKey="admin.sms.gateway" groups={[
          { title: "Provider", fields: [
            { name: "provider", label: "Provider", type: "select", default: "msg91", options: [
              { label: "MSG91", value: "msg91" }, { label: "Twilio", value: "twilio" }, { label: "Gupshup", value: "gupshup" },
            ] },
            { name: "sender_id", label: "Sender ID", default: "" },
            { name: "api_key", label: "API key", type: "password", default: "" },
            { name: "route", label: "Route", default: "Transactional" },
          ] },
          { title: "Delivery", fields: [
            { name: "enabled", label: "SMS enabled", type: "switch", default: false },
            { name: "retry", label: "Retry attempts", type: "number", default: 2 },
            { name: "unicode", label: "Allow unicode", type: "switch", default: false },
            { name: "callback_url", label: "Delivery callback URL", default: "" },
          ] },
        ]} />
      </TabsContent>
      <TabsContent value="templates"><SmsTemplates /></TabsContent>
    </Tabs>
  );
}
