# SAP-style End-to-End ERP Integration — 4-turn roadmap

User decisions:
- Delivery: All three flows in parallel, staged across 4 turns.
- Approvals: Off by default, per-company toggle in `company_settings`.
- Notifications: In-app now + Email queue (real email sending activates once domain is verified).
- e-Invoice / e-Way Bill: Generate + persist compliant JSON payload; no IRP API calls yet.

## Turn 1 — Foundation layer (THIS TURN)

Migration `foundation_integration`:
1. New enums: `posting_status` (`pending|posted|failed|skipped`), `notif_channel` (`in_app|email|whatsapp|push`), `doc_kind` (all doc-type strings).
2. Universal columns on every transactional doc table
   (`quotations`, `sales_orders`, `delivery_notes`, `invoices`, `payments`, `sales_returns`,
   `purchase_indents`, `rfqs`, `purchase_orders`, `grns`, `vendor_invoices`, `supplier_payments`, `vendor_returns`):
   `workflow_status text`, `approval_status text default 'not_required'`,
   `financial_posting_status posting_status default 'pending'`,
   `inventory_posting_status posting_status default 'pending'`,
   `gst_status posting_status default 'pending'`,
   `notification_status posting_status default 'pending'`,
   `source_doc_kind doc_kind`, `source_doc_id uuid`,
   `version int default 1`, `modified_by uuid`.
3. New tables:
   - `document_comments` (doc_kind, doc_id, author, body, created_at)
   - `document_events` (doc_kind, doc_id, event, payload, actor, created_at) — event bus for downstream automation
   - `document_links` (source_kind, source_id, destination_kind, destination_id) — many-to-many traceability
   - `notifications` (user_id, company_id, channel, subject, body, status, doc_kind, doc_id, sent_at)
   - `company_settings` (company_id, key, value jsonb) — approval toggles, credit-limit enforcement, etc.
   - `customer_credit` (customer_id, credit_limit, current_outstanding) — for O2C credit check
4. Generic PL/pgSQL helpers:
   - `record_document_event(kind, id, event, payload)` — writes to `document_events`
   - `link_documents(src_kind, src_id, dst_kind, dst_id)`
   - `apply_universal_touch()` trigger — bumps `version`, sets `modified_by`
   - `audit_doc_change()` trigger — writes to existing `audit_logs`
5. Attach `apply_universal_touch` + `audit_doc_change` triggers to all doc tables.

Shared frontend services (`src/features/shared/`):
- `useDocumentComments`, `useDocumentEvents`, `useDocumentLinks` — React Query hooks.
- `DocMetaBadges.tsx` — renders posting-status pills (Financial / Inventory / GST / Notified).
- `DocHistoryPanel.tsx` — comments + events + audit tail combined.
- `useCompanySetting(key)` — read/write toggles.

## Turn 2 — Order to Cash (Lead → Cash)

DB triggers (all `SECURITY DEFINER`, idempotent, guarded by posting_status):
- `tg_so_reserve_stock` — on `sales_orders.status → approved`: inserts negative-quantity rows in a new `stock_reservations` table (item, warehouse, qty, so_id).
- `tg_dn_issue_stock` — on `delivery_notes.status → dispatched`: calls `post_stock_issue` per line, clears matching reservation, records `document_event('stock_issued')`.
- `tg_inv_generate_gst_payload` — on `invoices.status → sent`: builds e-Invoice + e-Way Bill JSON, stores in `invoices.einvoice_payload / eway_payload`, flips `gst_status='posted'`.
- Existing `tg_post_invoice` already writes journal + GST ledger; extend it to flip `financial_posting_status`.
- `tg_post_payment` already writes journal; extend to update `customer_credit.current_outstanding` and flip statuses.
- `tg_notify_document_event` — on new `document_events` row: inserts one `notifications` row per subscribed user (channel=in_app; channel=email queued if company_settings.email_enabled).

