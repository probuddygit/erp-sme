import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ADMIN_NAV, ADMIN_GROUPS } from "./nav";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/shared/components/PageHeader";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");

  const current = useMemo(
    () =>
      ADMIN_NAV.find((n) => (n.to === "/workspace/administration" ? pathname === n.to : pathname.startsWith(n.to))) ??
      ADMIN_NAV[0],
    [pathname],
  );

  const grouped = useMemo(() => {
    const s = q.toLowerCase();
    return ADMIN_GROUPS.map((g) => ({
      group: g,
      items: ADMIN_NAV.filter((i) => i.group === g && (!s || i.label.toLowerCase().includes(s))),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  return (
    <div>
      <PageHeader
        title={current.label}
        description={current.description}
        breadcrumbs={[{ label: "Workspace" }, { label: "Administration" }, ...(current.key !== "overview" ? [{ label: current.label }] : [])]}
      />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search settings…" className="h-9 pl-8" />
          </div>
          <nav className="space-y-4 pb-6">
            {grouped.map((g) => (
              <div key={g.group}>
                <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.group}
                </div>
                <ul className="space-y-0.5">
                  {g.items.map((i) => {
                    const Icon = i.icon;
                    const active =
                      i.to === "/workspace/administration"
                        ? pathname === i.to
                        : pathname.startsWith(i.to);
                    return (
                      <li key={i.key}>
                        <Link
                          to={i.to}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                            active
                              ? "bg-accent text-accent-foreground font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="truncate">{i.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}