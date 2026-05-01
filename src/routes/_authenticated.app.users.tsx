import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(["sales"]);

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

  const toggleRole = (r: AppRole) =>
    setSelectedRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (selectedRoles.length === 0) return toast.error("Pick at least one role");
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email,
        password,
        full_name: fullName,
        company_id: company.id,
        roles: selectedRoles,
      },
    });
    setSubmitting(false);
    if (error || (data as { error?: string })?.error) {
      return toast.error((data as { error?: string })?.error ?? error?.message ?? "Failed");
    }
    toast.success(`User ${email} created`);
    setEmail(""); setPassword(""); setFullName(""); setSelectedRoles(["sales"]);
    load();
  };

  const addRole = async (uid: string, r: AppRole) => {
    if (!company) return;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: uid, role: r, company_id: company.id });
    if (error) return toast.error(error.message);
    toast.success("Role added");
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
        <p className="mt-1 text-sm text-muted-foreground">
          Modules available to assign are controlled by your company's enabled modules:{" "}
          <span className="font-medium text-foreground capitalize">
            {company?.enabled_modules?.join(", ") || "none"}
          </span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" /> Create new user
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUser} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Temporary password</Label>
                <Input id="password" type="text" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Roles &amp; module access</Label>
              <div className="flex flex-wrap gap-3 rounded-md border border-border p-3">
                {ASSIGNABLE_ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                    <Checkbox
                      checked={selectedRoles.includes(r)}
                      onCheckedChange={() => toggleRole(r)}
                    />
                    {r}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Each role grants access to its corresponding module. Pick "admin" to grant full tenant administration.
              </p>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create user"}
            </Button>
          </form>
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
                  <TableHead>Add role</TableHead>
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
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ASSIGNABLE_ROLES.filter((r) => !m.roles.includes(r)).map((r) => (
                          <Button key={r} variant="outline" size="sm" className="h-7 px-2 capitalize"
                            onClick={() => addRole(m.id, r)}>
                            +{r}
                          </Button>
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