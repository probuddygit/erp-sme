import { createFileRoute } from "@tanstack/react-router";
import { DataListPage, Pill } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/branches")({
  component: () => (
    <DataListPage
      actionLabel="New branch"
      searchKeys={["name", "code", "city"]}
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Branch" },
        { key: "company", header: "Company" },
        { key: "city", header: "City" },
        { key: "gstin", header: "GSTIN" },
        { key: "warehouses", header: "Warehouses" },
        { key: "users", header: "Users" },
        { key: "flag", header: "", render: (r: any) => r.head ? <Pill tone="info">Head office</Pill> : null },
      ]}
      rows={[
        { id: "1", code: "PNQ-HO", name: "Pune Head Office", company: "Ind Guru", city: "Pune", gstin: "27AAACI1234H1ZV", warehouses: 3, users: 42, head: true },
        { id: "2", code: "BLR-01", name: "Bengaluru Plant", company: "Guru Auto", city: "Bengaluru", gstin: "29AAACG5678K1Z9", warehouses: 2, users: 28, head: false },
        { id: "3", code: "MAA-01", name: "Chennai Branch", company: "John Auto", city: "Chennai", gstin: "33AAACJ9012L1ZQ", warehouses: 1, users: 14, head: false },
      ] as any}
    />
  ),
});