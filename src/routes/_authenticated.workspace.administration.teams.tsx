import { createFileRoute } from "@tanstack/react-router";
import { CrudList } from "@/features/admin/CrudList";
import { Pill } from "@/features/admin/DataListPage";
import { useSettingsCollection, type CollectionRow } from "@/features/admin/admin-api";

export const Route = createFileRoute("/_authenticated/workspace/administration/teams")({
  component: TeamsPage,
});

const SEED: CollectionRow[] = [
  { id: "t1", name: "West Region Sales", lead: "P. Nair", members: 8, scope: "MH, GJ, GA", status: "Active" },
  { id: "t2", name: "South Region Sales", lead: "K. Iyer", members: 6, scope: "KA, TN, KL, AP", status: "Active" },
  { id: "t3", name: "MRO Maintenance", lead: "V. Ramesh", members: 5, scope: "All plants", status: "Active" },
];

function TeamsPage() {
  const { rows, isLoading, create, update, remove } = useSettingsCollection("admin.teams", SEED);
  return (
    <CrudList
      entity="Team"
      loading={isLoading}
      rows={rows}
      searchKeys={["name", "lead", "scope"]}
      columns={[
        { key: "name", header: "Team" },
        { key: "lead", header: "Lead" },
        { key: "members", header: "Members" },
        { key: "scope", header: "Scope" },
        { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Active" ? "success" : "warn"}>{r.status}</Pill> },
      ]}
      fields={[
        { name: "name", label: "Team name", required: true },
        { name: "lead", label: "Team lead" },
        { name: "members", label: "Members", type: "number", default: 0 },
        { name: "scope", label: "Scope" },
        { name: "status", label: "Status", type: "select", default: "Active", options: [{ label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" }] },
      ]}
      onCreate={(v) => create(v as any)}
      onUpdate={(id, v) => update(id, v)}
      onDelete={(r) => remove(r.id)}
    />
  );
}
