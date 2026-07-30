## What "On Hand" actually reads

The Items grid does not sum transactions. It calls the `item_stock_levels` function, which returns, per item and warehouse:

`on_hand = SUM(stock_batches.qty_remaining)` and `value = SUM(qty_remaining × (unit_cost + landed_cost_per_unit))`

So an item shows 0 until at least one **stock batch** exists for it.

## The workflow that creates batches

```text
Purchase Order ──► GRN (draft) ──► GRN posted ──► post_stock_receipt()
                                                    └─► stock_batches row (+qty_remaining)
                                                    └─► stock_transactions ledger row
                                                    └─► journal entry (Inventory Dr / AP Cr)

Other inbound: Production Output (FG), Stock Adjustment (+ variance),
               Stock Transfer In, Opening Stock
Outbound (reduces qty_remaining): Delivery Note / Invoice issue,
               Material Consumption, Adjustment (−), Transfer Out
```

Requirements for a GRN line to hit stock (all must be true, verified in the trigger):
1. GRN status = `posted`
2. Line has a linked **item_id** (not just a typed item name)
3. A warehouse is set on the line or the GRN header
4. Quantity > 0

## Current state in your data (verified)

| Company | Items | Batches | Why |
|---|---|---|---|
| Guru Auto | 7 | 2 (Steel Sheet 2mm 1,850; Brake Assembly 100) | GRN-2026-0001 posted with a linked item — worked correctly |
| Pops Auto | 4 | 0 | GRN-26-72542 is posted but its line has **item_id = NULL** ("New Item 1" typed as free text) → trigger skipped |
| John Auto | 3 | 0 | No GRNs / no receipts at all |

So the 0s you see are two different things: items that genuinely have no receipts yet, and a real defect where a posted GRN silently produced no stock because the line wasn't linked to a master item.

## Proposed fixes

1. **Make item linkage mandatory in the GRN line editor** — the item picker must resolve to a master item; block posting when any line has no `item_id`, with a clear inline error instead of a silent no-op.
2. **Warn on post** — if a GRN is about to post with lines that cannot affect stock (no item or no warehouse), show a confirm/blocking message naming those lines.
3. **Backfill the stuck Pops Auto GRN** — either link "New Item 1" to a real item and re-trigger the receipt, or reverse and re-enter it, so its stock lands in the batch table.
4. **Surface the source on the Items page** — small "Last receipt" / "no receipts yet" hint on 0-qty rows so an empty item is distinguishable from a broken posting.
5. **Optional seed** — post sample opening-stock receipts for John Auto and Pops Auto items so Inventory, Valuation and Reports show meaningful numbers.

## Technical notes

- Function: `public.item_stock_levels(_company_id)` — batch-based, security definer, tenant-checked.
- Trigger: `tg_grn_item_to_stock` on `grn_items` → `post_stock_receipt(...)`; it is a no-op when `item_id IS NULL`, which is exactly the silent failure above.
- Frontend: `src/features/inventory/api.ts` (`useStockLevels`), `src/routes/_authenticated.workspace.inventory.items.tsx`, GRN form under `src/features/procurement/`.
- No schema change is required for fixes 1, 2 and 4; fix 3 is a data operation.
