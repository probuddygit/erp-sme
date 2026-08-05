import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SettingsForm } from "@/features/admin/SettingsForm";
import { useSettingsDoc, useSaveSettingsDoc } from "@/features/admin/admin-api";
import { Save } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/workspace/administration/notifications")({
  component: NotifPage,
});

const EVENTS = [
  "Sales invoice created", "Sales invoice approved", "Payment received",
  "Purchase order raised", "PO approved", "GRN posted",
  "Low stock", "Expiring subscription", "Password changed",
];
const CHANNELS = ["Email", "SMS", "WhatsApp", "Push", "Slack", "Teams"];

function EventMatrix() {
  const { value, isLoading } = useSettingsDoc<Record<string, boolean>>("admin.notifications.matrix", {});
  const save = useSaveSettingsDoc("admin.notifications.matrix");
  const [draft, setDraft] = useState<Record<string, boolean> | null>(null);
  const state = draft ?? value;
  const toggle = (k: string, v: boolean) => setDraft({ ...state, [k]: v });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Event</th>
              {CHANNELS.map((c) => <th key={c} className="px-4 py-2.5 text-center font-medium">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {EVENTS.map((e) => (
              <tr key={e} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{e}</td>
                {CHANNELS.map((c) => {
                  const key = `${e}::${c}`;
                  return (
                    <td key={c} className="px-4 py-2 text-center">
                      <Switch checked={!!state[key]} disabled={isLoading} onCheckedChange={(v) => toggle(key, v)} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => save.mutate(state)} disabled={save.isPending || isLoading}>
          <Save className="mr-1.5 h-4 w-4" />{save.isPending ? "Saving…" : "Save matrix"}
        </Button>
      </div>
    </div>
  );
}

function NotifPage() {
  return (
    <Tabs defaultValue="events" className="space-y-4">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="events">Event Matrix</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="sms">SMS</TabsTrigger>
        <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        <TabsTrigger value="push">Push</TabsTrigger>
        <TabsTrigger value="chat">Slack / Teams</TabsTrigger>
      </TabsList>

      <TabsContent value="events"><EventMatrix /></TabsContent>

      <TabsContent value="email">
        <SettingsForm settingsKey="admin.notifications.email" groups={[
          { title: "Sender", fields: [
            { name: "from_name", label: "From name", default: "" },
            { name: "from_address", label: "From address", type: "email", default: "" },
            { name: "reply_to", label: "Reply-to", type: "email", default: "" },
          ] },
          { title: "Digest", fields: [
            { name: "digest_enabled", label: "Daily digest", type: "switch", default: true },
            { name: "digest_time", label: "Digest time", default: "09:00 IST" },
          ] },
        ]} />
      </TabsContent>

      <TabsContent value="sms">
        <SettingsForm columns={1} settingsKey="admin.notifications.sms" groups={[
          { title: "SMS gateway", fields: [
            { name: "provider", label: "Provider", type: "select", default: "msg91", options: [
              { label: "MSG91", value: "msg91" }, { label: "Twilio", value: "twilio" }, { label: "Gupshup", value: "gupshup" },
            ] },
            { name: "sender_id", label: "Sender ID", default: "" },
            { name: "route", label: "Route", default: "Transactional" },
          ] },
        ]} />
      </TabsContent>

      <TabsContent value="whatsapp">
        <SettingsForm columns={1} settingsKey="admin.notifications.whatsapp" groups={[
          { title: "WhatsApp Business API", fields: [
            { name: "provider", label: "Provider", default: "Meta Cloud API" },
            { name: "phone", label: "Business phone", default: "" },
            { name: "namespace", label: "Namespace", default: "" },
          ] },
        ]} />
      </TabsContent>

      <TabsContent value="push">
        <SettingsForm columns={1} settingsKey="admin.notifications.push" groups={[
          { title: "Push (Web / Mobile)", fields: [
            { name: "enabled", label: "Enabled", type: "switch", default: true },
            { name: "silent_hours", label: "Silent hours", default: "22:00 – 07:00" },
          ] },
        ]} />
      </TabsContent>

      <TabsContent value="chat">
        <SettingsForm settingsKey="admin.notifications.chat" groups={[
          { title: "Slack", fields: [
            { name: "slack_workspace", label: "Workspace", default: "" },
            { name: "slack_channel", label: "Default channel", default: "#erp-alerts" },
            { name: "slack_webhook", label: "Incoming webhook URL", default: "" },
          ] },
          { title: "Microsoft Teams", fields: [
            { name: "teams_tenant", label: "Tenant", default: "" },
            { name: "teams_channel", label: "Default channel", default: "ERP Alerts" },
            { name: "teams_webhook", label: "Incoming webhook URL", default: "" },
          ] },
        ]} />
      </TabsContent>
    </Tabs>
  );
}
