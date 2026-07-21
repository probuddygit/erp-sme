
# ERP Platform Revamp — Audit & Roadmap

## Part 1 — Current State (What's Implemented)

### Platform Foundation
- Multi-tenant SaaS with `companies`, per-company module toggles (`enabled_modules`), role-based access (`user_roles`), Super Admin + Company Admin hierarchy
- Auth via Lovable Cloud (Supabase), RLS on every table, security-hardened helper functions
- TanStack Start SSR shell, sidebar navigation (`AppShell`), module-gated routes under `/_authenticated/app/*`

### Modules & Features

**1. Sales & CRM** (`/app/sales`)
- Pipeline (Leads), Customers, Quotations, Sales Orders, Invoices
- Line-item editor, status workflows, CRUD with row actions

**2. Procurement** (`/app/procurement`)
- Suppliers, Purchase Indents, RFQs (with supplier quotes), Purchase Orders (+ detail page), GRNs, Vendor Invoices
- Status-gated deletes, PO → GRN → invoice flow

**3. Inventory** (`/app/inventory`)
- Items master, Warehouses, Stock Movements (audit trail), stock batches
- CRUD on masters; movements immutable

**4. Production** (`/app/production`)
- Bills of Materials (+ components), Work Orders (+ detail), Timeline view
- Material consumption + production output tracking

**5. Finance & Accounting** (`/app/finance`)
- Chart of Accounts, Journal Entries + Lines, GST Ledger, P&L / Balance Sheet reports
- Auto-posting triggers from invoices/payroll, `account_balances` RPC

**6. HR & Payroll** (`/app/hr`)
- Employees, Attendance, Salary Structures, Payroll Runs & Items
- Restricted PII access (admin/hr only)

**7. Quality** (`/app/quality`)
- QC Inspections (incoming/in-process/finished) with checklists, NCR records, reports

**8. Smart Maintenance** (`/app/maintenance`)
- Machines master, Tickets (kanban+calendar), Preventive Plans, Runtime/Downtime logs
- Spare parts linkage, Alerts engine, Analytics (Utilization, MTBF, MTTR)

**9. Reports** (`/app/reports`)
- Executive dashboard, Sales analytics, Procurement, Inventory reports

**10. Admin** (`/admin`)
- Companies provisioning, Users & Roles management

---

## Part 2 — Gaps & Refinement Opportunities

### Cross-cutting gaps
- No **document/file storage** (attachments on POs, invoices, QC certs, machine manuals)
- No **email/PDF generation** (invoices, POs, quotations aren't sendable/printable)
- No **approval workflows** (PO approval matrix, leave approval, JE posting approval)
- No **audit log** of who changed what
- No **global search** across entities
- No **dashboards per role** (only one executive view)
- No **import/export** (CSV/Excel) for master data
- No **notifications delivery** (alerts exist but no email/in-app toast pipeline)
- Limited **mobile responsiveness** review

### Module-level refinements
- **Sales**: credit limits, recurring invoices, dispatch/delivery notes, sales returns, commission tracking
- **Procurement**: 3-way match (PO/GRN/Invoice), landed cost, supplier scorecards, contract mgmt
- **Inventory**: multi-UOM conversions, serial/batch traceability UI, cycle counts, reorder point automation, stock valuation (FIFO/weighted avg) reports
- **Production**: capacity planning, shop-floor operator terminal, routing/operations, scrap tracking, MRP run
- **Finance**: bank reconciliation, cash flow statement, budgets vs actuals, fixed asset register + depreciation, TDS, e-invoicing/e-way bill (India)
- **HR**: leave management, shift scheduling, appraisals, expense claims, loans/advances, statutory reports (PF/ESI/PT)
- **Quality**: CAPA workflow, supplier quality (incoming reject trends), calibration register
- **Maintenance**: work-order labour cost → finance JE, condition-based/IoT sensor hooks, predictive ML scoring (already envisioned)
- **Reports**: custom report builder, scheduled email reports, drill-through

### Technical refinements
- Consolidate duplicated layout/tab code across module `*.tsx` layout files into a shared component
- Introduce a **notification center** (in-app toasts + email via edge/server fn) driven by `alerts`
- **PDF service** (server function → HTML template → PDF) for invoices/POs/quotations
- **Storage buckets** wired to attachment fields
- **Query performance** review (indexes on frequently-filtered columns: company_id + status combos)
- **Consistent status enums** and reusable status-badge component
- **Form UX**: replace ad-hoc dialogs with a shared record drawer/side-sheet pattern
- **Empty states, skeleton loaders, error boundaries** standardized

---

## Part 3 — Proposed Revamp Roadmap (Phased)

### Phase A — Platform polish & cross-cutting foundations
1. Shared **module layout** component + reusable **StatusBadge**, **RecordDrawer**, **DataTable** primitives
2. **Attachments/storage** infrastructure (bucket + reusable uploader)
3. **PDF generation** server function + templates for invoice/PO/quotation
4. **Notification center** UI + email delivery for `alerts`
5. **Global search** command palette (Cmd+K)
6. **Audit log** table + triggers on critical entities
7. **CSV import/export** utility for masters

### Phase B — Sales/Procurement/Inventory depth
8. Approval workflows (PO matrix, credit-limit override)
9. Sales returns, delivery notes, recurring invoices
10. 3-way match, supplier scorecards
11. Serial/batch traceability UI, cycle counts, reorder automation, valuation reports

### Phase C — Finance maturity
12. Bank reconciliation, cash flow, budgets
13. Fixed assets + depreciation
14. TDS, e-invoicing, e-way bill (India localization)

### Phase D — Production & HR depth
15. Capacity planning, shop-floor terminal, MRP
16. Leave/shift/expense/appraisal modules, statutory reports

### Phase E — Quality/Maintenance/Analytics
17. CAPA, supplier quality, calibration
18. Maintenance labour → finance posting, IoT sensor ingest, predictive scoring
19. Report builder + scheduled reports; role-based dashboards

---

## Questions Before I Start Phase A

1. **Priority order** — do you want to follow A→E, or jump to a specific module (e.g., Finance localization or Production shop-floor first)?
2. **Localization scope** — Is India-only (GST, TDS, e-invoice) sufficient, or multi-country?
3. **PDF/email** — OK to use Lovable AI Gateway + a server-side PDF library, and add an email provider connector (Resend) for outbound?
4. **Approvals** — should approvals be a generic engine (reusable across modules) or hard-coded per module?

Reply with priorities/answers and I'll produce a detailed Phase A build plan.