Frontend:
- Sales Order approve action → also runs credit-check RPC `check_customer_credit(customer_id, amount)` and shows warning.
- Delivery Note dispatch button → shows Pick List printable view.
- Invoice detail page → shows GST-payload preview tab + Financial/Inventory/GST status pills.
- Payment allocation drawer: split payment across multiple invoices.

## Turn 3 — Procure to Pay

DB triggers:
- `tg_reorder_to_indent` — low-stock alert (already present) → auto-creates draft `purchase_indent` if `company_settings.auto_reorder_indent=true`.
- `tg_po_notify` — on `purchase_orders.status → sent`: creates document_event + notification to vendor's email if set.
- Existing `tg_post_grn` already accrues; extend to flip inventory + financial posting statuses.
- Existing `tg_post_vinv` handles tax; extend for full AP journal + `vendor_credit` update.
- `tg_post_sup_payment` already writes journal; extend to update vendor ledger and posting statuses.

Frontend:
- PO detail page: expected-receipt tracker (GRN progress bar), vendor comparison from RFQ.
- Vendor Invoice: 3-way match (PO ↔ GRN ↔ Bill) with variance highlighting.

## Turn 4 — Finance / GST / Dashboard / Reports rollup + AI hooks

DB:
- `mv_dashboard_kpis` materialized view refreshed by triggers on invoice/payment/grn/vinv posting.
- `gstr1_lines`, `gstr3b_summary` views over `gst_ledger`.
- `customer_ledger`, `vendor_ledger` views combining invoices + payments.
- `bank_reconciliation` table + matching RPC.

Frontend:
- Dashboard KPIs read from `mv_dashboard_kpis` with realtime invalidate on `document_events`.
- Reports auto-refresh via `postgres_changes` subscription on `document_events` filtered by company.
- AI Copilot context providers per module (already scaffolded via CopilotFab) — feed live doc summaries.
- Bank rec screen under Finance.

## Notes / deferred
- Real email delivery activates when the user configures an email domain (currently: not set up). Until then `notifications.channel='email'` rows queue with status `pending`.
- e-Invoice IRP integration deferred (payload only, per user choice).
- WhatsApp / Push channels: schema supports them; wiring later.

---

## Historical — Turn 3 (Procurement + Files) — SHIPPED

## A. Procurement backend wiring (all 8 doc types)

