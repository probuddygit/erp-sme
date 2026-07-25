import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ChevronRight, BarChart3 } from "lucide-react";
import { REPORT_CATEGORIES } from "../data";

export function ReportsSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) =>
    path === "/workspace/reports" ? pathname === "/workspace/reports" : pathname.startsWith(path);

  return (
    <aside className="w-full shrink-0 md:w-64">
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Reports</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">BI Portal</div>
          </div>
        </div>
        <nav className="p-2">
          <Link
            to="/workspace/reports"
            className={cn(
              "group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
              pathname === "/workspace/reports"
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground/80 hover:bg-muted",
            )}
          >
            <span className="flex items-center gap-2.5">
              <BarChart3 className="h-4 w-4" /> Overview
            </span>
            <ChevronRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
          </Link>
          <div className="mt-2 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </div>
          <div className="space-y-0.5">
            {REPORT_CATEGORIES.map((c) => {
              const path = `/workspace/reports/${c.key}`;
              const active = isActive(path);
              const Icon = c.icon;
              return (
                <Link
                  key={c.key}
                  to={path as any}
                  className={cn(
                    "group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/80 hover:bg-muted",
                  )}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="truncate">{c.label}</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
}