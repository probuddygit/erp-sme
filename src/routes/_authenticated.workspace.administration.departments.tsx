import { createFileRoute } from "@tanstack/react-router";
import { CrudList } from "@/features/admin/CrudList";
import { useSettingsCollection, type CollectionRow } from "@/features/admin/admin-api";

export const Route = createFileRoute("/_authenticated/workspace/administration/departments")({
  component: DepartmentsPage,
});

const SEED: CollectionRow[] = [
  { id: "d1", code: "MFG", name: "Manufacturing", head: "V. Ramesh", parent: "", members: 68 },
  { id: "d2", code: "QC", name: "Quality Control", head: "N. Kulkarni", parent: "Manufacturing", members: 12 },
  { id: "d3", code: "FIN", name: "Finance & Accounts", head: "R. Mehta", parent: "", members: 8 },
  { id: "d4", code: "SLS", name: "Sales", head: "P. Nair", parent: "", members: 22 },
];

function DepartmentsPage() {
  const { rows, isLoading, create, update, remove } = useSettingsCollection("admin.departments", SEED);
  return (
    <CrudList
      entity="Department"
      loading={isLoading}
      rows={rows}
      searchKeys={["name", "code", "head"]}
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Department" },
        { key: "head", header: "Head" },
        { key: "parent", header: "Parent" },
        { key: "members", header: "Members" },
      ]}
      fields={[
        { name: "code", label: "Code", required: true },
        { name: "name", label: "Department", required: true },
        { name: "head", label: "Head" },
        { name: "parent", label: "Parent department" },
        { name: "members", label: "Members", type: "number", default: 0 },
      ]}
      onCreate={(v) => create(v as any)}
      onUpdate={(id, v) => update(id, v)}
      onDelete={(r) => remove(r.id)}
    />
  );
}
