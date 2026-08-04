import { createFileRoute } from "@tanstack/react-router";
import { CrudList } from "@/features/admin/CrudList";
import { Pill } from "@/features/admin/DataListPage";
import { useCompanyTable } from "@/features/admin/admin-api";

export const Route = createFileRoute("/_authenticated/workspace/administration/branches")({
  component: BranchesPage,
});

interface Branch {
  id: string; name: string; code: string; gstin: string | null; state_code: string | null;
  address: string | null; is_head_office: boolean; is_active: boolean;
}

function BranchesPage() {
  const { rows, isLoading, create, update, remove } = useCompanyTable<Branch>("branches", { orderBy: "name" });

  return (
    <CrudList<Branch>
      entity="Branch"
      loading={isLoading}
      rows={rows}
      searchKeys={["name", "code", "gstin", "state_code"]}
      columns={[
        { key: "name", header: "Branch" },
        { key: "code", header: "Code" },
        { key: "gstin", header: "GSTIN" },
        { key: "state_code", header: "State code" },
        { key: "is_head_office", header: "Type", render: (r) => r.is_head_office ? <Pill tone="info">Head office</Pill> : <Pill>Branch</Pill> },
        { key: "is_active", header: "Status", render: (r) => <Pill tone={r.is_active ? "success" : "warn"}>{r.is_active ? "Active" : "Inactive"}</Pill> },
      ]}
      fields={[
        { name: "name", label: "Branch name", required: true },
        { name: "code", label: "Code", required: true, placeholder: "BLR-01" },
        { name: "gstin", label: "GSTIN" },
        { name: "state_code", label: "State code", placeholder: "29" },
        { name: "address", label: "Address", type: "textarea" },
        { name: "is_head_office", label: "Head office", type: "switch" },
        { name: "is_active", label: "Active", type: "switch", default: true },
      ]}
      onCreate={(v) => create.mutateAsync(v)}
      onUpdate={(id, v) => update.mutateAsync({ id, ...v })}
      onDelete={(r) => remove.mutateAsync(r.id)}
    />
  );
}
