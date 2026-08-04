import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CrudList } from "@/features/admin/CrudList";
import { Pill } from "@/features/admin/DataListPage";
import { createCompany } from "@/features/org/company.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workspace/administration/companies")({
  component: CompaniesPage,
});

interface Company {
  id: string; name: string; legal_name: string | null; gstin: string | null; pan: string | null;
  state_code: string | null; currency: string | null; plan: string; is_active: boolean; address: string | null;
}

function CompaniesPage() {
  const { organization, company, isSuperAdmin, refresh } = useAuth();
  const qc = useQueryClient();
  const addCompany = useServerFn(createCompany);
  const queryKey = ["admin-companies", organization?.id ?? company?.id];

  const { data: rows = [], isLoading } = useQuery({
    enabled: !!(organization?.id || company?.id),
    queryKey,
    queryFn: async () => {
      let q = supabase.from("companies").select("*").order("name");
      if (organization?.id) q = q.eq("organization_id", organization.id);
      else if (!isSuperAdmin && company?.id) q = q.eq("id", company.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Company[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Record<string, any> & { id: string }) => {
      const { error } = await supabase.from("companies").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); refresh(); toast.success("Company updated"); },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  const deactivate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success("Company deactivated"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <CrudList<Company>
      entity="Company"
      actionLabel="New company"
      loading={isLoading}
      rows={rows}
      searchKeys={["name", "gstin", "state_code", "legal_name"]}
      columns={[
        { key: "name", header: "Company" },
        { key: "legal_name", header: "Legal name" },
        { key: "gstin", header: "GSTIN" },
        { key: "state_code", header: "State" },
        { key: "plan", header: "Plan", render: (r) => <Pill tone="info">{r.plan}</Pill> },
        { key: "is_active", header: "Status", render: (r) => <Pill tone={r.is_active ? "success" : "warn"}>{r.is_active ? "Active" : "Inactive"}</Pill> },
      ]}
      fields={[
        { name: "name", label: "Company name", required: true },
        { name: "legal_name", label: "Legal name" },
        { name: "gstin", label: "GSTIN" },
        { name: "pan", label: "PAN" },
        { name: "state_code", label: "State code", placeholder: "27" },
        { name: "currency", label: "Currency", default: "INR" },
        { name: "address", label: "Address", type: "textarea" },
      ]}
      onCreate={async (v) => {
        if (!organization?.id) { toast.error("No organization found for this account"); return; }
        await addCompany({ data: { organization_id: organization.id, ...(v as any) } });
        qc.invalidateQueries({ queryKey });
        await refresh();
        toast.success("Company created");
      }}
      onUpdate={(id, v) => update.mutateAsync({ id, ...v })}
      onDelete={(r) => deactivate.mutateAsync(r.id)}
    />
  );
}
