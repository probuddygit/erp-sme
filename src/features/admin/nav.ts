import {
  Building2, Building, MapPin, CalendarRange, Coins, Users, Shield, KeyRound,
  Network, Briefcase, UsersRound, GitBranch, Bell, Workflow, Hash, ScrollText,
  Activity, Plug, Key, Mail, MessageSquare, Send, Database, Lock, Award,
  CreditCard, Settings2, LayoutDashboard,
} from "lucide-react";

export interface AdminNavItem {
  key: string;
  label: string;
  to: string;
  icon: any;
  group: string;
  description?: string;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { key: "overview", label: "Overview", to: "/workspace/administration", icon: LayoutDashboard, group: "General", description: "System snapshot & shortcuts" },

  { key: "organization", label: "Organization", to: "/workspace/administration/organization", icon: Building2, group: "Tenant", description: "Profile, GSTIN, PAN, regional" },
  { key: "companies", label: "Companies", to: "/workspace/administration/companies", icon: Building, group: "Tenant", description: "Multi-company setup" },
  { key: "branches", label: "Branches", to: "/workspace/administration/branches", icon: MapPin, group: "Tenant", description: "Branch master & mapping" },
  { key: "financial-years", label: "Financial Years", to: "/workspace/administration/financial-years", icon: CalendarRange, group: "Tenant", description: "FY periods & lock" },
  { key: "currencies", label: "Currencies", to: "/workspace/administration/currencies", icon: Coins, group: "Tenant", description: "Base & foreign currencies" },

  { key: "users", label: "Users", to: "/workspace/administration/users", icon: Users, group: "Access", description: "Invite, deactivate, assign" },
  { key: "roles", label: "Roles", to: "/workspace/administration/roles", icon: Shield, group: "Access", description: "System & custom roles" },
  { key: "permissions", label: "Permissions", to: "/workspace/administration/permissions", icon: KeyRound, group: "Access", description: "Module / menu / field ACL" },

  { key: "departments", label: "Departments", to: "/workspace/administration/departments", icon: Network, group: "Structure", description: "Organizational units" },
  { key: "designations", label: "Designations", to: "/workspace/administration/designations", icon: Briefcase, group: "Structure", description: "Job titles & grades" },
  { key: "teams", label: "Teams", to: "/workspace/administration/teams", icon: UsersRound, group: "Structure", description: "Cross-functional teams" },

  { key: "approval-matrix", label: "Approval Matrix", to: "/workspace/administration/approval-matrix", icon: GitBranch, group: "Automation", description: "Multi-level approval rules" },
  { key: "workflow-settings", label: "Workflow Settings", to: "/workspace/administration/workflow-settings", icon: Workflow, group: "Automation", description: "Escalation & SLA defaults" },
  { key: "document-numbering", label: "Document Numbering", to: "/workspace/administration/document-numbering", icon: Hash, group: "Automation", description: "Prefixes & running series" },
  { key: "notifications", label: "Notifications", to: "/workspace/administration/notifications", icon: Bell, group: "Automation", description: "Email, SMS, WhatsApp, Push" },

  { key: "audit-logs", label: "Audit Logs", to: "/workspace/administration/audit-logs", icon: ScrollText, group: "Observability", description: "Changes & deleted records" },
  { key: "activity-logs", label: "Activity Logs", to: "/workspace/administration/activity-logs", icon: Activity, group: "Observability", description: "User activity & API logs" },

  { key: "integrations", label: "Integrations", to: "/workspace/administration/integrations", icon: Plug, group: "Platform", description: "Third-party connections" },
  { key: "api-keys", label: "API Keys", to: "/workspace/administration/api-keys", icon: Key, group: "Platform", description: "Programmatic access tokens" },
  { key: "email-settings", label: "Email", to: "/workspace/administration/email-settings", icon: Mail, group: "Platform", description: "SMTP & templates" },
  { key: "whatsapp", label: "WhatsApp", to: "/workspace/administration/whatsapp", icon: MessageSquare, group: "Platform", description: "WhatsApp Business API" },
  { key: "sms", label: "SMS", to: "/workspace/administration/sms", icon: Send, group: "Platform", description: "SMS gateway" },
  { key: "backup-restore", label: "Backup & Restore", to: "/workspace/administration/backup-restore", icon: Database, group: "Platform", description: "Snapshots & recovery" },

  { key: "security", label: "Security", to: "/workspace/administration/security", icon: Lock, group: "Governance", description: "Password, 2FA, SSO, IP" },
  { key: "license", label: "License", to: "/workspace/administration/license", icon: Award, group: "Governance", description: "Product license & entitlements" },
  { key: "subscription", label: "Subscription", to: "/workspace/administration/subscription", icon: CreditCard, group: "Governance", description: "Plan, billing, usage" },
  { key: "preferences", label: "Preferences", to: "/workspace/administration/preferences", icon: Settings2, group: "Governance", description: "Theme, format, defaults" },
];

export const ADMIN_GROUPS = [
  "General", "Tenant", "Access", "Structure", "Automation", "Observability", "Platform", "Governance",
] as const;