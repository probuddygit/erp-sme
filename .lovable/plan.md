# Platform Revamp — Scaffold Only (No Business Logic)

Reshape the existing ERP into a modern SAP Fiori / Zoho-inspired shell for Indian MSME Trading & Distribution. This pass is **architecture, navigation, layout, auth/RBAC, empty pages, shared components, and theme** only — no CRUD logic, no data fetching in module pages.

## Scope guardrails
- Keep existing DB, auth-context, RLS, and Supabase integration intact.
- Existing feature routes (`/app/*` sales/procurement/etc.) remain functional — we do **not** delete them. New scaffold lives alongside as the new primary shell.
- No new business logic. New module pages render an `<EmptyModule />` placeholder.

## 1. Design system refresh (`src/styles.css`)
- White background, blue primary (`hsl(217 91% 60%)` family), neutral grays, subtle borders.
- Fiori-inspired: flat surfaces, rounded-lg cards, soft shadows, generous spacing.
- Typography: Inter via `<link>` in `__root.tsx` head.
- Update semantic tokens: `--background`, `--primary`, `--sidebar-*`, `--accent`, radius `0.75rem`.

## 2. Folder structure (DDD-lite)
```
src/
  modules/
    dashboard/    pages/  components/  index.ts
    crm/          pages/  components/  index.ts
    sales/        pages/  components/  index.ts
    procurement/  ...
    inventory/    ...
    finance/      ...
    gst/          ...
    reports/      ...
    workflow/     ...
    administration/ ...
  shared/
    components/   (PageHeader, EmptyModule, StatCard, DataCard, ModuleGrid, Breadcrumbs)
    layout/       (AppLayout, TopBar, SideNav, MobileNav)
    hooks/
    types/
  lib/            (existing: auth-context, utils)
```
Existing `src/components/ui/*` (shadcn) stays.

## 3. Routing (new shell under `/workspace`)
New pathless layout `src/routes/_authenticated.workspace.tsx` renders the new `AppLayout`. Module index routes:
- `/workspace` → Dashboard
- `/workspace/crm`
- `/workspace/sales`
- `/workspace/procurement`
- `/workspace/inventory`
- `/workspace/finance`
- `/workspace/gst`
- `/workspace/reports`
- `/workspace/workflow`
- `/workspace/administration`

Each page renders `<EmptyModule title="..." description="..." />`. Existing `/app/*` routes are untouched.

## 4. Shared layout components
- **`AppLayout`** — TopBar + collapsible SideNav + main content, mobile-first drawer.
- **`TopBar`** — logo, company/branch/FY switcher (visual only), global search input (non-functional), notifications icon, user menu with sign-out.
- **`SideNav`** — icon+label modules, active state, role-gated visibility via `useAuth`. Collapsible to icon rail on desktop.
- **`MobileNav`** — bottom tab bar for top 5 modules on small screens.
- **`PageHeader`** — title, subtitle, breadcrumbs, actions slot.
- **`EmptyModule`** — icon, title, description, "Coming soon" chip.
- **`StatCard`**, **`DataCard`**, **`ModuleGrid`** — reusable primitives.

## 5. RBAC scaffold
Extend `auth-context` role → module map to cover new modules (`crm`, `gst`, `workflow`, `administration`). No DB changes. `SideNav` filters by `canAccessModule`. Non-accessible modules hidden, not disabled.

## 6. Auth
Reuse existing `_authenticated` gate and login route. Redirect authenticated users landing on `/` to `/workspace` (keep existing dashboard `/app` as legacy alias).

## 7. Not in scope this pass
- No new DB migrations.
- No CRUD, no forms, no data fetching in new module pages.
- Legacy `/app/*` UI stays as-is (can be migrated module by module in follow-ups).
- Approvals, audit logs, branches, FY switching — UI affordances only (dropdowns render static options), no persistence.

## Deliverable
User navigates to `/workspace`, sees Fiori-style shell, can click through 10 modules, each showing a polished empty state. Role-based nav filtering works. Existing app continues to function.
