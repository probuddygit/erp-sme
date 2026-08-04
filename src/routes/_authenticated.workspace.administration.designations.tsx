import { createFileRoute } from "@tanstack/react-router";
import { CrudList } from "@/features/admin/CrudList";
import { useSettingsCollection, type CollectionRow } from "@/features/admin/admin-api";

export const Route = createFileRoute("/_authenticated/workspace/administration/designations")({
  component: DesignationsPage,
});

const SEED: CollectionRow[] = [
  { id: "g1", title: "Plant Manager", grade: "M3", department: "Manufacturing", reportsTo: "VP – Operations", headcount: 3 },
  { id: "g2", title: "Shift Supervisor", grade: "S1", department: "Manufacturing", reportsTo: "Plant Manager", headcount: 12 },
  { id: "g3", title: "Accounts Executive", grade: "E2", department: "Finance", reportsTo: "Finance Controller", headcount: 6 },
  { id: "g4", title: "Sales Manager", grade: "M3", department: "Sales", reportsTo: "MD", headcount: 4 },
];

function DesignationsPage() {
  const { rows, isLoading, create, update, remove } = useSettingsCollection("admin.designations", SEED);
  return (
    <CrudList
      entity="Designation"
      loading={isLoading}
      rows={rows}
      searchKeys={["title", "grade", "department"]}
      columns={[
        { key: "title", header: "Designation" },
        { key: "grade", header: "Grade" },
        { key: "department", header: "Department" },
        { key: "reportsTo", header: "Reports to" },
        { key: "headcount", header: "Headcount" },
      ]}
      fields={[
        { name: "title", label: "Designation", required: true },
        { name: "grade", label: "Grade" },
        { name: "department", label: "Department" },
        { name: "reportsTo", label: "Reports to" },
        { name: "headcount", label: "Headcount", type: "number", default: 0 },
      ]}
      onCreate={(v) => create(v as any)}
      onUpdate={(id, v) => update(id, v)}
      onDelete={(r) => remove(r.id)}
    />
  );
}
