import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Building2 } from "lucide-react";
import type { AppModule } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminCompanies,
});

const PLANS = ["trial", "starter", "pro", "enterprise"] as const;
const ALL_MODULES: AppModule[] = ["sales", "procurement", "inventory", "production", "finance", "hr", "reports", "quality"];

interface Co {
  id: string; name: string; slug: string; plan: string; is_active: boolean; enabled_modules: AppModule[];
}

function AdminCompanies() {
  const [companies, setCompanies] = useState<Co[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState<typeof PLANS[number]>("trial");
  const [open, setOpen] = useState(false);
  const [adminFullName, setAdminFullName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
    setCompanies((data ?? []) as Co[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword.length < 8) return toast.error("Password must be at least 8 characters");
    setSubmitting(true);
    const { data: co, error } = await supabase
      .from("companies")
      .insert({ name, slug, plan: plan as typeof PLANS[number] })
      .select("id")
      .single();
    if (error || !co) {
      setSubmitting(false);
      return toast.error(error?.message ?? "Failed to create company");
    }
    const { data: fnRes, error: fnErr } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: adminEmail,
        username: adminUsername || null,
        password: adminPassword,
        full_name: adminFullName,
        company_id: co.id,
        roles: ["admin"],
      },
    });
    setSubmitting(false);
    const fnError = (fnRes as { error?: string })?.error ?? fnErr?.message;
    if (fnError) {
      toast.error(`Company created but admin user failed: ${fnError}`);
    } else {
      toast.success("Company and admin user created");
    }
    setName(""); setSlug(""); setPlan("trial");
    setAdminFullName(""); setAdminUsername(""); setAdminEmail(""); setAdminPassword("");
    setOpen(false); load();
  };
  const updatePlan = async (id: string, p: string) => {
    const { error } = await supabase.from("companies").update({ plan: p as typeof PLANS[number] }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  const toggleActive = async (id: string, on: boolean) => {
    const { error } = await supabase.from("companies").update({ is_active: on }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  const toggleModule = async (co: Co, m: AppModule, on: boolean) => {
    const next = on ? [...co.enabled_modules, m] : co.enabled_modules.filter((x) => x !== m);
    const { error } = await supabase.from("companies").update({ enabled_modules: next }).eq("id", co.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Super Admin</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">Provision tenants, set plans, toggle modules.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New company</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create company</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} required /></div>
              <div className="space-y-2"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Plan</Label>
                <Select value={plan} onValueChange={(v) => setPlan(v as typeof PLANS[number])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="pt-2 border-t border-border">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Company Admin</div>
                <div className="space-y-3">
                  <div className="space-y-2"><Label>Full name</Label>
                    <Input value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Username</Label>
                    <Input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} placeholder="optional" /></div>
                  <div className="space-y-2"><Label>Email</Label>
                    <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Password</Label>
                    <Input type="password" minLength={8} value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required /></div>
                  <p className="text-xs text-muted-foreground">Role: <span className="font-medium text-foreground">admin</span> (full tenant administration)</p>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Creating…" : "Create company & admin"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5"><div className="text-xs uppercase tracking-widest text-muted-foreground">Companies</div><div className="mt-2 text-2xl font-bold">{companies.length}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-xs uppercase tracking-widest text-muted-foreground">Active</div><div className="mt-2 text-2xl font-bold">{companies.filter(c => c.is_active).length}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-xs uppercase tracking-widest text-muted-foreground">Paid plans</div><div className="mt-2 text-2xl font-bold">{companies.filter(c => c.plan !== "trial").length}</div></CardContent></Card>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : companies.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 font-medium">No companies yet</p>
          <p className="text-sm text-muted-foreground">Create your first tenant to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {companies.map((co) => (
            <Card key={co.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div><CardTitle className="text-lg">{co.name}</CardTitle><div className="text-xs text-muted-foreground mt-1">/{co.slug}</div></div>
                  <div className="flex items-center gap-3">
                    <Badge variant={co.is_active ? "default" : "secondary"}>{co.is_active ? "Active" : "Disabled"}</Badge>
                    <Switch checked={co.is_active} onCheckedChange={(v) => toggleActive(co.id, v)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label className="text-xs w-16">Plan</Label>
                  <Select value={co.plan} onValueChange={(v) => updatePlan(co.id, v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Modules</div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_MODULES.map((m) => {
                      const on = co.enabled_modules?.includes(m);
                      return (
                        <button key={m} onClick={() => toggleModule(co, m, !on)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize border transition-colors ${on ? "bg-accent text-accent-foreground border-accent" : "bg-muted text-muted-foreground border-border hover:border-accent"}`}>
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}