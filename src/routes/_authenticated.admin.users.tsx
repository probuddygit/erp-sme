import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AllUsers,
});

interface Row {
  id: string; full_name: string | null; email: string | null;
  company_id: string | null; company_name: string | null; roles: AppRole[];
}

function AllUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: cos }, { data: rs }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, company_id"),
      supabase.from("companies").select("id, name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setCompanies(cos ?? []);
    const coMap = new Map((cos ?? []).map((c) => [c.id, c.name]));
    setRows((profs ?? []).map((p) => ({
      ...p,
      company_name: p.company_id ? coMap.get(p.company_id) ?? null : null,
      roles: (rs ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole),
    })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const assignCompany = async (uid: string, cid: string) => {
    const { error } = await supabase.from("profiles").update({ company_id: cid || null }).eq("id", uid);
    if (error) return toast.error(error.message);
    toast.success("Company updated"); load();
  };
  const makeSuperAdmin = async (uid: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "super_admin", company_id: null });
    if (error) return toast.error(error.message);
    toast.success("Granted super admin"); load();
  };
  const makeCompanyAdmin = async (uid: string, cid: string | null) => {
    if (!cid) return toast.error("Assign a company first");
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin", company_id: cid });
    if (error) return toast.error(error.message);
    toast.success("Granted company admin"); load();
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Super Admin</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">All Users</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Users ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Company</TableHead><TableHead>Roles</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.email}</TableCell>
                    <TableCell>
                      <Select value={r.company_id ?? "none"} onValueChange={(v) => assignCompany(r.id, v === "none" ? "" : v)}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Unassigned —</SelectItem>
                          {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.roles.length === 0 ? <span className="text-xs text-muted-foreground">none</span> : r.roles.map((x) => (
                          <Badge key={x} variant="secondary" className="capitalize">{x.replace("_", " ")}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {r.company_id && !r.roles.includes("admin") && (
                          <Button variant="outline" size="sm" onClick={() => makeCompanyAdmin(r.id, r.company_id)}>
                            Make company admin
                          </Button>
                        )}
                        {!r.roles.includes("super_admin") && (
                          <Button variant="outline" size="sm" onClick={() => makeSuperAdmin(r.id)}>
                            Make super admin
                          </Button>
                        )}
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