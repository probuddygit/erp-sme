export interface BackupTable {
  table: string;
  label: string;
  group: string;
  tenantScoped: boolean;
}

/** Curated catalog of exportable tables, grouped by domain. */
export const BACKUP_CATALOG: BackupTable[] = [
  { table: "companies", label: "Companies", group: "Platform", tenantScoped: false },
  { table: "organizations", label: "Organizations", group: "Platform", tenantScoped: false },
  { table: "profiles", label: "User profiles", group: "Platform", tenantScoped: false },
  { table: "user_roles", label: "User roles", group: "Platform", tenantScoped: false },
  { table: "platform_subscriptions", label: "Subscriptions", group: "Platform", tenantScoped: false },
  { table: "platform_invoices", label: "Platform invoices", group: "Platform", tenantScoped: false },
  { table: "platform_audit_logs", label: "Platform audit logs", group: "Platform", tenantScoped: false },

  { table: "branches", label: "Branches", group: "Setup", tenantScoped: true },
  { table: "financial_years", label: "Financial years", group: "Setup", tenantScoped: true },
  { table: "currencies", label: "Currencies", group: "Setup", tenantScoped: true },
  { table: "company_settings", label: "Company settings", group: "Setup", tenantScoped: true },

  { table: "customers", label: "Customers", group: "Masters", tenantScoped: true },
  { table: "suppliers", label: "Suppliers", group: "Masters", tenantScoped: true },
  { table: "items", label: "Items", group: "Masters", tenantScoped: true },
  { table: "warehouses", label: "Warehouses", group: "Masters", tenantScoped: true },
  { table: "employees", label: "Employees", group: "Masters", tenantScoped: true },
  { table: "machines", label: "Machines", group: "Masters", tenantScoped: true },

  { table: "leads", label: "Leads", group: "CRM", tenantScoped: true },
  { table: "crm_accounts", label: "CRM accounts", group: "CRM", tenantScoped: true },
  { table: "crm_contacts", label: "CRM contacts", group: "CRM", tenantScoped: true },
  { table: "crm_opportunities", label: "Opportunities", group: "CRM", tenantScoped: true },
  { table: "crm_activities", label: "CRM activities", group: "CRM", tenantScoped: true },

  { table: "quotations", label: "Quotations", group: "Sales", tenantScoped: true },
  { table: "sales_orders", label: "Sales orders", group: "Sales", tenantScoped: true },
  { table: "delivery_notes", label: "Delivery notes", group: "Sales", tenantScoped: true },
  { table: "invoices", label: "Sales invoices", group: "Sales", tenantScoped: true },
  { table: "credit_notes", label: "Credit notes", group: "Sales", tenantScoped: true },
  { table: "payments", label: "Customer payments", group: "Sales", tenantScoped: true },

  { table: "purchase_indents", label: "Purchase indents", group: "Procurement", tenantScoped: true },
  { table: "rfqs", label: "RFQs", group: "Procurement", tenantScoped: true },
  { table: "purchase_orders", label: "Purchase orders", group: "Procurement", tenantScoped: true },
  { table: "grns", label: "GRNs", group: "Procurement", tenantScoped: true },
  { table: "vendor_invoices", label: "Vendor invoices", group: "Procurement", tenantScoped: true },
  { table: "supplier_payments", label: "Supplier payments", group: "Procurement", tenantScoped: true },

  { table: "stock_transactions", label: "Stock transactions", group: "Inventory", tenantScoped: true },
  { table: "stock_batches", label: "Stock batches", group: "Inventory", tenantScoped: true },
  { table: "cycle_counts", label: "Cycle counts", group: "Inventory", tenantScoped: true },

  { table: "chart_of_accounts", label: "Chart of accounts", group: "Finance", tenantScoped: true },
  { table: "journal_entries", label: "Journal entries", group: "Finance", tenantScoped: true },
  { table: "journal_lines", label: "Journal lines", group: "Finance", tenantScoped: false },
  { table: "gst_ledger", label: "GST ledger", group: "Finance", tenantScoped: true },

  { table: "bills_of_materials", label: "Bills of materials", group: "Production", tenantScoped: true },
  { table: "work_orders", label: "Work orders", group: "Production", tenantScoped: true },
  { table: "production_output", label: "Production output", group: "Production", tenantScoped: true },
  { table: "qc_inspections", label: "QC inspections", group: "Quality", tenantScoped: true },
  { table: "ncr_records", label: "NCR records", group: "Quality", tenantScoped: true },

  { table: "maintenance_plans", label: "Maintenance plans", group: "Maintenance", tenantScoped: true },
  { table: "maintenance_tickets", label: "Maintenance tickets", group: "Maintenance", tenantScoped: true },

  { table: "attendance", label: "Attendance", group: "HR", tenantScoped: true },
  { table: "payroll_runs", label: "Payroll runs", group: "HR", tenantScoped: true },
  { table: "payroll_items", label: "Payroll items", group: "HR", tenantScoped: false },

  { table: "audit_logs", label: "Tenant audit logs", group: "Observability", tenantScoped: true },
  { table: "approvals", label: "Approvals", group: "Observability", tenantScoped: true },
  { table: "notifications", label: "Notifications", group: "Observability", tenantScoped: true },
];

export const BACKUP_GROUPS = Array.from(new Set(BACKUP_CATALOG.map((t) => t.group)));

export const BACKUP_TABLE_NAMES = BACKUP_CATALOG.map((t) => t.table);

export interface BackupRunEntry {
  id: string;
  at: string;
  actor: string | null;
  kind: "csv" | "json" | "bundle";
  scope: string;
  tables: string[];
  rows: number;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function downloadBlob(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
