import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShoppingCart,
  Truck,
  Boxes,
  Factory,
  Wallet,
  UserCog,
  LogOut,
  Menu,
  Cog,
  Settings,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { useAuth, type AppModule } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const MODULES: { key: AppModule; label: string; icon: typeof ShoppingCart; path: string }[] = [
  { key: "sales", label: "Sales", icon: ShoppingCart, path: "/app/sales" },
  { key: "procurement", label: "Procurement", icon: Truck, path: "/app/procurement" },
  { key: "inventory", label: "Inventory", icon: Boxes, path: "/app/inventory" },
  { key: "production", label: "Production", icon: Factory, path: "/app/production" },
  { key: "finance", label: "Finance", icon: Wallet, path: "/app/finance" },
  { key: "hr", label: "HR", icon: UserCog, path: "/app/hr" },
  { key: "quality", label: "Quality", icon: ShieldCheck, path: "/app/quality" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, company, roles, isSuperAdmin, isCompanyAdmin, canAccessModule, hasModule, signOut, setActiveCompany } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void supabase.from("companies").select("id,name").order("name").then(({ data }) => {
      setCompanies((data ?? []) as { id: string; name: string }[]);
    });
  }, [isSuperAdmin]);

  // Super admin sees workspace modules when an active company is selected
  const showWorkspace = !isSuperAdmin || !!company;

  const navItems: { to: string; label: string; icon: typeof LayoutDashboard; show: boolean }[] = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, show: showWorkspace },
    ...MODULES.map((m) => ({
      to: m.path,
      label: m.label,
      icon: m.icon,
      show: isSuperAdmin ? !!company : canAccessModule(m.key),
    })),
    {
      to: "/app/reports",
      label: "Reports",
      icon: BarChart3,
      show: isSuperAdmin
        ? !!company
        : hasModule("reports") && (isCompanyAdmin || roles.includes("finance") || roles.includes("sales") || roles.includes("procurement")),
    },
    { to: "/app/users", label: "Users & Roles", icon: Users, show: !isSuperAdmin && isCompanyAdmin },
    { to: "/app/settings", label: "Settings", icon: Settings, show: true },
  ];

  const adminItems = isSuperAdmin
    ? [
        { to: "/admin", label: "Companies", icon: Building2 },
        { to: "/admin/users", label: "All Users", icon: Users },
      ]
    : [];

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform md:translate-x-0 md:static",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-6 py-5 border-b border-sidebar-border">
          <Link to={isSuperAdmin ? "/admin" : "/app"} className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
              <Cog className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <div className="font-bold tracking-tight text-base">Forge ERP</div>
              <div className="text-[11px] uppercase tracking-widest text-sidebar-foreground/60">
                {isSuperAdmin ? "Platform" : company?.name ?? "Workspace"}
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {adminItems.length > 0 && (
            <div>
              <div className="px-3 mb-2 text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
                Super Admin
              </div>
              <div className="space-y-1">
                {adminItems.map((it) => (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      path === it.to
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <it.icon className="h-4 w-4" />
                    {it.label}
                  </Link>
                ))}
              </div>
              <div className="mt-4 px-3">
                <div className="mb-1 text-[10px] uppercase tracking-widest text-sidebar-foreground/50">View as company</div>
                <Select
                  value={company?.id ?? "none"}
                  onValueChange={(v) => void setActiveCompany(v === "none" ? null : v)}
                >
                  <SelectTrigger className="h-8 bg-sidebar-accent/40 border-sidebar-border text-xs">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <div className="px-3 mb-2 text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
              Workspace
            </div>
            <div className="space-y-1">
              {navItems
                .filter((n) => n.show)
                .map((it) => (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      path === it.to
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <it.icon className="h-4 w-4" />
                    {it.label}
                  </Link>
                ))}
            </div>
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="text-sm font-medium truncate">{profile?.full_name || profile?.email}</div>
          <div className="text-xs text-sidebar-foreground/60 truncate">
            {roles.join(", ") || "no role"}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <button onClick={() => setOpen(!open)} className="p-2 -ml-2">
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-bold">Forge ERP</div>
          <div className="w-6" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}