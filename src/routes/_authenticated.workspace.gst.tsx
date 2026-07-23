import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Settings2, Hash, Percent, Scale, FileCheck2, Truck,
  FileBarChart, FileSpreadsheet, ClipboardList, type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/gst")({
  component: GstLayout,
});

const TABS: { path: string; label: string; icon: LucideIcon; group: string }[] = [
  { path: "/workspace/gst",               label: "Dashboard",         icon: LayoutDashboard,  group: "Overview" },
  { path: "/workspace/gst/configuration", label: "GST Configuration", icon: Settings2,        group: "Setup" },
  { path: "/workspace/gst/hsn",           label: "HSN Master",        icon: Hash,             group: "Setup" },
  { path: "/workspace/gst/rates",         label: "GST Rates",         icon: Percent,          group: "Setup" },
  { path: "/workspace/gst/tax-rules",     label: "Tax Rules",         icon: Scale,            group: "Setup" },
  { path: "/workspace/gst/e-invoice",     label: "e-Invoice",         icon: FileCheck2,       group: "Compliance" },
  { path: "/workspace/gst/e-way-bill",    label: "e-Way Bill",        icon: Truck,            group: "Compliance" },
  { path: "/workspace/gst/reports",       label: "GST Reports",       icon: FileBarChart,     group: "Reports" },
  { path: "/workspace/gst/gstr1",         label: "GSTR-1",            icon: FileSpreadsheet,  group: "Returns" },
  { path: "/workspace/gst/gstr3b",        label: "GSTR-3B",           icon: ClipboardList,    group: "Returns" },
];

function GstLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div>
      <PageHeader
        title="GST & Statutory Compliance"
        description="India-first GST engine — HSN, rates, e-invoicing, e-way bills and return filing."
        breadcrumbs={[{ label: "Workspace" }, { label: "GST" }]}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.path === "/workspace/gst" ? pathname === t.path : pathname.startsWith(t.path);
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