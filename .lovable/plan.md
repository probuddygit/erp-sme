# Enterprise Authentication & RBAC

Leverages existing `profiles`, `companies`, `user_roles`, `app_role` schema. Adds organization, branches, financial years, invitations, permissions, audit log. New auth surfaces live under `/auth/*` and `/onboarding/*`. Legacy `/app` and `/workspace` shells remain.

## 1. Database (single migration)

### New tables
- **organizations** — tenant root above companies. `name`, `slug`, `owner_id`, `plan`, `status`, timestamps.
- **companies** (extend existing) — add `organization_id`, `legal_name`, `gstin`, `pan`, `state_code`, `country`, `currency`, `address`, `logo_url`.
- **branches** — `company_id`, `name`, `code`, `gstin`, `state_code`, `address`, `is_head_office`, `is_active`.
- **financial_years** — `company_id`, `name` (e.g. "FY 2025-26"), `start_date`, `end_date`, `is_active`, `is_closed`.
- **permissions** — catalog of permission keys (`module.action`, e.g. `sales.view`, `sales.create`, `sales.approve`).
- **role_permissions** — maps `app_role` → `permission_key` (defaults per role).
- **user_permission_overrides** — grant/revoke specific perms per user in a company (optional overlay).
- **invitations** — `organization_id`, `company_id`, `email`, `role`, `token_hash`, `invited_by`, `status` (pending/accepted/revoked/expired), `expires_at`, `accepted_at`.
- **audit_logs** — `organization_id`, `company_id`, `user_id`, `action`, `entity`, `entity_id`, `metadata jsonb`, `ip`, `user_agent`, `created_at`.

### Enum additions
- `app_role`: add `owner`, `manager`, `viewer` (keep existing).
- `invitation_status`, `fy_status` enums.

### Functions & policies
- `has_permission(_user_id, _company_id, _perm_key)` — SECURITY DEFINER, checks role_permissions + overrides.
- `current_user_orgs()`, `current_user_companies()` helpers.
- Update `handle_new_user` to skip profile.company_id (company assigned via onboarding).
- RLS: every new table scoped by org/company; org rows readable by members; audit_logs insert-only by service or via SECURITY DEFINER function.
- GRANT SELECT/INSERT/UPDATE/DELETE per policy on each table.

### Seed
- Insert baseline permission catalog for 10 modules × common actions (view/create/update/delete/approve/export).
- Insert default `role_permissions` mapping.

## 2. Auth routes (`src/routes/auth/*`)

Public routes (top-level, no auth gate):
- `/auth/login` — email+password + Google.
- `/auth/register` — creates user + organization in same server fn.
- `/auth/forgot-password` — `resetPasswordForEmail`.
- `/auth/reset-password` — updates password (handles `type=recovery` hash).
- `/auth/verify-email` — landing after email confirmation link.
- `/auth/accept-invite` — token param → validates + creates membership.

Replace legacy `/login` with redirect to `/auth/login`.

## 3. Onboarding wizard (`/onboarding/*`, authenticated)

Multi-step for users whose organization has no company yet:
- `/onboarding/company` — legal name, GSTIN, PAN, state, currency, logo.
- `/onboarding/branch` — head office branch (auto-created; user may add more).
- `/onboarding/financial-year` — FY start month/date, generates current FY.
- `/onboarding/invite` — optional email invitations.
- `/onboarding/complete` → `/workspace`.

Gate: if `profile.company_id` null AND user owns an org without companies, force `/onboarding/company`.

## 4. Server functions

Under `src/features/auth/*.functions.ts` and `src/features/org/*.functions.ts`:
- `registerOrganization({ orgName, fullName })` — post-signup finalizer.
- `createCompany(...)`, `createBranch(...)`, `createFinancialYear(...)`.
- `inviteUser({ email, role, companyId })` — creates invitation row, sends email via existing auth email infra (magic link with token).
- `acceptInvitation({ token })` — validates hash, creates `user_roles` row, updates profile.
- `revokeInvitation`, `resendInvitation`.
- `listBranches`, `listFinancialYears`, `switchActiveFY`.
- All use `requireSupabaseAuth`, write audit_logs.

## 5. RBAC middleware & hooks

- **Server**: `requirePermission(permKey)` middleware factory — chains on `requireSupabaseAuth`, resolves company from request context, throws 403 if `has_permission` returns false.
- **Client**: `usePermission(key)` hook + `<Can permission="...">` component reading from auth context (fetched via `getMyPermissions` server fn on login, cached in React Query).
- **Route guards**: each `_authenticated/workspace/<module>` route calls `beforeLoad` → checks permission via context; unauthorized → `/unauthorized` page.
- Add `<Unauthorized />` route.

## 6. Auth context updates

Extend `AuthProvider` with:
- `organization`, `branches[]`, `activeBranch`, `financialYears[]`, `activeFinancialYear`, `permissions: Set<string>`, `hasPermission(key)`.
- Branch & FY switchers in TopBar (already scaffolded UI) wired to real data.

## 7. Email

Use existing auth email infra (already scaffolded per `authentication-emails-guide`). Add:
- Invitation email (transactional) — accept URL with token.
- If auth email infra not yet configured, call `email_domain--check_email_domain_status` and scaffold if missing.

## 8. Files to add/edit (high level)

New:
- `src/routes/auth/login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx`, `accept-invite.tsx`, `route.tsx` (public layout).
- `src/routes/_authenticated/onboarding.*.tsx` (5 files).
- `src/routes/_authenticated/unauthorized.tsx`.
- `src/features/auth/*.functions.ts`, `src/features/org/*.functions.ts`.
- `src/features/rbac/{permissions.ts, use-permission.ts, Can.tsx, require-permission.ts}`.
- `src/shared/components/wizard/{Stepper.tsx, WizardShell.tsx}`.

Edit:
- `src/lib/auth-context.tsx` — load org/branches/FYs/perms.
- `src/shared/layout/TopBar.tsx` — wire real switchers.
- `src/routes/index.tsx`, `src/routes/login.tsx` — redirect to `/auth/login`.
- `src/routes/_authenticated/route.tsx` if needed for onboarding gate.

## Out of scope (per user)
- No business module logic.
- No reporting/dashboard data.

## Delivery order
1. Migration (schema + permission seed).
2. Server fns for auth/org/invitation.
3. Auth pages (`/auth/*`).
4. Onboarding wizard.
5. RBAC middleware + hooks + route guards.
6. Auth context wiring + TopBar switchers.
7. Invitation email template.
