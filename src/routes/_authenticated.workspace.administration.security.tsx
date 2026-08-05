import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsForm } from "@/features/admin/SettingsForm";
import { CrudList } from "@/features/admin/CrudList";
import { DataListPage, Pill } from "@/features/admin/DataListPage";
import { useSettingsCollection, type CollectionRow } from "@/features/admin/admin-api";
import { useAuditLogs, useUserNames, fmtTs } from "@/features/admin/logs-api";

export const Route = createFileRoute("/_authenticated/workspace/administration/security")({
  component: SecurityPage,
});

interface IpRow extends CollectionRow { cidr: string; label: string; scope: string }

function IpRanges() {
  const { rows, isLoading, create, update, remove } = useSettingsCollection<IpRow>("admin.security.ip_ranges");
  return (
    <CrudList<IpRow>
      entity="IP range"
      actionLabel="Add IP range"
      loading={isLoading}
      rows={rows}
      searchKeys={["cidr", "label"]}
      columns={[
        { key: "cidr", header: "CIDR" },
        { key: "label", header: "Label" },
        { key: "scope", header: "Scope", render: (r) => <Pill tone="info">{r.scope || "All users"}</Pill> },
      ]}
      fields={[
        { name: "cidr", label: "CIDR", required: true, placeholder: "103.24.11.0/24" },
        { name: "label", label: "Label", required: true },
        { name: "scope", label: "Scope", type: "select", default: "All users", options: [
          { label: "All users", value: "All users" },
          { label: "Admins only", value: "Admins only" },
          { label: "Mobile only", value: "Mobile only" },
        ] },
      ]}
      onCreate={(v) => create(v as any)}
      onUpdate={(id, v) => update(id, v as any)}
      onDelete={(r) => remove(r.id)}
    />
  );
}

function SignInEvents() {
  const names = useUserNames();
  const { all, isLoading } = useAuditLogs({ limit: 200 });
  const rows = all
    .filter((r) => /login|sign_in|signin|logout|auth/i.test(r.action))
    .map((r) => ({
      id: r.id,
      user: names[r.user_id ?? ""] ?? "—",
      device: r.user_agent?.slice(0, 60) ?? "—",
      lastSeen: fmtTs(r.created_at),
      ip: r.ip ?? "—",
    }));
  return (
    <DataListPage rowActions={false} loading={isLoading} searchKeys={["user", "device"]}
      emptyLabel="No sign-in activity recorded yet"
      columns={[
        { key: "user", header: "User" },
        { key: "device", header: "Device" },
        { key: "lastSeen", header: "Last seen" },
        { key: "ip", header: "IP" },
      ]}
      rows={rows as any}
    />
  );
}

function SecurityPage() {
  return (
    <Tabs defaultValue="password" className="space-y-4">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="password">Password Policy</TabsTrigger>
        <TabsTrigger value="2fa">Two-Factor</TabsTrigger>
        <TabsTrigger value="session">Session</TabsTrigger>
        <TabsTrigger value="ip">Allowed IPs</TabsTrigger>
        <TabsTrigger value="devices">Sign-in Activity</TabsTrigger>
        <TabsTrigger value="sso">SSO / OAuth</TabsTrigger>
      </TabsList>

      <TabsContent value="password">
        <SettingsForm settingsKey="admin.security.password" groups={[
          { title: "Complexity", fields: [
            { name: "min_length", label: "Minimum length", type: "number", default: 12 },
            { name: "require_upper", label: "Require uppercase", type: "switch", default: true },
            { name: "require_number", label: "Require number", type: "switch", default: true },
            { name: "require_symbol", label: "Require symbol", type: "switch", default: true },
            { name: "block_common", label: "Block common passwords", type: "switch", default: true },
          ] },
          { title: "Lifecycle", fields: [
            { name: "expiry_days", label: "Expire after (days)", type: "number", default: 90 },
            { name: "reuse_window", label: "Reuse window (last N)", type: "number", default: 5 },
            { name: "lock_after", label: "Lock after failed attempts", type: "number", default: 5 },
          ] },
        ]} />
      </TabsContent>

      <TabsContent value="2fa">
        <SettingsForm columns={1} settingsKey="admin.security.mfa" groups={[
          { title: "Two-Factor Authentication", fields: [
            { name: "admin_required", label: "Mandatory for Admins", type: "switch", default: true },
            { name: "all_required", label: "Mandatory for all users", type: "switch", default: false },
            { name: "method", label: "Method", type: "select", default: "totp", options: [
              { label: "Authenticator app (TOTP)", value: "totp" },
              { label: "SMS OTP", value: "sms" },
              { label: "Email OTP", value: "email" },
              { label: "WebAuthn / Passkeys", value: "webauthn" },
            ] },
            { name: "trust_days", label: "Trust device (days)", type: "number", default: 30 },
          ] },
        ]} />
      </TabsContent>

      <TabsContent value="session">
        <SettingsForm columns={1} settingsKey="admin.security.session" groups={[
          { title: "Sessions", fields: [
            { name: "idle_minutes", label: "Idle timeout (minutes)", type: "number", default: 30 },
            { name: "absolute_hours", label: "Absolute timeout (hours)", type: "number", default: 12 },
            { name: "single_session", label: "Single active session", type: "switch", default: false },
            { name: "rotate_refresh", label: "Refresh token rotation", type: "switch", default: true },
          ] },
        ]} />
      </TabsContent>

      <TabsContent value="ip"><IpRanges /></TabsContent>
      <TabsContent value="devices"><SignInEvents /></TabsContent>

      <TabsContent value="sso">
        <SettingsForm settingsKey="admin.security.sso" groups={[
          { title: "SSO", fields: [
            { name: "enabled", label: "Enabled", type: "switch", default: false },
            { name: "protocol", label: "Protocol", type: "select", default: "saml", options: [
              { label: "SAML 2.0", value: "saml" }, { label: "OIDC", value: "oidc" },
            ] },
            { name: "provider", label: "Provider", default: "" },
            { name: "entity_id", label: "Entity ID", default: "" },
          ] },
          { title: "OAuth providers", fields: [
            { name: "google", label: "Google", type: "switch", default: true },
            { name: "microsoft", label: "Microsoft", type: "switch", default: false },
            { name: "apple", label: "Apple", type: "switch", default: false },
          ] },
        ]} />
      </TabsContent>
    </Tabs>
  );
}
