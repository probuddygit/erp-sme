import { createFileRoute } from "@tanstack/react-router";
import { DataListPage } from "@/features/admin/DataListPage";

export const Route = createFileRoute("/_authenticated/workspace/administration/designations")({
  component: () => (
    <DataListPage
      actionLabel="New designation"
      searchKeys={["title", "grade", "department"]}
      columns={[
        { key: "title", header: "Designation" },
        { key: "grade", header: "Grade" },
        { key: "department", header: "Department" },
        { key: "reportsTo", header: "Reports to" },
        { key: "headcount", header: "Headcount" },
      ]}
      rows={[
        { id: "1", title: "Managing Director", grade: "M1", department: "Executive", reportsTo: "Board", headcount: 1 },
        { id: "2", title: "VP – Operations", grade: "M2", department: "Manufacturing", reportsTo: "MD", headcount: 1 },
        { id: "3", title: "Plant Manager", grade: "M3", department: "Manufacturing", reportsTo: "VP – Operations", headcount: 3 },
        { id: "4", title: "Shift Supervisor", grade: "S1", department: "Manufacturing", reportsTo: "Plant Manager", headcount: 12 },
        { id: "5", title: "Finance Controller", grade: "M3", department: "Finance", reportsTo: "MD", headcount: 1 },
        { id: "6", title: "Accounts Executive", grade: "E2", department: "Finance", reportsTo: "Finance Controller", headcount: 6 },
        { id: "7", title: "Sales Manager", grade: "M3", department: "Sales", reportsTo: "MD", headcount: 4 },
        { id: "8", title: "Purchase Officer", grade: "E2", department: "Procurement", reportsTo: "Head – Procurement", headcount: 8 },
      ] as any}
    />
  ),
});