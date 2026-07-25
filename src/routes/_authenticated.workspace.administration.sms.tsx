import { createFileRoute } from "@tanstack/react-router";
import { SettingsGrid, SettingsSection, FieldRow } from "@/features/admin/SettingsShell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/sms")({
  component: () => (
    <div className="space-y-4">
      <SettingsGrid>
        <SettingsSection title="SMS gateway">
          <FieldRow label="Provider">
            <Select defaultValue="msg91"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="msg91">MSG91</SelectItem>
                <SelectItem value="textlocal">TextLocal</SelectItem>
                <SelectItem value="kaleyra">Kaleyra</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Sender ID"><Input defaultValue="INDGRU" /></FieldRow>
          <FieldRow label="Route"><Input defaultValue="Transactional (DLT)" /></FieldRow>
          <FieldRow label="Auth key"><Input type="password" defaultValue="••••••••••" /></FieldRow>
          <FieldRow label="DLT entity ID"><Input defaultValue="110200011122334455" /></FieldRow>
        </SettingsSection>
        <SettingsSection title="Options">
          <FieldRow label="Enabled"><Switch defaultChecked /></FieldRow>
          <FieldRow label="Retry on failure"><Switch defaultChecked /></FieldRow>
          <FieldRow label="Unicode support"><Switch /></FieldRow>
          <FieldRow label="Balance"><span className="text-sm font-medium">₹ 12,480 · ~18,400 SMS</span></FieldRow>
        </SettingsSection>
      </SettingsGrid>

      <DataListPage rowActions={false} searchKeys={["to"]}
        columns={[
          { key: "ts", header: "Sent" },
          { key: "to", header: "To" },
          { key: "template", header: "Template" },
          { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Delivered" ? "success" : r.status === "Sent" ? "info" : "danger"}>{r.status}</Pill> },
        ]}
        rows={[
          { id: "1", ts: "10:22", to: "+91 98••••2231", template: "otp_login", status: "Delivered" },
          { id: "2", ts: "10:18", to: "+91 96••••1180", template: "invoice_ready", status: "Delivered" },
          { id: "3", ts: "10:12", to: "+91 90••••4402", template: "payment_reminder", status: "Sent" },
          { id: "4", ts: "09:41", to: "+91 84••••7710", template: "otp_login", status: "Failed" },
        ] as any}
      />

      <div className="flex justify-end gap-2"><Button variant="outline">Send test</Button><Button>Save</Button></div>
    </div>
  ),
});