import { createFileRoute } from "@tanstack/react-router";
import { CrudList } from "@/features/admin/CrudList";
import { Pill } from "@/features/admin/DataListPage";
import { useSettingsCollection, type CollectionRow } from "@/features/admin/admin-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workspace/administration/api-keys")({
  component: ApiKeysPage,
});

function randomKey() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return "sk_live_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ApiKeysPage() {
  const { rows, isLoading, create, update, remove } = useSettingsCollection<CollectionRow>("admin.api_keys", []);
  return (
    <CrudList
      entity="API key"
      actionLabel="Generate key"
      loading={isLoading}
      rows={rows}
      searchKeys={["name", "masked", "owner"]}
      columns={[
        { key: "name", header: "Name" },
        { key: "masked", header: "Key" },
        { key: "scope", header: "Scope", render: (r: any) => <Pill tone="info">{r.scope}</Pill> },
        { key: "owner", header: "Owner" },
        { key: "created", header: "Created", render: (r: any) => r.created ? new Date(r.created).toLocaleDateString("en-IN") : "—" },
        { key: "expires", header: "Expires", render: (r: any) => r.expires || "—" },
        { key: "status", header: "Status", render: (r: any) => <Pill tone={r.status === "Active" ? "success" : "danger"}>{r.status}</Pill> },
      ]}
      fields={[
        { name: "name", label: "Key name", required: true },
        { name: "scope", label: "Scope", type: "select", default: "read", options: ["read", "read+write", "inventory", "sales", "finance"].map((v) => ({ label: v, value: v })) },
        { name: "owner", label: "Owner" },
        { name: "expires", label: "Expires on", type: "date" },
        { name: "status", label: "Status", type: "select", default: "Active", options: ["Active", "Revoked"].map((v) => ({ label: v, value: v })) },
      ]}
      onCreate={async (v) => {
        const key = randomKey();
        await create({ ...v, masked: `${key.slice(0, 12)}••••${key.slice(-4)}`, created: new Date().toISOString() } as any);
        await navigator.clipboard?.writeText(key).catch(() => {});
        toast.success("Key generated and copied — it will not be shown again", { description: key, duration: 12000 });
      }}
      onUpdate={(id, v) => update(id, v)}
      onDelete={(r: any) => remove(r.id)}
    />
  );
}
