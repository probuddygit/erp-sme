import { createFileRoute } from "@tanstack/react-router";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/teams")({
  component: () => (
    <DataListPage
      actionLabel="New team"
      searchKeys={["name", "lead"]}
      columns={[
        { key: "name", header: "Team" },
        { key: "lead", header: "Lead" },
        { key: "members", header: "Members" },
        { key: "scope", header: "Scope" },
        { key: "status", header: "Status", render: (r: any) => <Pill tone="success">{r.status}</Pill> },
      ]}
      rows={[
        { id: "1", name: "West Region Sales", lead: "P. Nair", members: 8, scope: "MH, GJ, GA", status: "Active" },
        { id: "2", name: "South Region Sales", lead: "K. Iyer", members: 6, scope: "KA, TN, KL, AP", status: "Active" },
        { id: "3", name: "Import Procurement", lead: "A. Sharma", members: 4, scope: "APAC vendors", status: "Active" },
        { id: "4", name: "MRO Maintenance", lead: "V. Ramesh", members: 5, scope: "All plants", status: "Active" },
        { id: "5", name: "Digital Transformation", lead: "K. Rao", members: 7, scope: "Cross-functional", status: "Active" },
      ] as any}
    />
  ),
});