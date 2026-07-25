import { createFileRoute } from "@tanstack/react-router";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/companies")({
  component: () => (
    <DataListPage
      actionLabel="New company"
      searchKeys={["name", "gstin", "state"]}
      columns={[
        { key: "name", header: "Company" },
        { key: "gstin", header: "GSTIN" },
        { key: "state", header: "State" },
        { key: "plan", header: "Plan", render: (r: any) => <Pill tone="info">{r.plan}</Pill> },
        { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Active" ? "success" : "warn"}>{r.status}</Pill> },
      ]}
      rows={[
        { id: "1", name: "Ind Guru Enterprises", gstin: "27AAACI1234H1ZV", state: "Maharashtra", plan: "Enterprise", status: "Active" },
        { id: "2", name: "Guru Auto", gstin: "29AAACG5678K1Z9", state: "Karnataka", plan: "Pro", status: "Active" },
        { id: "3", name: "John Auto Components", gstin: "33AAACJ9012L1ZQ", state: "Tamil Nadu", plan: "Starter", status: "Active" },
      ] as any}
    />
  ),
});