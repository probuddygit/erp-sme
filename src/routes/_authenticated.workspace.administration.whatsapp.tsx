import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsForm } from "@/features/admin/SettingsForm";
import { CrudList } from "@/features/admin/CrudList";
import { useSettingsCollection, type CollectionRow } from "@/features/admin/admin-api";
import { Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/whatsapp")({
  component: WhatsAppPage,
});

interface WaTpl extends CollectionRow { name: string; category: string; language: string; status: string; body: string }

function WaTemplates() {
  const { rows, isLoading, create, update, remove } = useSettingsCollection<WaTpl>("admin.whatsapp.templates");
  return (
    <CrudList<WaTpl>
      entity="WhatsApp template"
      loading={isLoading}
      rows={rows}
      searchKeys={["name", "category"]}
      columns={[
        { key: "name", header: "Template" },
        { key: "category", header: "Category" },
        { key: "language", header: "Language" },
        { key: "status", header: "Approval", render: (r) => <Pill tone={r.status === "Approved" ? "success" : r.status === "Rejected" ? "danger" : "warn"}>{r.status || "Pending"}</Pill> },
      ]}
      fields={[
        { name: "name", label: "Template name", required: true },
        { name: "category", label: "Category", type: "select", default: "Utility", options: [
          { label: "Utility", value: "Utility" }, { label: "Marketing", value: "Marketing" }, { label: "Authentication", value: "Authentication" },
        ] },
        { name: "language", label: "Language", default: "en_IN" },
        { name: "status", label: "Approval status", type: "select", default: "Pending", options: [
          { label: "Pending", value: "Pending" }, { label: "Approved", value: "Approved" }, { label: "Rejected", value: "Rejected" },
        ] },
        { name: "body", label: "Body", type: "textarea" },
      ]}
      onCreate={(v) => create(v as any)}
      onUpdate={(id, v) => update(id, v as any)}
      onDelete={(r) => remove(r.id)}
    />
  );
}

function WhatsAppPage() {
  return (
    <Tabs defaultValue="setup" className="space-y-4">
      <TabsList>
        <TabsTrigger value="setup">Business API</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
      </TabsList>
      <TabsContent value="setup">
        <SettingsForm settingsKey="admin.whatsapp.setup" groups={[
          { title: "Connection", fields: [
            { name: "enabled", label: "WhatsApp enabled", type: "switch", default: false },
            { name: "provider", label: "Provider", default: "Meta Cloud API" },
            { name: "phone", label: "Business phone", default: "" },
            { name: "phone_number_id", label: "Phone number ID", default: "" },
            { name: "waba_id", label: "WABA ID", default: "" },
            { name: "access_token", label: "Access token", type: "password", default: "" },
          ] },
          { title: "Behaviour", fields: [
            { name: "namespace", label: "Template namespace", default: "" },
            { name: "send_invoices", label: "Send invoices on WhatsApp", type: "switch", default: false },
            { name: "send_dispatch", label: "Send dispatch updates", type: "switch", default: false },
            { name: "opt_in_required", label: "Require customer opt-in", type: "switch", default: true },
          ] },
        ]} />
      </TabsContent>
      <TabsContent value="templates"><WaTemplates /></TabsContent>
    </Tabs>
  );
}
