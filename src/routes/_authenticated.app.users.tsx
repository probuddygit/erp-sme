import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/users")({
  component: UsersPage,
});

const ASSIGNABLE_ROLES: AppRole[] = ["admin", "sales", "procurement", "production", "finance", "hr"];

interface Member {
  id: string;
  full_name: string | null;
  email: string | null;
  roles: AppRole[];
}

function UsersPage() {
  const { company, isCompanyAdmin, isSuperAdmin } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<AppRole>("sales");

  const load = async () => {
    if (!company) return;
    setLoading(true);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("company_id", company.id);
    const ids = (profs ?? []).map((p) => p.id);
    const { data: rs } = ids.length
      ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as { user_id: string; role: AppRole }[] };
    setMembers(
      (profs ?? []).map((p) => ({
        ...p,
        roles: (rs ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  const assignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ company_id: company.id })
      .eq("id", userId);
    if (pErr) return toast.error(pErr.message);
    const { error: rErr } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role, company_id: company.id });
    if (rErr) return toast.error(rErr.message);
    toast.success("User added to company");
    setUserId("");
    load();
  };

  const removeRole = async (uid: string, r: AppRole) => {
    if (!company) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", uid)
      .eq("role", r)
      .eq("company_id", company.id);
    if (error) return toast.error(error.message);
    toast.success("Role removed");
    load();
  };

  if (!isCompanyAdmin && !isSuperAdmin) {
    return <p className="text-muted-foreground">You don't have permission to manage users.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{company?.name}</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Users & Roles</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" /> Add user to company
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={assignUser} className="grid md:grid-cols-[1fr_200px_auto] gap-3 items-end">
            <div className="space-y-2">
              <Label htmlFor="uid">User ID</Label>
              <Input id="uid" placeholder="Paste signed-up user's ID" value={userId} onChange={(e) => setUserId(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Add</Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Have the user sign up first; they'll see their User ID on the dashboard.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Members ({members.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {m.roles.map((r) => (
                          <Badge key={r} variant="secondary" className="capitalize gap-1">
                            {r}
                            <button onClick={() => removeRole(m.id, r)} className="ml-1 opacity-60 hover:opacity-100">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}