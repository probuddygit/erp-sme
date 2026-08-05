import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsForm } from "@/features/admin/SettingsForm";
import { CrudList } from "@/features/admin/CrudList";
import { useSettingsCollection, type CollectionRow } from "@/features/admin/admin-api";
import { Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/email-settings")({
  component: EmailPage,
});

interface EmailTpl extends CollectionRow { name: string; event: string; subject: string; body: string; active: boolean }

function Templates() {
  const { rows, isLoading, create, update, remove } = useSettingsCollection<EmailTpl>("admin.email.templates");
  return (
    <CrudList<EmailTpl>
      entity="Email template"
      loading={isLoading}
      rows={rows}
      searchKeys={["name", "event", "subject"]}
      columns={[
        { key: "name", header: "Template" },
        { key: "event", header: "Event" },
        { key: "subject", header: "Subject" },
        { key: "active", header: "Status", render: (r) => <Pill tone={r.active ? "success" : "warn"}>{r.active ? "Active" : "Paused"}</Pill> },
      ]}
      fields={[
        { name: "name", label: "Template name", required: true },
        { name: "event", label: "Event key", placeholder: "invoice.created", required: true },
        { name: "subject", label: "Subject", full: true, required: true },
        { name: "body", label: "Body", type: "textarea" },
        { name: "active", label: "Active", type: "switch", default: true },
      ]}
      onCreate={(v) => create(v as any)}
      onUpdate={(id, v) => update(id, v as any)}
      onDelete={(r) => remove(r.id)}
    />
  );
}

function EmailPage() {
  return (
    <Tabs defaultValue="smtp" className="space-y-4">
      <TabsList>
        <TabsTrigger value="smtp">SMTP</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="dkim">DKIM / SPF</TabsTrigger>
      </TabsList>

      <TabsContent value="smtp">
        <SettingsForm settingsKey="admin.email.smtp" groups={[
          { title: "Outbound SMTP", fields: [
            { name: "provider", label: "Provider", type: "select", default: "ses", options: [
              { label: "Amazon SES", value: "ses" }, { label: "SendGrid", value: "sendgrid" },
              { label: "Resend", value: "resend" }, { label: "Custom SMTP", value: "smtp" },
            ] },
            { name: "host", label: "Host", default: "" },
            { name: "port", label: "Port", type: "number", default: 587 },
            { name: "tls", label: "TLS", type: "switch", default: true },
            { name: "username", label: "Username", default: "" },
            { name: "password", label: "Password", type: "password", default: "" },
          ] },
          { title: "Defaults", fields: [
            { name: "from_name", label: "From name", default: "" },
            { name: "from_address", label: "From address", type: "email", default: "" },
            { name: "bcc", label: "BCC (audit)", type: "email", default: "" },
            { name: "footer", label: "Footer signature", type: "textarea", default: "" },
          ] },
        ]} />
      </TabsContent>

      <TabsContent value="templates"><Templates /></TabsContent>

      <TabsContent value="dkim">
        <SettingsForm columns={1} settingsKey="admin.email.deliverability" groups={[
          { title: "Deliverability", fields: [
            { name: "sending_domain", label: "Sending domain", default: "" },
            { name: "spf", label: "SPF verified", type: "switch", default: false },
            { name: "dkim", label: "DKIM verified", type: "switch", default: false },
            { name: "dmarc_policy", label: "DMARC policy", type: "select", default: "none", options: [
              { label: "none", value: "none" }, { label: "quarantine", value: "quarantine" }, { label: "reject", value: "reject" },
            ] },
            { name: "bounce_webhook", label: "Bounce webhook", default: "" },
          ] },
        ]} />
      </TabsContent>
    </Tabs>
  );
}
