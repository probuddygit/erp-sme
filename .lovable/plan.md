## Goal
Close the remaining data-flow integration gaps so every module ties end-to-end without manual re-entry.

## Scope (6 gaps)

### 1. CRM → Sales conversion
- Add "Convert to Quotation" action on Opportunity/Lead detail drawer.
- Server fn creates `quotations` row (customer auto-created from CRM contact if missing), copies items, calls `link_documents(lead → quotation)`, and records event.
- Show source lead badge + `DocHistoryDialog` link on the resulting quotation.

### 2. Sales Return & Vendor Return automation
- DB triggers:
  - `tg_post_sales_return`: on status `received`, post reverse journal (DR Sales Returns / GST Output, CR AR) and issue `post_stock_receipt` back to warehouse.
  - `tg_post_vendor_return`: on status `dispatched`, post reverse journal (DR AP, CR Inventory/GST Input) and issue `post_stock_issue` from warehouse.
- Reverse GST ledger entries (negative taxable_value) for GSTR consistency.
- UI: "Post Return" button + status badge.

### 3. Approvals coverage
- Route Vendor Invoice, Supplier Payment, Journal Entry, Sales Return, Vendor Return, and PO (already partial) through the generic `approval_rules`/`approvals`/`approval_steps` engine.
- Registry entry per doc type with threshold + approver role.
- Downstream postings (journal, stock) only fire when status ∈ approved set — update existing status guards accordingly.
- UI: Approvals inbox chip in header + per-doc Approvals tab.

### 4. Recurring Invoices scheduler
- TanStack public route `src/routes/api/public/hooks/recurring-invoices.ts` protected by `apikey` header.
- Iterates `recurring_invoice_templates` where `next_run_date <= today` & active, clones template into `invoices` + `invoice_items`, advances `next_run_date` by frequency, records event.
- `pg_cron` daily job hitting stable preview/prod URL.
- UI: "Run now" button on template + "Last generated" column.

### 5. Bank Reconciliation & Cash-Flow
- New `bank_statements` + `bank_statement_lines` tables (date, description, amount, ref, matched_payment_id).
- Manual CSV import + auto-match to `payments` / `supplier_payments` on amount+date±3d.
- Reconciliation screen under Finance with match/unmatch actions and unreconciled totals.
- Cash-flow report: aggregates from `journal_lines` where account_type ∈ (cash, bank) grouped by month, plus direct-method categories using source_module tags. Add to `/workspace/reports`.

### 6. Notification dispatcher
- Extend `notifications` insert triggers to fan out for: approval requests, low-stock alerts, invoice overdue, machine breakdown, ticket delayed.
- Public server route `hooks/dispatch-notifications` picks `notif_status='pending'`, sends via Resend connector (email channel) using `email_templates`, marks sent/failed.
- Pg_cron every 5 min.
- User `notification_preferences` toggles (email on/off per category); WhatsApp/push stubbed as no-op with clear TODO.
- In-app bell in header lists last 20 `in_app` notifications.

## Sequence
1. Migrations for return triggers, approval registry expansion, bank rec tables, notification fan-out triggers.
2. Server functions for CRM→Sales convert, return posting, recurring generator, dispatcher.
3. Cron jobs (recurring, dispatcher) via `pg_net`.
4. UI: convert action, approvals inbox, reconciliation screen, notifications bell, cash-flow report.
5. Seed one demo record per new flow (recurring template, bank statement) and smoke-test.

## Technical notes
- Reuse `post_journal`, `post_stock_issue`, `post_stock_receipt`, `link_documents`, `record_document_event` — no new posting primitives.
- Resend via connector gateway; require `standard_connectors--connect` for Resend before dispatcher is enabled (dispatcher no-ops gracefully if unconnected).
- All new triggers `SECURITY DEFINER` with `SET search_path = public` per existing pattern.
- All new tables ship with GRANTs + RLS scoped to `company_id` via `get_user_company(auth.uid())`.

## Out of scope
- E-invoice/IRN live push (adapter already exists — remains stubbed).
- WhatsApp/push actual delivery (channel scaffold only).
- Bank feed API integrations (CSV import only).
