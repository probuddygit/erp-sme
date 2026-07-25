import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsGrid, SettingsSection, FieldRow } from "@/features/admin/SettingsShell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/workspace/administration/notifications")({
  component: NotifPage,
});

const EVENTS = [
  "Sales invoice created", "Sales invoice approved", "Payment received",
  "Purchase order raised", "PO approved", "GRN posted",
  "Low stock", "Expiring subscription", "Password changed",
];

function EventMatrix() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">Event</th>
            <th className="px-4 py-2.5 text-center font-medium">Email</th>
            <th className="px-4 py-2.5 text-center font-medium">SMS</th>
            <th className="px-4 py-2.5 text-center font-medium">WhatsApp</th>
            <th className="px-4 py-2.5 text-center font-medium">Push</th>
            <th className="px-4 py-2.5 text-center font-medium">Slack</th>
            <th className="px-4 py-2.5 text-center font-medium">Teams</th>
          </tr>
        </thead>
        <tbody>
          {EVENTS.map((e) => (
            <tr key={e} className="border-t border-border">
              <td className="px-4 py-2 font-medium">{e}</td>
              {[true, false, true, true, false, false].map((v, i) => (
                <td key={i} className="px-4 py-2 text-center"><Switch defaultChecked={v} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
        <TabsTrigger value="slack">Slack</TabsTrigger>
        <TabsTrigger value="teams">Teams</TabsTrigger>
      </TabsList>

      <TabsContent value="events"><div className="rounded-lg border border-border bg-card"><EventMatrix /></div></TabsContent>

      <TabsContent value="email"><SettingsGrid>
        <SettingsSection title="Sender">
          <FieldRow label="From name"><Input defaultValue="Ind Guru ERP" /></FieldRow>
          <FieldRow label="From address"><Input defaultValue="noreply@indguru.com" /></FieldRow>
          <FieldRow label="Reply-to"><Input defaultValue="support@indguru.com" /></FieldRow>
        </SettingsSection>
        <SettingsSection title="Templates"><FieldRow label="Digest cadence"><Input defaultValue="Daily 09:00 IST" /></FieldRow></SettingsSection>
      </SettingsGrid></TabsContent>

      <TabsContent value="sms"><SettingsSection title="SMS gateway">
        <FieldRow label="Provider"><Badge variant="secondary">MSG91</Badge></FieldRow>
        <FieldRow label="Sender ID"><Input defaultValue="INDGRU" /></FieldRow>
        <FieldRow label="Route"><Input defaultValue="Transactional" /></FieldRow>
      </SettingsSection></TabsContent>

      <TabsContent value="whatsapp"><SettingsSection title="WhatsApp Business API">
        <FieldRow label="Provider"><Badge variant="secondary">Meta Cloud API</Badge></FieldRow>
        <FieldRow label="Business phone"><Input defaultValue="+91 98200 00000" /></FieldRow>
        <FieldRow label="Namespace"><Input defaultValue="indguru_erp_v1" /></FieldRow>
      </SettingsSection></TabsContent>

      <TabsContent value="push"><SettingsSection title="Push (Web / Mobile)">
        <FieldRow label="Enabled"><Switch defaultChecked /></FieldRow>
        <FieldRow label="Silent hours"><Input defaultValue="22:00 – 07:00" /></FieldRow>
      </SettingsSection></TabsContent>

      <TabsContent value="slack"><SettingsSection title="Slack">
        <FieldRow label="Workspace"><Input defaultValue="indguru.slack.com" /></FieldRow>
        <FieldRow label="Default channel"><Input defaultValue="#erp-alerts" /></FieldRow>
      </SettingsSection></TabsContent>

      <TabsContent value="teams"><SettingsSection title="Microsoft Teams">
        <FieldRow label="Tenant"><Input defaultValue="indguru.onmicrosoft.com" /></FieldRow>
        <FieldRow label="Default channel"><Input defaultValue="ERP Alerts" /></FieldRow>
      </SettingsSection></TabsContent>

      <div className="flex justify-end gap-2"><Button variant="outline">Cancel</Button><Button>Save</Button></div>
    </Tabs>
  );
}