# SAP-style Integration: Current Status and Gap Closure

## Verified status (checked against the live database and code)

Already implemented
- Universal document metadata on transaction tables: status, workflow status, approval status, financial/inventory/GST/notification posting status, source document kind + id, version, created/modified by. Present on quotations, sales orders, delivery notes, invoices, payments, indents, RFQs, POs, GRNs, vendor invoices, returns.
- Document history, events, links, comments, attachments tables plus the lineage dialog in the UI.
- Auto journal posting (108 triggers total) for: sales invoice, customer payment, GRN, vendor invoice, supplier payment, payroll run, sales return, vendor return, material consumption.
- GST output ledger written automatically from sales invoices (15 ledger rows present); e-Invoice / e-Way payload columns and screens exist.
- Inbound inventory automation: GRN → stock batch + stock ledger + reorder check; production output, cycle count, consumption, vendor return all post stock.
- Procure-to-Pay chain: Indent → RFQ → PO → GRN → Vendor Invoice → Payment with conversions and approvals.
- Approval engine, workflow rules/escalation/notification configuration, audit logs.

Confirmed gaps
1. Outbound inventory is missing. No function or trigger reduces stock for a Delivery Note or Invoice — sales never touch the stock ledger, so no COGS entry, no batch/serial depletion.
2. No reservation model at all: no allocation, reserved-quantity, pick list, packing or dispatch tables/steps.
3. Sales Order creation does not run the automation chain (credit validation exists as an RPC but is not enforced on create; no ATP check, no reservation, no warehouse notification, no pick list).
4. No bank reconciliation and no bank statement model; cash flow is derived only from journal lines.
5. Dashboard still renders from a dummy-data module, not live ledger/inventory aggregates.
6. e-Invoice IRN generated on only 2 of 11 invoices and is a manual action; not triggered automatically on invoice posting.
7. No budget reservation or expected-receipt object on Purchase Orders.
8. Notification fan-out exists only for alerts; approvals, escalations, email/WhatsApp/push dispatch are configuration-only.
9. No AI integration anywhere in the app (no AI calls in the codebase) — lead scoring, forecasting, NL queries, executive summaries are all absent.

## Plan

### Phase 1 — Close the outbound inventory hole (highest impact)
- Add `post_stock_issue` wiring for delivery notes and for invoices shipped without a delivery note, with batch/serial depletion in FIFO order.
- Post the COGS journal (Cost of Goods Sold Dr / Inventory Cr) in the same trigger, and stamp `inventory_posting_status`.
- Block posting when available stock is insufficient, with a clear message naming the lines.

### Phase 2 — Reservation, picking, packing, dispatch
- New tables: `stock_reservations`, `pick_lists` + lines, `packing_slips`, `dispatches`, each with the universal metadata columns.
- Sales Order confirmation runs one transactional RPC: credit check → availability check → reserve stock → create allocation → generate pick list → notify warehouse → record document events.
- Reserved and available quantities surfaced in Inventory (available = on hand − reserved).
- Delivery Note consumes the reservation instead of double-counting.

### Phase 3 — Finance and banking completion
- `bank_accounts` and `bank_statement_lines` with an import + match screen; reconciliation marks payments cleared and updates cash position.
- Expense entry and journal voucher screens posting through the existing `post_journal`.
- Customer and vendor ledger views driven from journal lines and open items.

### Phase 4 — GST and document compliance automation
- Auto-build e-Invoice and e-Way Bill payloads on invoice/delivery-note posting, set `gst_status`, keep manual IRN generation as the submit action.
- Input GST ledger rows from vendor invoices (currently output-only).

### Phase 5 — Live dashboards, reports and notifications
- Replace dummy dashboard data with live aggregates: revenue, purchases, inventory value, AR/AP outstanding, cash position, margins, top customers/products, low stock, pending orders.
- Query invalidation on every posting mutation so dashboards and reports refresh with no manual action.
- Notification fan-out on approval request, approval decision, escalation and posting failures, delivered in-app; email/WhatsApp dispatch behind the existing channel settings.

### Phase 6 — AI services
- One reusable AI service endpoint with per-module context builders: lead summary and scoring, quotation drafting and cross/upsell, demand forecast and reorder suggestion, vendor recommendation, cash-flow forecast and anomaly flags, executive summary and natural-language report queries, workflow and role suggestions.

## Technical notes
- All posting logic stays in Postgres functions/triggers so it applies regardless of entry point; the UI only calls RPCs.
- New tables follow the existing tenant pattern: company scoping, grants for authenticated/service_role, RLS with `is_super_admin` / `get_user_company` / `has_company_role`.
- No UI redesign: new capabilities attach to existing Sales, Inventory, Finance, GST and Dashboard pages as tabs, actions and columns.
- AI runs through the Lovable AI gateway from server functions; no keys in the client.

## Suggested order
Phase 1 and 2 first — until sales issues stock, inventory, COGS, margins and dashboards are all structurally wrong. Phases 3-5 then make finance and reporting self-updating; Phase 6 is additive.
