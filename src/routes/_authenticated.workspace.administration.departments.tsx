import { createFileRoute } from "@tanstack/react-router";
import { DataListPage } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/departments")({
  component: () => (
    <DataListPage
      actionLabel="New department"
      searchKeys={["name", "code", "head"]}
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Department" },
        { key: "head", header: "Head" },
        { key: "parent", header: "Parent" },
        { key: "members", header: "Members" },
      ]}
      rows={[
        { id: "1", code: "MFG", name: "Manufacturing", head: "V. Ramesh", parent: "—", members: 68 },
        { id: "2", code: "MFG-A", name: "Assembly Line A", head: "S. Deshpande", parent: "Manufacturing", members: 22 },
        { id: "3", code: "QC", name: "Quality Control", head: "N. Kulkarni", parent: "Manufacturing", members: 12 },
        { id: "4", code: "FIN", name: "Finance & Accounts", head: "R. Mehta", parent: "—", members: 8 },
        { id: "5", code: "SLS", name: "Sales", head: "P. Nair", parent: "—", members: 22 },
        { id: "6", code: "PUR", name: "Procurement", head: "A. Sharma", parent: "—", members: 12 },
        { id: "7", code: "HR", name: "Human Resources", head: "S. Iyer", parent: "—", members: 6 },
        { id: "8", code: "IT", name: "Information Technology", head: "K. Rao", parent: "—", members: 9 },
      ] as any}
    />
  ),
});