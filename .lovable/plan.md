# Phase 3 & 4 — Status Check and Closure Plan

Phases 1 and 2 (outbound inventory, reservations, pick/pack/dispatch) were built and are live. Phases 3 and 4 from the same roadmap are **not implemented**. Verified against the live database and code.

## What Phase 3 & 4 were

- **Phase 3 — Banking and manual finance entry:** bank accounts, bank statement import, matching and reconciliation of customer/vendor payments, plus expense and journal-voucher screens.
- **Phase 4 — GST automation:** auto-built e-Invoice and e-Way Bill payloads on posting, and input GST ledger rows from vendor invoices (today the ledger is essentially output-only).

## Current state (verified)

- No `bank_accounts`, `bank_statement_lines`, or any reconciliation table exists; the only banking-related word in the frontend is in generated Supabase types. No reconcile/bank functions exist in the database.
- No voucher table or `post_journal`-style routine exists; Finance has ledgers and reports but no manual voucher entry backed by a posting routine.
- GST ledger holds 13 output rows from Sales and only 2 input rows from Procurement, against 5 vendor invoices — input capture is partial, not automatic.
- Of 11 invoices, only 2 carry an e-Invoice payload and IRN, and 0 delivery notes carry an e-Way Bill payload — payload creation is manual.

## Phase 3 — Banking and reconciliation

New records
- Bank accounts: name, account number, IFSC, opening balance, linked GL account, company scoped.
- Bank statement lines: date, description, reference, debit/credit, balance, import batch, match status, matched document.
- Journal vouchers and expense entries reusing the existing journal tables.

Automation
- Statement import (CSV) writes lines and auto-suggests matches on amount plus date window plus reference against customer payments, supplier payments and journals.
- Confirming a match marks the payment cleared, stamps reconciliation date, and posts the bank-side journal if not already posted.
- Reconciliation summary per bank account: book balance, statement balance, unreconciled items.
- Manual voucher posting goes through one posting routine so Trial Balance, P&L, Cash Flow and ledgers update without duplicate entry.

UI: a Banking tab group under Finance with Bank Accounts, Statement Import, Reconciliation, and a Journal Voucher form. No redesign of existing Finance pages.

## Phase 4 — GST automation

- On invoice posting, build the e-Invoice payload automatically (seller/buyer GSTIN, place of supply, HSN-wise line values, CGST/SGST/IGST/CESS, totals) and store it with a payload status. IRN and QR remain fields the provider adapter fills.
- On delivery-note dispatch, build the e-Way Bill payload automatically (transporter, vehicle, distance, consignor/consignee, value) so the e-Way Bill page always has a ready payload.
- On vendor-invoice posting, write input GST ledger rows the same way sales writes output rows, so GSTR-3B input credit is complete rather than the current 2 rows.
- Backfill payloads and input ledger rows for existing posted documents.
- GSTR-1 and GSTR-3B then read a complete ledger; no manual refresh.

## Technical notes

- All posting and payload building lives in Postgres functions and triggers, matching the Phase 1/2 pattern, so it applies regardless of which screen creates the document.
- New tables carry company scoping, grants for `authenticated` and `service_role`, and RLS mirroring the existing own-company-read / role-based-write pattern.
- Frontend adds hooks in `src/features/finance/api.ts` and `src/features/gst/gst-api.ts`; new routes follow the existing `_authenticated.workspace.finance.*` and GST route conventions.
- Query invalidation on posting so Finance, GST and dashboard views refresh.

Approve to build Phase 3 and Phase 4, or tell me to start with just one of them.
