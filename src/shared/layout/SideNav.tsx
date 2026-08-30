import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { modulesForRoles, type ModuleDef } from "@/shared/modules";
import { Cog } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const NAV_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Org Setup", keys: ["administration", "masters", "workflow"] },
  {
    label: "Business Operations",
    keys: ["crm", "sales", "procurement", "inventory", "finance", "gst", "reports"],
  },
];

export function SideNav({ open, onClose }: Props) {
  const { roles, isSuperAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const allModules = modulesForRoles(roles, isSuperAdmin);
  const dashboard = allModules.filter((m) => m.key === "dashboard");
  const grouped = NAV_GROUPS.map((g) => ({
    label: g.label,
    items: g.keys
      .map((k) => allModules.find((m) => m.key === k))
      .filter(Boolean) as ModuleDef[],
  })).filter((g) => g.items.length > 0);
  const ungrouped = allModules.filter(
    (m) => m.key !== "dashboard" && !NAV_GROUPS.some((g) => g.keys.includes(m.key)),
  );

  const isActive = (path: string) =>
    path === "/workspace" ? pathname === "/workspace" : pathname.startsWith(path);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Cog className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Ind Guru ERP
            </div>
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              MSME Cloud
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Modules
          </div>
          <div className="space-y-0.5">
            {modules.map((m) => {
              const active = isActive(m.path);
              const Icon = m.icon;
              return (
                <Link
                  key={m.key}
                  to={m.path}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-sidebar-primary" : "")} />
                  {m.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-4 text-[10px] text-sidebar-foreground/50">
          v1.0 · Multi-tenant SaaS
        </div>
      </aside>
    </>
  );
}