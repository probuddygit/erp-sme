import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsSection, FieldRow, SettingsGrid } from "@/features/admin/SettingsShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/email-settings")({
  component: EmailPage,
});

function EmailPage() {
  return (
    <Tabs defaultValue="smtp" className="space-y-4">
      <TabsList>
        <TabsTrigger value="smtp">SMTP</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="dkim">DKIM / SPF</TabsTrigger>
      </TabsList>

      <TabsContent value="smtp">
        <SettingsGrid>
          <SettingsSection title="Outbound SMTP">
            <FieldRow label="Provider">
              <Select defaultValue="ses"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ses">Amazon SES</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="smtp">Custom SMTP</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Host"><Input defaultValue="email-smtp.ap-south-1.amazonaws.com" /></FieldRow>
            <FieldRow label="Port"><Input defaultValue="587" /></FieldRow>
            <FieldRow label="TLS"><Switch defaultChecked /></FieldRow>
            <FieldRow label="Username"><Input defaultValue="AKIA••••••••••" /></FieldRow>
            <FieldRow label="Password"><Input type="password" defaultValue="••••••••••" /></FieldRow>
          </SettingsSection>
          <SettingsSection title="Defaults">
            <FieldRow label="From name"><Input defaultValue="Ind Guru ERP" /></FieldRow>
            <FieldRow label="From address"><Input defaultValue="noreply@indguru.com" /></FieldRow>
            <FieldRow label="BCC (audit)"><Input defaultValue="audit-mail@indguru.com" /></FieldRow>
            <FieldRow label="Footer signature"><Textarea rows={3} defaultValue="Ind Guru Enterprises Pvt Ltd — Pune, IN" /></FieldRow>
          </SettingsSection>
        </SettingsGrid>
        <div className="flex justify-end gap-2 mt-4"><Button variant="outline">Send test email</Button><Button>Save</Button></div>
      </TabsContent>

      <TabsContent value="templates">
        <DataListPage searchKeys={["name"]} actionLabel="New template"
          columns={[
            { key: "name", header: "Template" },
            { key: "event", header: "Event" },
            { key: "channel", header: "Channel", render: (r: any) => <Pill tone="info">{r.channel}</Pill> },
            { key: "updated", header: "Updated" },
          ]}
          rows={[
            { id: "1", name: "Invoice sent", event: "invoice.created", channel: "Email", updated: "12 Jul 2026" },
            { id: "2", name: "Payment received", event: "payment.received", channel: "Email", updated: "12 Jul 2026" },
            { id: "3", name: "PO approval request", event: "po.pending_approval", channel: "Email", updated: "18 Jul 2026" },
            { id: "4", name: "Low stock alert", event: "inventory.low", channel: "Email", updated: "20 Jul 2026" },
            { id: "5", name: "Password reset", event: "auth.password_reset", channel: "Email", updated: "01 Jun 2026" },
          ] as any}
        />
      </TabsContent>

      <TabsContent value="dkim">
        <SettingsSection title="Deliverability">
          <FieldRow label="SPF"><Pill tone="success">Verified</Pill></FieldRow>
          <FieldRow label="DKIM"><Pill tone="success">Verified</Pill></FieldRow>
          <FieldRow label="DMARC"><Pill tone="warn">Policy: none</Pill></FieldRow>
          <FieldRow label="Bounce webhook"><Input defaultValue="https://api.indguru.com/webhooks/bounce" /></FieldRow>
        </SettingsSection>
      </TabsContent>
    </Tabs>
  );
}