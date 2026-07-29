# CRM Module Revamp Plan

Rebuild CRM to match the SAP-style spec (Accounts 360, Lead Inbox, Kanban with aging, AI assist, GSTIN validation, richer activities) while keeping the current UI theme (same tokens, sidebar, PageHeader, badges, cards).

Scope is strictly limited to CRM. No other module code, DB tables outside CRM/masters, or global UI will be touched. All work is additive so a revert is a clean rollback.

## Revert strategy (important)

Before starting, snapshot current CRM:
- Copy `src/features/crm/**` → `src/features/crm/_backup_pre_revamp/**` (kept in repo, unused).
- New DB objects go in ONE migration prefixed `crm_revamp_` with a matching `crm_revamp_rollback.sql` (drops added columns/tables/functions, restores prior policies). No destructive changes to existing rows.
- If you dislike the revamp: run the rollback SQL, restore files from `_backup_pre_revamp`, delete new routes. No cross-module fallout because nothing else is edited.

## Data model changes (CRM-only migration)

Additive columns / tables — existing data preserved:

- `crm_accounts` (new) — dedicated Accounts entity separate from `customers`
  - gstin, pan, billing_address, shipping_address, credit_limit, credit_days, price_list_id (FK price_lists), territory, owner_id, status, gstin_verified_at, gstin_legal_name
  - Kept separate from `customers` so Sales/Finance are untouched; a nullable `customer_id` link lets a converted account map to an existing customer without changing Sales joins.
- `crm_contacts` — add: account_id (FK crm_accounts, nullable), first_name, last_name, designation, is_primary, whatsapp_opt_in. Keep existing `name` for back-compat (computed fallback).
- `leads` — add: product_interest, territory, assigned_to, score numeric, score_factors jsonb, converted_account_id, disqualified_reason.
- `crm_activities` — add: account_id (FK crm_accounts), opportunity_id (FK crm_opportunities), gps_lat, gps_lng, due_date, channel (call/visit/whatsapp/email), check-in flag. App-level check: at least one of account_id/contact_id/opportunity_id set.
- `crm_opportunities` (new) — id, account_id, name, stage, value, probability, expected_close, owner_id, quotation_id (FK quotations, nullable), lost_reason, days_in_stage (generated), created_at.
- `crm_stage_configs` (new) — tenant-configurable lead statuses & opportunity stages with order + aging threshold days.

All new tables: standard company_id + RLS + GRANTs (authenticated CRUD, service_role all), updated_at trigger.

Extend `convert_lead_to_quotation` RPC path with a new `convert_lead` RPC that in one txn creates crm_accounts + crm_contacts + crm_opportunities and links lead. Existing RPC preserved.

## API / server functions

Add to `src/features/crm/api.ts` (no removals — old hooks stay for backup component):
- Accounts: useAccounts, useAccount(id), useSaveAccount, useAccount360(id) (aggregates open SO, outstanding invoices, recent activities, credit gauge — read-only queries only).
- Opportunities: useOpportunities, useSaveOpportunity, useMoveStage (updates stage + lost_reason, invalidates score).
- Activities: useSaveActivity extended for GPS/check-in/due_date.
- Stage config: useStageConfig, useSaveStageConfig.
- GSTIN: `validateGstin` server function (calls existing GST adapter if configured, else marks unverified — no hard external dep).
- AI (Lovable AI Gateway server functions, all under `src/features/crm/ai.functions.ts`):
  - scoreLead → score + factors[]
  - summarizeThread → structured activity from pasted text/email
  - draftQuotationFromOpportunity → draft quote payload (does NOT insert — returns draft for user confirmation)
  - churnRisk(accountId)
- Audit: every AI call writes to `audit_logs` with kind `ai_suggestion`.

## Screens (new routes, existing routes kept until swap)

New under `src/routes/_authenticated.workspace.crm.*`:

1. **Lead Inbox** (`/crm/leads` — replaces existing list)
   - Left rail filters (source, status, assigned rep, territory) using existing FilterBar patterns.
   - Card list with color-coded score badge, last-activity timestamp, channel icon.
   - Right slide-over: lead detail, AI "next best action", inline Convert button.
2. **Account 360** (`/crm/accounts/$id`)
   - Header: name, GSTIN + verified badge, credit gauge (limit vs outstanding from invoices).
   - Tabs: Overview | Contacts | Opportunities | Orders | Ledger | Activities. Orders/Ledger tabs are read-only queries against existing sales_orders/invoices/payments — no writes to those modules.
3. **Pipeline Kanban** (`/crm/pipeline` — upgrade existing)
   - Columns = opportunity stages from stage config.
   - Card shows value + days-in-stage with green→amber→red aging based on threshold.
   - Drag-drop stage change → optimistic update → background AI re-forecast.
4. **Opportunities list** (`/crm/opportunities`) — table + create/edit drawer, links to quotation.
5. **Activities** (`/crm/activities`) — existing tab enhanced: type filter, GPS map preview for visits, due-date reminders.
6. **Stage Settings** (`/crm/settings/stages`) — configure lead statuses and opportunity stages per tenant.

Mobile field-sales app is explicitly OUT of this plan (separate app per spec); the responsive web pipeline/activities screens will remain usable on phone but no separate PWA/native shell is built.

## UI theme preservation

- Reuse: PageHeader, Card, StatusBadge, KanbanBoard, FilterBar, RecordDrawer, FormDialog, existing color tokens, existing tab-chip nav in `_authenticated.workspace.crm.tsx`.
- Only additions: an AccountGauge component (credit ring) and ScoreBadge (colored pill) built with existing tokens — no new palette, no new fonts.

## Rollout order

1. Snapshot backup + migration + rollback SQL.
2. api.ts extensions + ai.functions.ts.
3. Accounts + Account 360.
4. Lead Inbox revamp + convert flow.
5. Opportunities + Pipeline aging.
6. Stage settings + Activities enhancements.
7. Wire new tabs into existing CRM layout `TABS` array (add Accounts, keep old entries).

## Out of scope (explicitly)

- No edits to Sales, Procurement, Inventory, Finance, GST, HR, Production, Maintenance, Quality, Admin.
- No changes to global layout, sidebar, auth, or theme tokens.
- No dropping of existing CRM tables/columns.
- No mobile-native app build.
