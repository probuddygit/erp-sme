import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/shared/components/PageHeader";
import { MASTERS } from "@/features/masters/registry";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/masters")({
  component: MastersLayout,
});

function MastersLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <PageHeader
        title="Master Data"
        description="Centralised reference data used across the platform."
        breadcrumbs={[{ label: "Workspace" }, { label: "Master Data" }]}
      />
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          to="/workspace/masters"
          className={cn(
            "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
            pathname === "/workspace/masters"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card hover:bg-muted",
          )}
        >
          Overview
        </Link>
        {MASTERS.map((m) => {
          const path = `/workspace/masters/${m.key}`;
          const active = pathname === path;
          const Icon = m.icon;
          return (
            <Link
              key={m.key}
              to={path}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}