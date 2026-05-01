import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, type AppModule } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Boxes, Activity, ShoppingCart, Truck, Factory, Wallet, UserCog, ArrowRight, Lock } from "lucide-react";
const MODULE_META: Record<AppModule, { label: string; icon: typeof Boxes; path: string; desc: string }> = {
  sales: { label: "Sales", icon: ShoppingCart, path: "/app/sales", desc: "Leads, quotations, orders, invoices" },
  procurement: { label: "Procurement", icon: Truck, path: "/app/procurement", desc: "Vendors and purchase orders" },
  inventory: { label: "Inventory", icon: Boxes, path: "/app/inventory", desc: "Stock, warehouses, movements" },
  production: { label: "Production", icon: Factory, path: "/app/production", desc: "Work orders and BOM" },
  finance: { label: "Finance", icon: Wallet, path: "/app/finance", desc: "Payments, ledgers, reports" },
  hr: { label: "HR", icon: UserCog, path: "/app/hr", desc: "Employees and payroll" },
};


export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { profile, company, roles, isSuperAdmin, isCompanyAdmin, loading, canAccessModule } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isSuperAdmin) navigate({ to: "/admin" });
  }, [loading, isSuperAdmin, navigate]);

  if (isSuperAdmin) return null;

  if (!company && !isSuperAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile?.full_name || profile?.email}</h1>
        <p className="mt-3 text-muted-foreground">
          Your account isn't linked to a company yet. A platform administrator needs to assign you.
        </p>
        <div className="mt-6 rounded-md border border-border bg-card p-5">
          <div className="text-sm font-medium">Your user ID</div>
          <code className="mt-1 block text-xs text-muted-foreground break-all">{profile?.id}</code>
          <p className="mt-3 text-xs text-muted-foreground">Share this with your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {isSuperAdmin ? "Platform overview" : company?.name}
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Hello, {profile?.full_name?.split(" ")[0] || "there"}
        </h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {roles.map((r) => (
            <Badge key={r} variant="secondary" className="capitalize">{r.replace("_", " ")}</Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Workspace" value={company?.name ?? "Platform"} icon={Building2} />
        <StatCard label="Plan" value={company?.plan?.toUpperCase() ?? "—"} icon={Activity} />
        <StatCard label="Modules enabled" value={String(company?.enabled_modules?.length ?? 0)} icon={Boxes} />
        <StatCard label="Your roles" value={String(roles.length)} icon={Users} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Enabled modules</CardTitle>
            <Badge variant="outline">{company?.enabled_modules?.length ?? 0} active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!company?.enabled_modules?.length ? (
            <p className="text-sm text-muted-foreground">No modules enabled yet. Ask your admin to enable modules in Company settings.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {company.enabled_modules.map((m) => {
                const meta = MODULE_META[m];
                if (!meta) return null;
                const allowed = canAccessModule(m);
                const Icon = meta.icon;
                const inner = (
                  <div className={`group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors ${allowed ? "hover:border-accent hover:bg-accent/5" : "opacity-60"}`}>
                    <div className="h-10 w-10 rounded-md flex items-center justify-center shrink-0" style={{ background: "var(--gradient-accent)" }}>
                      <Icon className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">{meta.label}</div>
                        {allowed ? (
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{meta.desc}</div>
                      {!allowed && <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">No role access</div>}
                    </div>
                  </div>
                );
                return allowed ? (
                  <Link key={m} to={meta.path}>{inner}</Link>
                ) : (
                  <div key={m}>{inner}</div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          {isSuperAdmin && <p>• Open <span className="text-foreground font-medium">Companies</span> to provision a new tenant.</p>}
          {isCompanyAdmin && <p>• Invite teammates from <span className="text-foreground font-medium">Users & Roles</span>.</p>}
          {isCompanyAdmin && <p>• Toggle modules in <span className="text-foreground font-medium">Company settings</span>.</p>}
          <p>• Pick a module from the sidebar to start working.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Building2 }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight truncate">{value}</div>
      </CardContent>
    </Card>
  );
}