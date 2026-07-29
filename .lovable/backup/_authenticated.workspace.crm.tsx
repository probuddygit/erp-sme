import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Users2,
  UserRound,
  Building2,
  ListChecks,
  Trophy,
  BellRing,
  Mail,
  GitCommitHorizontal,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/crm")({
  component: CrmLayout,
});

const TABS: { path: string; label: string; icon: LucideIcon }[] = [
  { path: "/workspace/crm",                label: "Overview",       icon: Users2 },
  { path: "/workspace/crm/leads",          label: "Leads",          icon: Users2 },
  { path: "/workspace/crm/contacts",       label: "Contacts",       icon: UserRound },
  { path: "/workspace/crm/accounts",       label: "Accounts",       icon: Building2 },
  { path: "/workspace/crm/activities",     label: "Activities",     icon: ListChecks },
  { path: "/workspace/crm/opportunities",  label: "Opportunities",  icon: Trophy },
  { path: "/workspace/crm/follow-ups",     label: "Follow Ups",     icon: BellRing },
  { path: "/workspace/crm/email-history",  label: "Email History",  icon: Mail },
  { path: "/workspace/crm/pipeline",       label: "Lead Pipeline",  icon: GitCommitHorizontal },
];

function CrmLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <PageHeader
        title="CRM"
        description="Leads, contacts, and customer relationships."
        breadcrumbs={[{ label: "Workspace" }, { label: "CRM" }]}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.path === "/workspace/crm" ? pathname === t.path : pathname.startsWith(t.path);
          const Icon = t.icon;
          return (
            <Link
              key={t.path}
              to={t.path}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}