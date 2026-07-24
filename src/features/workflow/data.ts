import type { LucideIcon } from "lucide-react";
import {
  Play, Square, GitBranch, UserCheck, Bell, Timer, Webhook, Database, Bot, Mail,
} from "lucide-react";

export type NodeKind =
  | "start" | "end" | "condition" | "approval" | "notify"
  | "delay" | "webhook" | "update" | "ai" | "email";

export interface NodePalette {
  kind: NodeKind;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "Trigger" | "Logic" | "Human" | "Action" | "AI";
  accent: string;
}

export const NODE_PALETTE: NodePalette[] = [
  { kind: "start",     label: "Start",             description: "Trigger the workflow",             icon: Play,       group: "Trigger", accent: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  { kind: "end",       label: "End",               description: "Terminate the workflow",           icon: Square,     group: "Trigger", accent: "bg-slate-500/10 text-slate-600 border-slate-500/30" },
  { kind: "condition", label: "Condition",         description: "Branch on a rule",                 icon: GitBranch,  group: "Logic",   accent: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  { kind: "delay",     label: "Delay / Timer",     description: "Wait N minutes / hours / days",    icon: Timer,      group: "Logic",   accent: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  { kind: "approval",  label: "Approval",          description: "Route to approver / role",         icon: UserCheck,  group: "Human",   accent: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  { kind: "notify",    label: "Notification",      description: "In-app / SMS / push",              icon: Bell,       group: "Action",  accent: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  { kind: "email",     label: "Send Email",        description: "Templated email",                  icon: Mail,       group: "Action",  accent: "bg-sky-500/10 text-sky-600 border-sky-500/30" },
  { kind: "webhook",   label: "Webhook",           description: "Call external URL",                icon: Webhook,    group: "Action",  accent: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30" },
  { kind: "update",    label: "Update Record",     description: "Mutate a document field",          icon: Database,   group: "Action",  accent: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30" },
  { kind: "ai",        label: "AI Step",           description: "Summarize, classify, extract",     icon: Bot,        group: "AI",      accent: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/30" },
];

export interface CanvasNode {
  id: string;
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
}

export const SAMPLE_NODES: CanvasNode[] = [
  { id: "n1", kind: "start",     label: "PO Created",          x: 40,  y: 80 },
  { id: "n2", kind: "condition", label: "Amount > ₹5,00,000?", x: 260, y: 80 },
  { id: "n3", kind: "approval",  label: "Manager Approval",    x: 500, y: 20 },
  { id: "n4", kind: "approval",  label: "Director Approval",   x: 500, y: 160 },
  { id: "n5", kind: "notify",    label: "Notify Vendor",       x: 760, y: 90 },
  { id: "n6", kind: "end",       label: "Complete",            x: 980, y: 90 },
];

export interface ApprovalRule {
  id: string;
  name: string;
  document: string;
  condition: string;
  approvers: string;
  levels: number;
  status: "Active" | "Draft" | "Paused";
}

export const APPROVAL_RULES: ApprovalRule[] = [
  { id: "AR-001", name: "High-value Purchase Order", document: "Purchase Order",   condition: "amount > ₹5,00,000",             approvers: "Manager → Director",   levels: 2, status: "Active" },
  { id: "AR-002", name: "Sales Discount > 10%",      document: "Sales Quotation",  condition: "discount_pct > 10",              approvers: "Sales Head",           levels: 1, status: "Active" },
  { id: "AR-003", name: "Vendor Onboarding",         document: "Vendor Master",    condition: "always",                         approvers: "Finance → Compliance", levels: 2, status: "Active" },
  { id: "AR-004", name: "Credit Note Issue",         document: "Credit Note",      condition: "amount > ₹50,000",               approvers: "Finance Manager",      levels: 1, status: "Draft"  },
  { id: "AR-005", name: "Payroll Off-cycle",         document: "Payroll Run",      condition: "type = adhoc",                   approvers: "HR Head → CFO",        levels: 2, status: "Paused" },
];

export interface ConditionalRule {
  id: string;
  name: string;
  when: string;
  then: string;
  status: "Active" | "Draft";
}

export const CONDITIONAL_RULES: ConditionalRule[] = [
  { id: "CR-001", name: "Auto-hold overdue customers",  when: "customer.overdue_days > 30",           then: "Block new Sales Order",       status: "Active" },
  { id: "CR-002", name: "Auto reorder low stock",       when: "stock.qty < reorder_level",             then: "Create Indent draft",         status: "Active" },
  { id: "CR-003", name: "Flag duplicate invoice",       when: "invoice.number matches existing",       then: "Route to Finance review",     status: "Active" },
  { id: "CR-004", name: "Escalate stale approval",      when: "approval.pending_hrs > 24",             then: "Notify next-level approver",  status: "Active" },
  { id: "CR-005", name: "Auto GST validation",          when: "invoice.gstin invalid",                 then: "Reject with reason",          status: "Draft"  },
];

export interface NotificationRule {
  id: string;
  event: string;
  channels: ("In-app" | "Email" | "SMS" | "Push")[];
  audience: string;
  template: string;
  enabled: boolean;
}

export const NOTIFICATION_RULES: NotificationRule[] = [
  { id: "NT-001", event: "Sales Order created",     channels: ["In-app", "Email"],           audience: "Sales team",       template: "so_created",     enabled: true  },
  { id: "NT-002", event: "Approval pending > 4h",   channels: ["In-app", "Push"],            audience: "Approver",         template: "appr_pending",   enabled: true  },
  { id: "NT-003", event: "Invoice overdue",         channels: ["Email", "SMS"],              audience: "Customer, AR team",template: "inv_overdue",    enabled: true  },
  { id: "NT-004", event: "Low-stock alert",         channels: ["In-app", "Email"],           audience: "Purchase team",    template: "low_stock",      enabled: true  },
  { id: "NT-005", event: "GST filing due",          channels: ["Email"],                     audience: "Finance",          template: "gst_due",        enabled: false },
];

export interface EscalationRule {
  id: string;
  workflow: string;
  after: string;
  action: string;
  escalateTo: string;
  enabled: boolean;
}

export const ESCALATION_RULES: EscalationRule[] = [
  { id: "ES-001", workflow: "PO Approval",        after: "24 hours",  action: "Reassign", escalateTo: "Director",       enabled: true  },
  { id: "ES-002", workflow: "Vendor Onboarding",  after: "48 hours",  action: "Notify",   escalateTo: "Compliance Head",enabled: true  },
  { id: "ES-003", workflow: "Credit Note",        after: "12 hours",  action: "Reassign", escalateTo: "CFO",            enabled: true  },
  { id: "ES-004", workflow: "Leave Request",      after: "72 hours",  action: "Auto-approve", escalateTo: "HR",         enabled: false },
];

export interface WorkflowRun {
  id: string;
  workflow: string;
  trigger: string;
  startedAt: string;
  duration: string;
  status: "Completed" | "Running" | "Failed" | "Waiting";
  actor: string;
}

export const WORKFLOW_HISTORY: WorkflowRun[] = [
  { id: "WF-2401", workflow: "PO Approval",           trigger: "PO-2456 created",           startedAt: "2 min ago",   duration: "—",       status: "Waiting",   actor: "system" },
  { id: "WF-2400", workflow: "Sales Discount",        trigger: "SQ-1178 discount 15%",      startedAt: "18 min ago",  duration: "3m 42s",  status: "Completed", actor: "priya@guruauto" },
  { id: "WF-2399", workflow: "Vendor Onboarding",     trigger: "V-0089 submitted",          startedAt: "1 hr ago",    duration: "—",       status: "Running",   actor: "arun@guruauto" },
  { id: "WF-2398", workflow: "Low-stock Reorder",     trigger: "SKU-4451 below reorder",    startedAt: "2 hr ago",    duration: "12s",     status: "Completed", actor: "system" },
  { id: "WF-2397", workflow: "Credit Note Approval",  trigger: "CN-0033 raised",            startedAt: "3 hr ago",    duration: "1m 08s",  status: "Failed",    actor: "system" },
  { id: "WF-2396", workflow: "PO Approval",           trigger: "PO-2455 created",           startedAt: "5 hr ago",    duration: "22m 03s", status: "Completed", actor: "meera@guruauto" },
  { id: "WF-2395", workflow: "GST Filing Reminder",   trigger: "Cron: monthly",             startedAt: "Yesterday",   duration: "4s",      status: "Completed", actor: "system" },
];

export interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  nodes: number;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  { id: "T-01", name: "Purchase Order Approval",  category: "Procurement", description: "Multi-level PO approval with amount thresholds.",       nodes: 6 },
  { id: "T-02", name: "Sales Quotation Discount", category: "Sales",       description: "Auto-route discount above threshold to Sales Head.",    nodes: 5 },
  { id: "T-03", name: "Vendor Onboarding",        category: "Master Data", description: "Finance + Compliance approval, KYC verification.",     nodes: 7 },
  { id: "T-04", name: "Employee Leave",           category: "HR",          description: "Manager approval with auto-escalation.",                nodes: 4 },
  { id: "T-05", name: "Credit Note Issue",        category: "Finance",     description: "Finance review with audit trail.",                      nodes: 5 },
  { id: "T-06", name: "Low-stock Reorder",        category: "Inventory",   description: "Auto-create indent when stock < reorder level.",        nodes: 4 },
];

export const paletteByKind = (k: NodeKind) => NODE_PALETTE.find((p) => p.kind === k)!;