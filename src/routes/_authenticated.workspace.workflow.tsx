import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Workflow as WorkflowIcon, ShieldCheck, GitBranch, Bell,
  AlarmClock, History, FileStack, type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/workflow")({
  component: WorkflowLayout,
});

const TABS: { path: string; label: string; icon: LucideIcon }[] = [
  { path: "/workspace/workflow",                label: "Overview",         icon: LayoutDashboard },
  { path: "/workspace/workflow/designer",       label: "Designer",         icon: WorkflowIcon },
  { path: "/workspace/workflow/approval-rules", label: "Approval Rules",   icon: ShieldCheck },
  { path: "/workspace/workflow/conditional",    label: "Conditional Rules",icon: GitBranch },
  { path: "/workspace/workflow/notifications",  label: "Notifications",    icon: Bell },
  { path: "/workspace/workflow/escalation",     label: "Escalation",       icon: AlarmClock },
  { path: "/workspace/workflow/history",        label: "History",          icon: History },
  { path: "/workspace/workflow/templates",      label: "Templates",        icon: FileStack },
];

function WorkflowLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <PageHeader
        title="Workflow Studio"
        description="Design approval flows, automations, notifications and escalations — with future AI compatibility."
        breadcrumbs={[{ label: "Workspace" }, { label: "Workflow" }]}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.path === "/workspace/workflow" ? pathname === t.path : pathname.startsWith(t.path);
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