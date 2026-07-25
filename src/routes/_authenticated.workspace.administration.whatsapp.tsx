import { createFileRoute } from "@tanstack/react-router";
import { SettingsGrid, SettingsSection, FieldRow } from "@/features/admin/SettingsShell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/whatsapp")({
  component: () => (
    <div className="space-y-4">
      <SettingsGrid>
        <SettingsSection title="WhatsApp Business API">
          <FieldRow label="Provider">
            <Select defaultValue="meta"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meta">Meta Cloud API</SelectItem>
                <SelectItem value="gupshup">Gupshup</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Business phone number"><Input defaultValue="+91 98200 00000" /></FieldRow>
          <FieldRow label="Phone number ID"><Input defaultValue="10241234567890" /></FieldRow>
          <FieldRow label="Access token"><Input type="password" defaultValue="••••••••••••••••" /></FieldRow>
          <FieldRow label="Webhook verify token"><Input defaultValue="ig-erp-verify-2026" /></FieldRow>
        </SettingsSection>
        <SettingsSection title="Behaviour">
          <FieldRow label="Enabled"><Switch defaultChecked /></FieldRow>
          <FieldRow label="Opt-in required"><Switch defaultChecked /></FieldRow>
          <FieldRow label="Business hours only"><Switch /></FieldRow>
          <FieldRow label="Fallback to SMS"><Switch defaultChecked /></FieldRow>
        </SettingsSection>
      </SettingsGrid>

      <DataListPage
        actionLabel="New template" searchKeys={["name"]}
        columns={[
          { key: "name", header: "Template" },
          { key: "language", header: "Language" },
          { key: "category", header: "Category", render: (r: any) => <Pill tone="info">{r.category}</Pill> },
          { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Approved" ? "success" : "warn"}>{r.status}</Pill> },
          { key: "updated", header: "Updated" },
        ]}
        rows={[
          { id: "1", name: "invoice_ready", language: "en_IN", category: "Utility", status: "Approved", updated: "18 Jul 2026" },
          { id: "2", name: "payment_reminder", language: "en_IN", category: "Utility", status: "Approved", updated: "18 Jul 2026" },
          { id: "3", name: "otp_login", language: "en_IN", category: "Authentication", status: "Approved", updated: "12 Jun 2026" },
          { id: "4", name: "festive_offer", language: "en_IN", category: "Marketing", status: "Pending", updated: "22 Jul 2026" },
        ] as any}
      />

      <div className="flex justify-end gap-2"><Button variant="outline">Send test</Button><Button>Save</Button></div>
    </div>
  ),
});