import { createFileRoute } from "@tanstack/react-router";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/api-keys")({
  component: () => (
    <DataListPage
      actionLabel="Generate key"
      searchKeys={["name", "prefix", "owner"]}
      columns={[
        { key: "name", header: "Name" },
        { key: "prefix", header: "Key" },
        { key: "scope", header: "Scope", render: (r: any) => <Pill tone="info">{r.scope}</Pill> },
        { key: "owner", header: "Owner" },
        { key: "lastUsed", header: "Last used" },
        { key: "expires", header: "Expires" },
        { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Active" ? "success" : "warn"}>{r.status}</Pill> },
      ]}
      rows={[
        { id: "1", name: "Mobile App", prefix: "sk_live_9f••••3a71", scope: "read", owner: "K. Rao", lastUsed: "2 min ago", expires: "31 Mar 2027", status: "Active" },
        { id: "2", name: "Zapier Automations", prefix: "sk_live_2c••••b104", scope: "read+write", owner: "K. Rao", lastUsed: "1 hour ago", expires: "31 Dec 2026", status: "Active" },
        { id: "3", name: "Warehouse Scanner", prefix: "sk_live_e0••••7f9c", scope: "inventory", owner: "V. Ramesh", lastUsed: "1 day ago", expires: "—", status: "Active" },
        { id: "4", name: "Legacy Ops Script", prefix: "sk_live_1a••••cc02", scope: "read", owner: "Ops Admin", lastUsed: "60 days ago", expires: "Expired", status: "Revoked" },
      ] as any}
    />
  ),
});