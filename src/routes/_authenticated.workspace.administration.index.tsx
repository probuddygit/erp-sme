import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { ADMIN_NAV, ADMIN_GROUPS } from "@/features/admin/nav";
import { Users, Building2, Shield, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

function useAdminKpis() {
  const { company, organization } = useAuth();
  return useQuery({
    enabled: !!company?.id,
    queryKey: ["admin-overview-kpis", company?.id, organization?.id],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [users, companies, roles, events] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", company!.id),
        organization?.id
          ? supabase.from("companies").select("id", { count: "exact", head: true }).eq("organization_id", organization.id)
          : supabase.from("companies").select("id", { count: "exact", head: true }).eq("id", company!.id),
        supabase.from("user_roles").select("role").eq("company_id", company!.id),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }).eq("company_id", company!.id).gte("created_at", since),
      ]);
      const distinctRoles = new Set((roles.data ?? []).map((r: any) => r.role)).size;
      return {
        users: users.count ?? 0,
        companies: companies.count ?? 0,
        roles: distinctRoles,
        events: events.count ?? 0,
      };
    },
  });
}

export const Route = createFileRoute("/_authenticated/workspace/administration/")({
  component: AdminOverview,
});

function AdminOverview() {
  const items = ADMIN_NAV.filter((n) => n.key !== "overview");
  const { data, isLoading } = useAdminKpis();
  const KPIS = [
    { label: "Active users", value: data?.users, icon: Users, tone: "text-blue-500" },
    { label: "Companies", value: data?.companies, icon: Building2, tone: "text-emerald-500" },
    { label: "Roles in use", value: data?.roles, icon: Shield, tone: "text-violet-500" },
    { label: "Events (24h)", value: data?.events, icon: Activity, tone: "text-amber-500" },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={"flex h-10 w-10 items-center justify-center rounded-md bg-muted " + k.tone}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
                  <div className="text-xl font-semibold">{isLoading ? "…" : (k.value ?? 0).toLocaleString("en-IN")}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {ADMIN_GROUPS.map((g) => {
        const rows = items.filter((i) => i.group === g);
        if (!rows.length) return null;
        return (
          <section key={g}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => {
                const Icon = r.icon;
                return (
                  <Link key={r.key} to={r.to} className="group">
                    <Card className="h-full transition-colors hover:border-primary/40">
                      <CardContent className="flex items-start gap-3 p-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold group-hover:text-primary">{r.label}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{r.description}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}