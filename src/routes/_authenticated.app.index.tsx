import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Boxes, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { profile, company, roles, isSuperAdmin, isCompanyAdmin, loading } = useAuth();
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
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          {isSuperAdmin && <p>• Open <span className="text-foreground font-medium">Companies</span> to provision a new tenant.</p>}
          {isCompanyAdmin && <p>• Invite teammates from <span className="text-foreground font-medium">Users & Roles</span>.</p>}
          {isCompanyAdmin && <p>• Toggle modules in <span className="text-foreground font-medium">Company settings</span>.</p>}
          <p>• Pick a module from the left sidebar to start working.</p>
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