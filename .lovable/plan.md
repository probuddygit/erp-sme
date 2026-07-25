
# Prioritized Pass: Make All Module CTAs Functional (Real Backend)

Goal: replace dummy data with Supabase-backed CRUD on the primary entity of each module. Advanced flows (PDF, email send, kanban DnD persistence, workflow execution) stay as follow-ups.

## Ground rules per module
- **Create / Edit / Delete / View** on the primary list page, backed by Supabase.
- Tenant isolation via `company_id` from `AuthContext`; RLS scoped to `has_company_role(auth.uid(), company_id, ...)`.
- Server functions in `src/features/<module>/*.functions.ts` with `requireSupabaseAuth`.
- React Query for reads; `useMutation` + `invalidateQueries` for writes.
- Toasts on success/error; confirmation dialog on delete (reuse `RowActions`).
- Existing dummy data files kept only as seed reference, not imported by pages.

## Order of delivery (one module per turn to stay reviewable)

**Turn 1 — CRM** (this turn)
- Tables already partly exist (`leads`, `customers`). Add: `crm_contacts`, `crm_activities`, `crm_follow_ups`, `crm_email_history`.
- Wire pages: Leads, Contacts, Accounts (customers), Follow-ups, Activities, Opportunities (leads with stage), Email History.
- Kanban/Calendar keep current UI, read from live data (DnD to update stage/date).

**Turn 2 — Sales**
- Use existing `quotations`, `sales_orders`, `invoices`, `delivery_notes`, `sales_returns`, `payments`.
- CRUD on headers + line items via `LineItemsEditor`. Status transitions gated (draft→sent→…).

**Turn 3 — Procurement**
- Existing `purchase_indents`, `rfqs`, `purchase_orders`, `grns`, `vendor_invoices`, `supplier_payments`.
- Same header/lines pattern; approval placeholder writes to `approvals`.

**Turn 4 — Inventory**
- Items, Warehouses (masters already partially wired). Add live Stock Ledger from `stock_transactions`, Stock Transfer + Adjustment forms that call existing RPCs (`post_stock_issue`, `post_stock_receipt`).

**Turn 5 — Finance + GST**
- Chart of Accounts, Journal Entry (uses `post_journal`), Payments/Receipts. Reports read from `account_balances`. GST reads from `gst_ledger`.

**Turn 6 — Reports + Workflow**
- Reports: saved report definitions table, list/run/save/delete. Chart/pivot config persisted.
- Workflow: `approval_rules` + `approval_steps` CRUD, enable/disable, order steps.

**Turn 7 — Administration**
- Companies, Branches, FY, Users/Roles, Invitations, Doc Numbering, Notification Prefs, Feature Flags, Audit Log viewer — all backed by existing tables + `admin-platform.functions.ts`-style server fns scoped to tenant.

## Technical shape (applies to every turn)

```text
src/features/<module>/
  <entity>.functions.ts   # list/get/create/update/delete server fns
  hooks/use<Entity>.ts    # useQuery + useMutation wrappers
  components/<Entity>Form.tsx
```

- Server fns use `context.supabase` (RLS as user), never `supabaseAdmin`.
- Missing tables added via one migration per turn, with GRANTs + RLS + `company_id` scoping + `updated_at` trigger.
- Deletes are hard delete when no downstream refs, soft (status='cancelled') when linked to posted docs.

## What is explicitly deferred
- PDF generation, outbound email sending, e-invoice/e-way-bill NIC calls.
- Real workflow execution engine (only rule CRUD in turn 6).
- Attachments to Supabase Storage (UI stays, upload wiring later).
- Bulk import/export.

## This turn's deliverable (CRM)
1. Migration: `crm_contacts`, `crm_activities`, `crm_follow_ups`, `crm_email_history` with RLS + GRANTs.
2. `src/features/crm/crm.functions.ts` — server fns for leads, contacts, accounts (customers), activities, follow-ups, emails.
3. Refactor 7 CRM route files to fetch/mutate via React Query; add Create/Edit dialogs and delete actions.
4. Kanban stage change and follow-up toggle persist to DB.

Proceed?
