## Smart Maintenance & Predictive Maintenance — Module 1 (Machine Master)

This is the first phase. Your message lists Module 1 (Machine Master) in detail and outlines integrations + future modules. I'll scaffold the module foundation + Machine Master now, and we can iterate on subsequent modules (work orders, breakdowns, spare consumption, technician assignments, analytics) in follow-up turns.

### Scope (this turn)

1. **DB schema** — `machines` table (multi-tenant via `company_id`), with categories, status enum, plant link, runtime/frequency, attachments URL, notes. RLS scoped via `get_user_company` + `has_company_role` patterns already in use. Add `maintenance` to `app_module` enum if not present so module access works with existing `canAccessModule`.
2. **Sidebar nav** — add "Maintenance" entry in `AppShell` MODULES with `Wrench` icon.
3. **Routes**:
   - `_authenticated.app.maintenance.tsx` — layout w/ tabs (Overview, Machines; placeholders for Work Orders, Breakdowns, Spares, Technicians, Reports — coming next)
   - `_authenticated.app.maintenance.index.tsx` — overview cards (counts by status, low-runtime warnings)
   - `_authenticated.app.maintenance.machines.tsx` — list + create/edit dialog + RowActions delete
   - `_authenticated.app.maintenance.machines.$id.tsx` — machine profile page (details, status history placeholder, future linkages)
4. **UI**:
   - Status badges (Running / Idle / Under Maintenance / Breakdown) with color tokens
   - Inline create/edit dialog (matches existing list-page pattern)
   - Status quick-change action
5. **Integrations stubs (data model only this turn)**:
   - `production_line_id` FK → existing production line table (if present; else free text)
   - `department` text linking to HR department naming convention
   - Reserved fields & nullable FKs so subsequent modules (work orders, spare consumption → inventory, labour → finance JE, technician → employees) can attach without schema churn.

### Technical details

- Migration creates: enum `machine_status`, table `public.machines` with company-scoped RLS (admin/maintenance/production roles can write; viewers read), update trigger.
- Add `'maintenance'` to existing `app_module` enum (if not already), and grant default access to admin role on company creation hook (or assume admins always have it via existing logic — verify in `auth-context`).
- Machine list page mirrors the patterns already used in `inventory/items.tsx` and uses `RowActions`.
- No edge functions; pure client + RLS.

### Out of scope (next turns)

- Work orders (preventive + breakdown), spare part consumption hooks into inventory, labour cost JE posting, technician assignments from `employees`, low-stock procurement recommendations, dashboard KPI widgets, predictive analytics scaffolding.

### File changes

- **New migration**: `machines` table, `machine_status` enum, RLS, trigger, enum extension.
- **Edit** `src/components/AppShell.tsx`: add Maintenance nav entry.
- **Edit** `src/lib/auth-context.tsx` (only if `AppModule` type needs `"maintenance"` added).
- **New routes**: `_authenticated.app.maintenance.tsx`, `.index.tsx`, `.machines.tsx`, `.machines.$id.tsx`.

Confirm to proceed, or tell me if you'd rather I scaffold ALL planned sub-modules (machines + work orders + breakdowns + spares + technicians + analytics) end-to-end in one go (larger change, more tables).