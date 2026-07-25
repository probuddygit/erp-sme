# Turn 3 — Procurement wiring + Global Files feature

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
