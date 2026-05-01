import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppModule } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/company")({
  component: CompanyPage,
});

const ALL_MODULES: AppModule[] = ["sales", "procurement", "inventory", "production", "finance", "hr"];

function CompanyPage() {
  const { company, isCompanyAdmin, isSuperAdmin, refresh } = useAuth();
  const [mods, setMods] = useState<AppModule[]>(company?.enabled_modules ?? []);

  useEffect(() => {
    setMods(company?.enabled_modules ?? []);
  }, [company?.id, company?.enabled_modules]);

  if (!company) return <p className="text-muted-foreground">No company assigned.</p>;
  if (!isCompanyAdmin && !isSuperAdmin) return <p className="text-muted-foreground">Admin access required.</p>;

  const toggle = async (m: AppModule, on: boolean) => {
    const next = on ? [...mods, m] : mods.filter((x) => x !== m);
    setMods(next);
    const { error } = await supabase.from("companies").update({ enabled_modules: next }).eq("id", company.id);
    if (error) {
      toast.error(error.message);
      setMods(mods);
    } else {
      toast.success(`${m} ${on ? "enabled" : "disabled"}`);
      refresh();
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Settings</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{company.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">Plan: <span className="font-medium uppercase">{company.plan}</span></p>
      </div>

      <Card>
        <CardHeader><CardTitle>Modules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {ALL_MODULES.map((m) => (
            <div key={m} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
              <Label htmlFor={`m-${m}`} className="capitalize text-base">{m}</Label>
              <Switch id={`m-${m}`} checked={mods.includes(m)} onCheckedChange={(v) => toggle(m, v)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}