Doc types → tables (already exist in schema):
1. Purchase Requests → `purchase_indents` + `purchase_indent_items`
2. RFQs → `rfqs` + `rfq_items`
3. Vendor Quotations → `rfq_supplier_quotes` (per-supplier quote header) + `rfq_items` (linked)
4. Purchase Orders → `purchase_orders` + `purchase_order_items`
5. Goods Receipts (GRN) → `grns` + `grn_items`
6. Vendor Invoices → `vendor_invoices` + `vendor_invoice_items`
7. Vendor Payments → `supplier_payments`
8. Vendor Returns → new `vendor_returns` + `vendor_return_items` (schema doesn't have these yet)

Deliverables (mirrors Sales pattern from Turn 2):
- `src/features/procurement/api.ts` — React Query hooks per doc type: `useList`, `useGet`, `useSave` (insert or update + line-item diff), `useDelete`, all tenant-scoped via `useAuth().company.id`.
- Doc numbering: reuse `next_proc_number(company_id, prefix)` DB function for INDENT/RFQ/PO/GRN/VINV/PAY. Add `VRET` case in a small migration.
- Shared UI:
  - `ProcurementDocFormDialog.tsx` — vendor picker, dates, line items (reuse `LineItemsEditor`), GST totals via `sales-utils` (works for both directions).
  - `GRNFormDialog.tsx` — PO picker + receipt lines + landed cost (freight/duty/other).
  - `VendorPaymentFormDialog.tsx` — vendor + invoice picker + amount + method.
  - `VendorReturnFormDialog.tsx` — GRN picker + return lines + reason.
  - `ProcurementDocList.tsx` — search, filters, stats, `RowActions`, Files column (see B).
- Refactor 8 route files under `src/routes/_authenticated.workspace.procurement.*.tsx` to use live data via the new list component.
- Status-gated actions: no delete once posted/paid/received (matches Sales rules).
- Auto-post side effects already handled by existing DB triggers (`tg_post_grn`, `tg_grn_item_to_stock`, `tg_post_vinv`, `tg_post_sup_payment`).

## B. Global Files/Attachments feature

Schema (new migration):
- `public.attachments` table: `id`, `company_id`, `entity_type` (text, e.g. `purchase_indent`, `invoice`, `crm_lead`), `entity_id` (uuid), `bucket_path` (text — key inside storage bucket), `file_name`, `mime_type`, `size_bytes`, `uploaded_by`, `created_at`.
- Indexes on `(company_id, entity_type, entity_id)`.
- Grants + RLS: `authenticated` can `SELECT/INSERT/DELETE` rows where `company_id = get_user_company(auth.uid())`.
- View `attachment_counts` (or just query): return `entity_type, entity_id, file_count` — used for list column.

Storage:
- Private bucket `attachments` created via `storage_create_bucket` tool.
- RLS on `storage.objects`: path pattern `{company_id}/{entity_type}/{entity_id}/{uuid}-{filename}`; policies allow authenticated members of that company to read/write/delete only when the first path segment equals their `company_id`.
- Signed URLs (5-min TTL) for downloads via `supabase.storage.from('attachments').createSignedUrl(path, 300)`.

App layer:
- `src/features/attachments/api.ts` — `useAttachments(entityType, entityId)`, `useUploadAttachment()`, `useDeleteAttachment()`, `useAttachmentCounts(entityType, ids[])` (single grouped query for list column).
- `src/features/attachments/components/AttachmentsPanel.tsx` — drop zone + list with signed-url download + delete confirm. Reusable in any drawer.
- `src/features/attachments/components/FilesCountCell.tsx` — paperclip icon + count for list rows (matches screenshot).
- Wire into:
  - Procurement drawer (`PurchaseDrawer.tsx`) — replace the mock Files tab with `<AttachmentsPanel entityType={docType} entityId={id} />`.
  - Procurement list (`ProcurementDocList.tsx`) — add Files column using `FilesCountCell`.
  - Sales drawer (`TransactionDrawer.tsx`) + `SalesDocList.tsx` — same panel + column.
  - CRM `RecordDrawer.tsx` — Files tab.
  - Quality `NCRDrawer`, Inventory `InventoryTable` details, etc. — add Files tab where a drawer exists.

## Technical details

- Attachments query returns rows filtered by company via RLS, so client passes only `entity_type` + `entity_id`.
- Uploads go directly from browser via `supabase.storage.from('attachments').upload(path, file)` — no server function needed.
- List-view counts: `select entity_id, count(*) from attachments where entity_type=? and entity_id in (...) group by entity_id`.
- Comment count in screenshot: reuse existing `comments` field on `PurchaseTx` (already mocked); for now, mirror in a small `entity_comments` table only if we later persist comments — this plan leaves that as data-only (existing mock retained for Procurement list until backend comments are wired in a later turn).

## Rollout order (single turn if all approved)

1. Migration: add `vendor_returns` + `vendor_return_items`; add `VRET` to `next_proc_number`; add `attachments` table + RLS + grants.
2. Create `attachments` storage bucket + storage.objects RLS.
3. Build `src/features/attachments/**`.
4. Build `src/features/procurement/api.ts` + shared dialogs + `ProcurementDocList`.
5. Refactor 8 procurement routes.
6. Retrofit `PurchaseDrawer` + `TransactionDrawer` + `SalesDocList` + CRM `RecordDrawer` with `AttachmentsPanel` and Files column.
7. Typecheck; verify preview.
