# Phase 1 & 2 — Outbound Inventory and Warehouse Fulfilment

Approved scope: close the two structural gaps found in the integration review — sales never reduces stock, and there is no reservation/picking/packing/dispatch chain. Later phases (banking, live dashboards, AI) stay out of this build.

## Phase 1 — Sales must move inventory and cost

- Posting a Delivery Note (status dispatched or delivered) automatically:
  - issues stock for every line, depleting batches oldest-first through the existing issue routine
  - consumes the matching reservation for that sales order
  - increases dispatched quantity on the sales order line and moves the order to Partially Dispatched / Dispatched
  - books the Cost of Goods Sold entry (COGS Dr / Inventory Cr) at actual batch cost
  - stamps inventory and financial posting status on the document
- An invoice posted with no delivery note for its order does the same, so stock can never be bypassed. When a delivery note already moved the goods, the invoice is marked "not applicable" instead of double-issuing.
- Item resolution falls back to matching the invoice line against item name or SKU when the line is not linked to an order line.

## Phase 2 — Reservation, picking, packing, dispatch

New records
- Stock reservations: quantity of an item held in a warehouse for a specific sales order, with consumed quantity and status.
- Pick lists and pick list lines: what the warehouse must pick, requested vs picked quantity, optional bin.
- Packing slips: packages, gross weight, packing status against a pick list.
- Dispatches: vehicle, transporter, driver and dispatch time, linked to the delivery note.

New automation
- Confirming a Sales Order runs one transactional step: validate customer credit, check availability, reserve stock, generate the pick list, notify the warehouse, and write the document event. Failing credit puts the order on credit hold with the reason recorded.
- Availability is reported as on hand minus active reservations, so Inventory shows what can actually be promised. Shortages are returned with the confirmation result instead of silently over-committing.
- Reservations are released as they are consumed by dispatch.

## What stays unchanged

No UI redesign. New capability attaches to existing pages: a Confirm action and reservation/shortage feedback on Sales Orders, pick list and dispatch views under Sales, an Available column alongside On Hand in Inventory.

## Technical notes

- All posting logic lives in Postgres functions and triggers so it applies no matter which screen or import creates the document.
- New tables carry company scoping, grants for authenticated and service_role, and RLS mirroring the existing pattern (own company read; admin/manager/sales/production write).
- `confirm_sales_order` is corrected to use the `approved` order status — the current version sets a status value that does not exist in the order status list and fails.
- New functions: `item_availability`, `default_warehouse`, `reserve_stock_for_order`, `generate_pick_list`, `consume_reservation`, plus delivery-note and invoice stock-issue triggers.
- Frontend: new API hooks for reservations, pick lists and dispatches; Sales Order and Delivery Note screens call the RPCs and invalidate inventory, finance and dashboard queries after posting.

Switch to build mode to apply the database migration and the accompanying UI wiring.
