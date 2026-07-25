import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { ADMIN_NAV, ADMIN_GROUPS } from "@/features/admin/nav";
import { Users, Building2, Shield, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace/administration/")({
  component: AdminOverview,
});

const KPIS = [
  { label: "Active users", value: "128", icon: Users, tone: "text-blue-500" },
  { label: "Companies", value: "3", icon: Building2, tone: "text-emerald-500" },
  { label: "Roles", value: "12", icon: Shield, tone: "text-violet-500" },
  { label: "Events (24h)", value: "1,842", icon: Activity, tone: "text-amber-500" },
];

function AdminOverview() {
  const items = ADMIN_NAV.filter((n) => n.key !== "overview");
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
                  <div className="text-xl font-semibold">{k.value}</div>
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