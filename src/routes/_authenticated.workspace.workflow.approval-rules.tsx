import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { CrudList } from "@/features/admin/CrudList";
import { Pill } from "@/features/admin/DataListPage";
import { useCompanyTable } from "@/features/admin/admin-api";

export const Route = createFileRoute("/_authenticated/workspace/workflow/approval-rules")({
  component: Page,
});

interface Rule {
  id: string; name: string; entity_type: string; min_amount: number | null; max_amount: number | null;
  active: boolean; steps: any;
}

const ENTITIES = [
  "purchase_order", "purchase_indent", "sales_order", "quotation", "invoice",
  "vendor_invoice", "payment", "supplier_payment", "credit_note", "journal_entry",
];

const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const inr = (n: number | null) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`);
const parseSteps = (v: string) =>
  String(v || "").split(",").map((s) => s.trim()).filter(Boolean).map((role, i) => ({ level: i + 1, role }));

function Page() {
  const { rows, isLoading, create, update, remove } = useCompanyTable<Rule>("approval_rules", { orderBy: "entity_type" });

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold">Approval rules</div>
        <div className="text-xs text-muted-foreground">Route documents to approvers based on conditions and thresholds.</div>
      </div>
      <CrudList<Rule>
        entity="Approval rule"
        actionLabel="New rule"
        loading={isLoading}
        rows={rows}
        searchKeys={["name", "entity_type"]}
        columns={[
          { key: "name", header: "Rule", render: (r) => (
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="font-medium">{r.name}</span>
            </div>
          ) },
          { key: "entity_type", header: "Document", render: (r) => label(r.entity_type) },
          { key: "min_amount", header: "From", render: (r) => inr(r.min_amount) },
          { key: "max_amount", header: "To", render: (r) => inr(r.max_amount) },
          { key: "levels", header: "Levels", render: (r) => (Array.isArray(r.steps) ? r.steps.length : 0) },
          { key: "approvers", header: "Approvers", render: (r) => (Array.isArray(r.steps) ? r.steps.map((s: any) => s.role).join(" → ") : "—") },
          { key: "active", header: "Status", render: (r) => <Pill tone={r.active ? "success" : "warn"}>{r.active ? "Active" : "Draft"}</Pill> },
        ]}
        fields={[
          { name: "name", label: "Rule name", required: true },
          { name: "entity_type", label: "Document type", type: "select", required: true, default: "purchase_order", options: ENTITIES.map((e) => ({ label: label(e), value: e })) },
          { name: "min_amount", label: "Min amount (₹)", type: "number", default: 0 },
          { name: "max_amount", label: "Max amount (₹)", type: "number" },
          { name: "steps", label: "Approver chain", full: true, hint: "Comma-separated roles in order, e.g. manager, finance, admin", default: "manager, admin" },
          { name: "active", label: "Active", type: "switch", default: true },
        ]}
        toForm={(r) => ({
          name: r.name, entity_type: r.entity_type, min_amount: r.min_amount ?? 0, max_amount: r.max_amount ?? "",
          steps: Array.isArray(r.steps) ? r.steps.map((s: any) => s.role).join(", ") : "",
          active: r.active,
        })}
        onCreate={(v) => create.mutateAsync({
          name: v.name, entity_type: v.entity_type, active: v.active,
          min_amount: Number(v.min_amount) || 0,
          max_amount: v.max_amount === "" || v.max_amount == null ? null : Number(v.max_amount),
          steps: parseSteps(v.steps),
        })}
        onUpdate={(id, v) => update.mutateAsync({
          id, name: v.name, entity_type: v.entity_type, active: v.active,
          min_amount: Number(v.min_amount) || 0,
          max_amount: v.max_amount === "" || v.max_amount == null ? null : Number(v.max_amount),
          steps: parseSteps(v.steps),
        })}
        onDelete={(r) => remove.mutateAsync(r.id)}
      />
    </div>
  );
}
