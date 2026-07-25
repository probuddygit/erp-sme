import { createFileRoute } from "@tanstack/react-router";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/roles")({
  component: () => (
    <DataListPage
      actionLabel="New role"
      searchKeys={["name"]}
      columns={[
        { key: "name", header: "Role" },
        { key: "type", header: "Type", render: (r: any) => <Pill tone={r.type === "System" ? "info" : "default"}>{r.type}</Pill> },
        { key: "users", header: "Users" },
        { key: "permissions", header: "Permissions" },
        { key: "updated", header: "Updated" },
      ]}
      rows={[
        { id: "1", name: "Super Admin", type: "System", users: 1, permissions: "All", updated: "—" },
        { id: "2", name: "Administrator", type: "System", users: 3, permissions: 128, updated: "12 Jul 2026" },
        { id: "3", name: "Finance", type: "System", users: 8, permissions: 42, updated: "18 Jul 2026" },
        { id: "4", name: "Sales", type: "System", users: 22, permissions: 36, updated: "18 Jul 2026" },
        { id: "5", name: "Purchase", type: "System", users: 12, permissions: 34, updated: "18 Jul 2026" },
        { id: "6", name: "Inventory", type: "System", users: 9, permissions: 28, updated: "18 Jul 2026" },
        { id: "7", name: "Warehouse", type: "System", users: 6, permissions: 22, updated: "18 Jul 2026" },
        { id: "8", name: "Management", type: "System", users: 4, permissions: 60, updated: "18 Jul 2026" },
        { id: "9", name: "Plant Manager – Pune", type: "Custom", users: 2, permissions: 48, updated: "20 Jul 2026" },
        { id: "10", name: "Auditor (Read-only)", type: "Custom", users: 1, permissions: 96, updated: "22 Jul 2026" },
      ] as any}
    />
  ),
});