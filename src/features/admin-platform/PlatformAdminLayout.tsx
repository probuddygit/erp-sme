import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PLATFORM_NAV } from "./nav";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Shield } from "lucide-react";

export function PlatformAdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const current = useMemo(
    () =>
      PLATFORM_NAV.find((n) => (n.to === "/admin" ? pathname === n.to : pathname.startsWith(n.to))) ??
      PLATFORM_NAV[0],
    [pathname],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            Platform Operator
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{current.label}</h1>
          <p className="text-sm text-muted-foreground mt-1">{current.description}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <nav className="space-y-1 pb-6">
            {PLATFORM_NAV.map((i) => {
              const Icon = i.icon;
              const active = i.to === "/admin" ? pathname === i.to : pathname.startsWith(i.to);
              return (
                <Link
                  key={i.key}
                  to={i.to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{i.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
