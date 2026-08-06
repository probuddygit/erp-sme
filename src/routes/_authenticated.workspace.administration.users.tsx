import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { DataListPage, Pill } from "@/features/admin/DataListPage";
import { RecordFormDialog } from "@/features/admin/CrudList";
import { exportRowsToCsv } from "@/features/admin/admin-api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createInvitation, listInvitations, revokeInvitation } from "@/features/org/invitation.functions";
import { toast } from "sonner";
import { Shield, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace/administration/users")({
  component: UsersAdminPage,
});

const ROLES: AppRole[] = ["admin", "manager", "viewer", "sales", "procurement", "production", "finance", "hr", "quality", "maintenance"];

interface Member { id: string; full_name: string | null; email: string | null; roles: AppRole[] }

function MembersTab() {
  const { company } = useAuth();
  const qc = useQueryClient();
  const [roleFor, setRoleFor] = useState<Member | null>(null);
  const queryKey = ["admin-members", company?.id];

  const { data: rows = [], isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey,
    queryFn: async () => {
      const { data: profs, error } = await supabase
        .from("profiles").select("id, full_name, email").eq("company_id", company!.id);
      if (error) throw error;
      const ids = (profs ?? []).map((p) => p.id);
      const { data: rs } = ids.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : { data: [] as { user_id: string; role: AppRole }[] };
      return (profs ?? []).map((p) => ({
        ...p,
        roles: (rs ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole),
      })) as Member[];
    },
  });

  const setRoles = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: AppRole[] }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("company_id", company!.id);
      if (delErr) throw delErr;
      if (roles.length) {
        const { error } = await supabase.from("user_roles")
          .insert(roles.map((r) => ({ user_id: userId, role: r, company_id: company!.id })));
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success("Roles updated"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const detach = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ company_id: null }).eq("id", userId);
      if (error) throw error;
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("company_id", company!.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success("User removed from company"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <>
      <DataListPage<Member>
        rows={rows}
        loading={isLoading}
        searchKeys={["full_name", "email"]}
        emptyLabel="No users in this company yet"
        onExport={() => exportRowsToCsv("users", rows.map((r) => ({ ...r, roles: r.roles.join(" / ") })), [
          { key: "full_name", header: "Name" }, { key: "email", header: "Email" }, { key: "roles", header: "Roles" },
        ])}
        columns={[
          {
            key: "full_name", header: "User",
            render: (r) => (
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{(r.full_name || r.email || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{r.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </div>
              </div>
            ),
          },
          {
            key: "roles", header: "Roles",
            render: (r) => r.roles.length
              ? <div className="flex flex-wrap gap-1">{r.roles.map((x) => <Badge key={x} variant="secondary" className="capitalize">{x}</Badge>)}</div>
              : <span className="text-muted-foreground">No role</span>,
          },
          { key: "status", header: "Status", render: (r) => <Pill tone={r.roles.length ? "success" : "warn"}>{r.roles.length ? "Active" : "Pending role"}</Pill> },
        ]}
        rowExtra={(r) => (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Manage roles" onClick={() => setRoleFor(r)}>
            <Shield className="h-3.5 w-3.5" />
          </Button>
        )}
        onDelete={(r) => detach.mutate(r.id)}
        rowActions
      />

      <RecordFormDialog
        open={!!roleFor}
        onOpenChange={(v) => !v && setRoleFor(null)}
        title={`Roles — ${roleFor?.full_name || roleFor?.email || ""}`}
        description="Each role unlocks its module for this user in the current company."
        fields={ROLES.map((r) => ({ name: r, label: r.charAt(0).toUpperCase() + r.slice(1), type: "switch" as const }))}
        initial={roleFor ? Object.fromEntries([["id", roleFor.id], ...ROLES.map((r) => [r, roleFor.roles.includes(r)])]) : null}
        onSubmit={async (values) => {
          if (!roleFor) return;
          await setRoles.mutateAsync({ userId: roleFor.id, roles: ROLES.filter((r) => values[r]) });
          setRoleFor(null);
        }}
      />
    </>
  );
}

function InvitesTab() {
  const { company, organization } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const invite = useServerFn(createInvitation);
  const list = useServerFn(listInvitations);
  const revoke = useServerFn(revokeInvitation);

  const { data: rows = [], isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["admin-invites", company?.id],
    queryFn: async () => (await list({ data: { company_id: company!.id } })) as any[],
  });

  return (
    <>
      <DataListPage<any>
        rows={rows}
        loading={isLoading}
        searchKeys={["email", "role", "status"]}
        actionLabel="Invite user"
        emptyLabel="No pending invitations"
        onAction={() => setOpen(true)}
        onExport={() => exportRowsToCsv("invitations", rows, [
          { key: "email", header: "Email" }, { key: "role", header: "Role" }, { key: "status", header: "Status" },
        ])}
        columns={[
          { key: "email", header: "Email" },
          { key: "role", header: "Role", render: (r) => <Pill tone="info">{r.role}</Pill> },
          { key: "status", header: "Status", render: (r) => <Pill tone={r.status === "accepted" ? "success" : r.status === "pending" ? "warn" : "danger"}>{r.status}</Pill> },
          { key: "expires_at", header: "Expires", render: (r) => r.expires_at ? new Date(r.expires_at).toLocaleDateString("en-IN") : "—" },
        ]}
        rowExtra={(r) => r.status === "pending" ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Revoke"
            onClick={async () => { await revoke({ data: { id: r.id } }); qc.invalidateQueries({ queryKey: ["admin-invites", company?.id] }); toast.success("Invitation revoked"); }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      />

      <RecordFormDialog
        open={open}
        onOpenChange={setOpen}
        title="Invite user"
        description="An invitation link is generated for the email address below."
        fields={[
          { name: "email", label: "Email", type: "email", required: true },
          { name: "role", label: "Role", type: "select", required: true, default: "sales", options: ROLES.map((r) => ({ label: r, value: r })) },
        ]}
        submitLabel="Send invite"
        onSubmit={async (v) => {
          if (!company?.id || !organization?.id) { toast.error("Company/organization missing"); return; }
          const res: any = await invite({ data: { email: v.email, role: v.role, company_id: company.id, organization_id: organization.id } });
          qc.invalidateQueries({ queryKey: ["admin-invites", company?.id] });
          const link = `${window.location.origin}/auth?invite=${res.token}`;
          await navigator.clipboard?.writeText(link).catch(() => {});
          toast.success("Invitation created — link copied to clipboard");
        }}
      />
    </>
  );
}

function UsersAdminPage() {
  return (
    <Tabs defaultValue="members" className="space-y-4">
      <TabsList>
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="invites">Invitations</TabsTrigger>
      </TabsList>
      <TabsContent value="members"><MembersTab /></TabsContent>
      <TabsContent value="invites"><InvitesTab /></TabsContent>
    </Tabs>
  );
}
