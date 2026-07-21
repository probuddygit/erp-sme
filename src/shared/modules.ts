import {
  LayoutDashboard,
  Users2,
  ShoppingCart,
  Truck,
  Boxes,
  Wallet,
  Receipt,
  BarChart3,
  GitBranch,
  Settings,
  Database,
  type LucideIcon,
} from "lucide-react";

export type WorkspaceModule =
  | "dashboard"
  | "masters"
  | "crm"
  | "sales"
  | "procurement"
  | "inventory"
  | "finance"
  | "gst"
  | "reports"
  | "workflow"
  | "administration";

export interface ModuleDef {
  key: WorkspaceModule;
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
  roles: string[]; // "*" means all authenticated
}

export const WORKSPACE_MODULES: ModuleDef[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/workspace",
    icon: LayoutDashboard,
    description: "At-a-glance view of your business performance.",
    roles: ["*"],
  },
  {
    key: "masters",
    label: "Master Data",
    path: "/workspace/masters",
    icon: Database,
    description: "Reusable reference data — customers, vendors, items and more.",
    roles: ["*"],
  },
  {
    key: "crm",
    label: "CRM",
    path: "/workspace/crm",
    icon: Users2,
    description: "Manage leads, contacts, and customer relationships.",
    roles: ["admin", "sales"],
  },
  {
    key: "sales",
    label: "Sales",
    path: "/workspace/sales",
    icon: ShoppingCart,
    description: "Quotations, sales orders, and invoicing.",
    roles: ["admin", "sales"],
  },
  {
    key: "procurement",
    label: "Procurement",
    path: "/workspace/procurement",
    icon: Truck,
    description: "Vendors, purchase orders, and goods receipts.",
    roles: ["admin", "procurement"],
  },
  {
    key: "inventory",
    label: "Inventory",
    path: "/workspace/inventory",
    icon: Boxes,
    description: "Items, warehouses, and stock movements.",
    roles: ["admin", "sales", "procurement", "warehouse", "inventory"],
  },
  {
    key: "finance",
    label: "Finance",
    path: "/workspace/finance",
    icon: Wallet,
    description: "Ledger, receivables, payables, and reconciliation.",
    roles: ["admin", "finance"],
  },
  {
    key: "gst",
    label: "GST",
    path: "/workspace/gst",
    icon: Receipt,
    description: "GST returns, e-invoicing, and compliance.",
    roles: ["admin", "finance"],
  },
  {
    key: "reports",
    label: "Reports",
    path: "/workspace/reports",
    icon: BarChart3,
    description: "Analytics and business intelligence.",
    roles: ["admin", "finance", "sales", "procurement", "management"],
  },
  {
    key: "workflow",
    label: "Workflow",
    path: "/workspace/workflow",
    icon: GitBranch,
    description: "Approvals, automations, and audit trails.",
    roles: ["admin", "management"],
  },
  {
    key: "administration",
    label: "Administration",
    path: "/workspace/administration",
    icon: Settings,
    description: "Companies, branches, users, roles, and settings.",
    roles: ["super_admin", "admin"],
  },
];

export function modulesForRoles(roles: string[], isSuperAdmin: boolean): ModuleDef[] {
  if (isSuperAdmin) return WORKSPACE_MODULES;
  return WORKSPACE_MODULES.filter(
    (m) => m.roles.includes("*") || m.roles.some((r) => roles.includes(r)),
  );
}