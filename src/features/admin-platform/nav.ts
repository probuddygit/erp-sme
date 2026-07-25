import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Receipt,
  Activity,
  Settings,
  Shield,
  type LucideIcon,
} from "lucide-react";

export interface PlatformNavItem {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  description?: string;
}

export const PLATFORM_NAV: PlatformNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    to: "/admin",
    icon: LayoutDashboard,
    description: "Platform overview and key metrics",
  },
  {
    key: "tenants",
    label: "Tenants",
    to: "/admin/tenants",
    icon: Building2,
    description: "Manage companies and tenants",
  },
  {
    key: "users",
    label: "Users",
    to: "/admin/users",
    icon: Users,
    description: "Cross-tenant user management",
  },
  {
    key: "subscriptions",
    label: "Subscriptions",
    to: "/admin/subscriptions",
    icon: CreditCard,
    description: "Plans, trials, and renewals",
  },
  {
    key: "billing",
    label: "Billing",
    to: "/admin/billing",
    icon: Receipt,
    description: "Invoices and payments",
  },
  {
    key: "system",
    label: "System Health",
    to: "/admin/system",
    icon: Activity,
    description: "Health metrics and audit logs",
  },
  {
    key: "settings",
    label: "Global Settings",
    to: "/admin/settings",
    icon: Settings,
    description: "Platform settings and feature flags",
  },
];

export const PLATFORM_ADMIN_GROUPS = [
  {
    key: "operator",
    label: "Platform Operator",
    icon: Shield,
  },
];
