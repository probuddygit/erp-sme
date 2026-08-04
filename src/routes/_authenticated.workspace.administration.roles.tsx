import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { DataListPage, Pill } from "@/features/admin/DataListPage";
import { Button } from "@/components/ui/button";
import { useSettingsDoc, exportRowsToCsv } from "@/features/admin/admin-api";
import { ROLE_OPTIONS } from "@/features/admin/roles";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace/administration/roles")({
  component: RolesPage,
});

interface RoleRow { id: string; name: string; type: string; users: number; permissions: number | string }

function RolesPage() {
  const { company } = useAuth();
  const { value: permMap } = useSettingsDoc<Record<string, string[]>>("admin.role_permissions", {});

  const { data: counts = {}, isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["admin-role-counts", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("company_id", company!.id);
      if (error) throw error;
      return (data ?? []).reduce<Record<string, number>>((a, r: any) => ({ ...a, [r.role]: (a[r.role] ?? 0) + 1 }), {});
    },
  });

  const { data: catalogCount = 0 } = useQuery({
    queryKey: ["permissions-count"],
    queryFn: async () => {
      const { count } = await supabase.from("permissions").select("key", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const rows: RoleRow[] = ROLE_OPTIONS.map((r) => ({
    id: r.value,
    name: r.label,
    type: "System",
    users: counts[r.value] ?? 0,
    permissions: permMap[r.value]?.length ?? (r.value === "admin" ? catalogCount : "Default"),
  }));

  return (
    <DataListPage<RoleRow>
      rows={rows}
      loading={isLoading}
      searchKeys={["name"]}
      columns={[
        { key: "name", header: "Role" },
        { key: "type", header: "Type", render: (r) => <Pill tone="info">{r.type}</Pill> },
        { key: "users", header: "Users in company" },
        { key: "permissions", header: "Permissions" },
      ]}
      onExport={() => exportRowsToCsv("roles", rows, [
        { key: "name", header: "Role" }, { key: "users", header: "Users" }, { key: "permissions", header: "Permissions" },
      ])}
      rowExtra={(r) => (
        <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Edit permissions">
          <Link to="/workspace/administration/permissions" search={{ role: r.id } as never}><KeyRound className="h-3.5 w-3.5" /></Link>
        </Button>
      )}
    />
  );
}
