# Sales Module Revamp — SAP-style Order-to-Cash

Aligns Sales with the CRM revamp (accounts/opportunities) and Indian MSME partial-dispatch reality. Current module backed up, then rebuilt around the ER you specified.

## Backup & safety

- Move current routes to `.lovable/backup/sales/` (quotations, sales-orders, delivery-notes, invoices, returns, payments, index).
- Snapshot current `src/features/sales/` to `.lovable/backup/sales/features/`.
- Keep `_authenticated.app.sales.*.tsx` (legacy `/app/sales/*`) untouched as a live fallback.
- All DB changes additive — no drops on existing tables.

## Data model (additive migration)

New/extended columns on existing tables (no destructive changes):

- `quotations`: `crm_account_id`, `opportunity_id`, `converted_order_id` (FK).
- `sales_orders`: `quotation_id`, `crm_account_id`, `warehouse_id`, `promised_date`, `credit_hold bool`, `credit_hold_reason`, extend `sales_order_status` enum with `partially_dispatched`, `dispatched`, `invoiced`, `closed`, `credit_hold`.
- `sales_order_items`: `qty_dispatched numeric default 0`, `qty_invoiced numeric default 0`, `item_id` (FK items, nullable for free-text lines).
- `delivery_notes`: `vehicle_no`, `transporter_name`, `eway_bill_no`, `place_of_supply`.
- `delivery_note_items`: `sales_order_item_id`, `batch_id` (FK stock_batches, nullable).
- `invoices`: `place_of_supply`, `irn`, `qr_code_data`, `gstin_seq_no` (per-GSTIN sequence).
- `invoice_items`: `hsn_code`, `sales_order_item_id`.

New table `credit_notes` + `credit_note_items` with `reason` enum (`return`, `pricing`, `discount`, `cancellation`), links to invoice, reverses AR + GST on post (trigger reuses existing journal/GST posting helpers).

New RPCs:
- `check_customer_credit(_account_id, _order_total)` → returns `{ ok, available, reason }`.
- `confirm_sales_order(_order_id)` → runs credit check, sets `confirmed` or `credit_hold`.
- `next_invoice_number_per_gstin(_company_id, _gstin)` → per-GSTIN sequence.

## API layer (`src/features/sales/api.ts`)

Extend with:
- `useConfirmSalesOrder`, `useReleaseCreditHold`.
- `useDispatchOrder(orderId)` — creates DeliveryChallan, allocates from selected batches, decrements stock, updates `qty_dispatched`, flips SO status to `partially_dispatched`/`dispatched`.
- `useInvoiceChallan(challanId)` — creates TaxInvoice from a challan (or multiple), computes CGST/SGST/IGST via existing `tax_type`, calls per-GSTIN numbering, marks SO `invoiced` when fully covered.
- `useCreateCreditNote`, `useCreditNotes(invoiceId)`.
- `useSalesDashboard()` — leaderboards, credit-hold count, overdue receivables.

Deterministic client-side heuristics for AI helpers (no external calls):
- `deliveryFeasibility(order)` — flags if promised_date < today + item lead-time proxy or stock < qty.
- `priceAnomaly(line, priceList)` — flags > 15% deviation from list price.
- `dunningDraft(invoice)` — templated message with tone based on days overdue.

## UI (kept in current theme)

Routes under `/workspace/sales`:

1. **Quotations** — enrich existing list with account/opportunity link, "Convert to Order" action already exists; add per-row `ScoreBadge` for value tier.
2. **Order Booking** (`sales-orders`) rebuild:
   - Header: customer typeahead + inline `CreditGauge` (reuses CRM component).
   - Line grid with live stock chip (green/amber/red) per item + warehouse.
   - Rate autofill from price_lists; override prompts reason.
   - Footer: totals + feasibility banner.
   - Confirm button disabled with tooltip when credit hold.
3. **Dispatch / Challans** (new `/workspace/sales/dispatch`):
   - List of confirmed/partially dispatched SOs; drawer to pick lines, qty, batch (only shown when item is batch-tracked), vehicle, transporter, e-Way bill (auto-suggest when taxable value ≥ ₹50k).
4. **Invoices** — read-mostly detail; prominent IRN/QR panel; timeline (Issued → Partial → Paid) built from `payments`; "Raise Credit Note" button gated by reason-code select.
5. **Credit Notes** (new tab) — list + create dialog.
6. **Sales Dashboard** (`/workspace/sales` index revamp):
   - KPI tiles: Booked, Dispatched, Invoiced, Collected (MTD).
   - Alert tile: credit-hold orders count.
   - Overdue receivables tile from invoices.
   - Rep-wise + product-wise leaderboards (Recharts bar).

Sidebar nav updated: Dashboard, Quotations, Sales Orders, Dispatch, Invoices, Credit Notes, Payments, Returns.

## State machine enforcement

SO transitions guarded in `confirm_sales_order` RPC and dispatch/invoice hooks. `credit_hold` is a first-class status; release requires `admin`/`finance` role via existing `has_role`.

## Out of scope (stubs only)

- Real GSTN IRN/e-Way Bill calls — `irn`/`eway_bill_no` remain manual inputs with adapter seam (matches existing GST adapter pattern).
- External AI calls — heuristics only, easy to swap later.

## Rollout order

1. Migration (schema + enum + RPCs + credit_notes tables + GRANTs + RLS).
2. Backup move of old route/feature files.
3. New api.ts hooks + shared components (`StockChip`, `CreditHoldBadge`, `IRNPanel`, `CreditNoteDialog`).
4. Rebuild Quotations, SO Booking, Dispatch, Invoices, Credit Notes, Dashboard routes.
5. Update sidebar nav.
6. Verify build.
