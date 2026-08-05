import { createFileRoute } from "@tanstack/react-router";
import { SettingsForm } from "@/features/admin/SettingsForm";

export const Route = createFileRoute("/_authenticated/workspace/administration/workflow-settings")({
  component: () => (
    <SettingsForm settingsKey="admin.workflow" groups={[
      { title: "Escalation", fields: [
        { name: "escalate_after_hours", label: "Escalate after (hours)", type: "number", default: 24 },
        { name: "escalate_to", label: "Escalate to", type: "select", default: "manager", options: [
          { label: "Reporting manager", value: "manager" },
          { label: "Department head", value: "dept_head" },
          { label: "Company admin", value: "admin" },
        ] },
        { name: "auto_approve_on_timeout", label: "Auto-approve on timeout", type: "switch", default: false },
        { name: "reminder_interval_hours", label: "Reminder interval (hours)", type: "number", default: 8 },
      ] },
      { title: "SLA defaults", fields: [
        { name: "sla_quotation_hours", label: "Quotation approval SLA (hours)", type: "number", default: 12 },
        { name: "sla_po_hours", label: "Purchase order SLA (hours)", type: "number", default: 24 },
        { name: "sla_invoice_hours", label: "Invoice approval SLA (hours)", type: "number", default: 12 },
        { name: "business_hours_only", label: "Count business hours only", type: "switch", default: true },
      ] },
      { title: "Delegation", fields: [
        { name: "allow_delegation", label: "Allow approver delegation", type: "switch", default: true },
        { name: "allow_self_approval", label: "Allow self-approval", type: "switch", default: false },
        { name: "require_comment_on_reject", label: "Require comment on reject", type: "switch", default: true },
      ] },
      { title: "Notifications", fields: [
        { name: "notify_requester", label: "Notify requester on decision", type: "switch", default: true },
        { name: "notify_watchers", label: "Notify watchers", type: "switch", default: false },
        { name: "daily_pending_digest", label: "Daily pending digest", type: "switch", default: true },
      ] },
    ]} />
  ),
});
