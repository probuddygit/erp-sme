import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsGrid, SettingsSection, FieldRow } from "@/features/admin/SettingsShell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/security")({
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <Tabs defaultValue="password" className="space-y-4">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="password">Password Policy</TabsTrigger>
        <TabsTrigger value="2fa">Two-Factor</TabsTrigger>
        <TabsTrigger value="session">Session</TabsTrigger>
        <TabsTrigger value="ip">Allowed IPs</TabsTrigger>
        <TabsTrigger value="devices">Devices</TabsTrigger>
        <TabsTrigger value="sso">SSO / OAuth</TabsTrigger>
      </TabsList>

      <TabsContent value="password">
        <SettingsGrid>
          <SettingsSection title="Complexity">
            <FieldRow label="Minimum length"><Input defaultValue="12" /></FieldRow>
            <FieldRow label="Require uppercase"><Switch defaultChecked /></FieldRow>
            <FieldRow label="Require number"><Switch defaultChecked /></FieldRow>
            <FieldRow label="Require symbol"><Switch defaultChecked /></FieldRow>
            <FieldRow label="Block common passwords (HIBP)"><Switch defaultChecked /></FieldRow>
          </SettingsSection>
          <SettingsSection title="Lifecycle">
            <FieldRow label="Expire after"><Input defaultValue="90 days" /></FieldRow>
            <FieldRow label="Reuse window"><Input defaultValue="Last 5" /></FieldRow>
            <FieldRow label="Lock after failed attempts"><Input defaultValue="5" /></FieldRow>
          </SettingsSection>
        </SettingsGrid>
      </TabsContent>

      <TabsContent value="2fa">
        <SettingsSection title="Two-Factor Authentication">
          <FieldRow label="Mandatory for Admins"><Switch defaultChecked /></FieldRow>
          <FieldRow label="Mandatory for all users"><Switch /></FieldRow>
          <FieldRow label="Method">
            <Select defaultValue="totp"><SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="totp">Authenticator app (TOTP)</SelectItem>
                <SelectItem value="sms">SMS OTP</SelectItem>
                <SelectItem value="email">Email OTP</SelectItem>
                <SelectItem value="webauthn">WebAuthn / Passkeys</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Trust device"><Input defaultValue="30 days" /></FieldRow>
        </SettingsSection>
      </TabsContent>

      <TabsContent value="session">
        <SettingsSection title="Sessions">
          <FieldRow label="Idle timeout"><Input defaultValue="30 minutes" /></FieldRow>
          <FieldRow label="Absolute timeout"><Input defaultValue="12 hours" /></FieldRow>
          <FieldRow label="Single active session"><Switch /></FieldRow>
          <FieldRow label="Refresh token rotation"><Switch defaultChecked /></FieldRow>
        </SettingsSection>
      </TabsContent>

      <TabsContent value="ip">
        <DataListPage searchKeys={["cidr", "label"]}
          actionLabel="Add IP range"
          columns={[
            { key: "cidr", header: "CIDR" },
            { key: "label", header: "Label" },
            { key: "scope", header: "Scope", render: (r: any) => <Pill tone="info">{r.scope}</Pill> },
            { key: "added", header: "Added" },
          ]}
          rows={[
            { id: "1", cidr: "103.24.11.0/24", label: "Pune HO", scope: "All users", added: "01 Jan 2026" },
            { id: "2", cidr: "49.207.44.0/24", label: "Bengaluru Plant", scope: "All users", added: "01 Jan 2026" },
            { id: "3", cidr: "0.0.0.0/0", label: "Mobile app allowed anywhere", scope: "Mobile only", added: "12 Feb 2026" },
          ] as any}
        />
      </TabsContent>

      <TabsContent value="devices">
        <DataListPage searchKeys={["user", "device"]}
          columns={[
            { key: "user", header: "User" },
            { key: "device", header: "Device" },
            { key: "lastSeen", header: "Last seen" },
            { key: "ip", header: "IP" },
            { key: "trusted", header: "Trusted", render: (r: any) => <Pill tone={r.trusted ? "success" : "warn"}>{r.trusted ? "Yes" : "No"}</Pill> },
          ]}
          rows={[
            { id: "1", user: "Ops Admin", device: "MacBook Pro (Chrome)", lastSeen: "2 min ago", ip: "103.24.11.9", trusted: true },
            { id: "2", user: "Sanna Guru", device: "Windows 11 (Edge)", lastSeen: "1 hour ago", ip: "49.207.44.10", trusted: true },
            { id: "3", user: "Priya Nair", device: "iPhone 15 (Safari)", lastSeen: "3 hours ago", ip: "203.192.242.5", trusted: false },
          ] as any}
        />
      </TabsContent>

      <TabsContent value="sso">
        <SettingsGrid>
          <SettingsSection title="SSO">
            <FieldRow label="Enabled"><Switch defaultChecked /></FieldRow>
            <FieldRow label="Protocol">
              <Select defaultValue="saml"><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="saml">SAML 2.0</SelectItem>
                  <SelectItem value="oidc">OIDC</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Provider"><Input defaultValue="Google Workspace" /></FieldRow>
            <FieldRow label="Entity ID"><Input defaultValue="https://erp.indguru.com/saml" /></FieldRow>
          </SettingsSection>
          <SettingsSection title="OAuth providers">
            <FieldRow label="Google"><Switch defaultChecked /></FieldRow>
            <FieldRow label="Microsoft"><Switch defaultChecked /></FieldRow>
            <FieldRow label="Apple"><Switch /></FieldRow>
          </SettingsSection>
        </SettingsGrid>
      </TabsContent>

      <div className="flex justify-end gap-2"><Button variant="outline">Cancel</Button><Button>Save security settings</Button></div>
    </Tabs>
  );
}