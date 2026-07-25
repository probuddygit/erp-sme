# Platform Operator Admin Dashboard

Keep the existing `/workspace/administration` as the tenant-level settings area. Build out `/_authenticated/admin/` as a dedicated platform operator console for the SaaS operator (super_admin only). This console provides tenant lifecycle, billing, user management, system health, and global configuration.

## Current state
- `/workspace/administration` is tenant-level (Organization, Companies, Branches, Users, Roles, etc.).
- `/_authenticated/admin/` exists as a minimal Super Admin shell with two pages:
  - `admin/index.tsx` — company provisioning and plan/module toggles.
  - `admin/users.tsx` — cross-tenant user list with role assignment.
- The database has `companies`, `organizations`, `profiles`, `user_roles`, and business-module tables, but no platform-level tables for subscriptions, invoices, feature flags, or global settings.
- The super admin guard checks `isSuperAdmin` from `AuthContext`.

## 1. Database schema (single migration)

Add platform-level tables. Because these are operator-facing, they will be read/written by `supabaseAdmin` (RLS bypass) after the caller is verified as super_admin.

### New tables
- **platform_subscriptions** — `company_id`, `plan`, `status` (active/trial/cancelled/past_due), `billing_email`, `seats`, `monthly_price`, `starts_at`, `ends_at`, `trial_ends_at`, `metadata`.
- **platform_invoices** — `company_id`, `subscription_id`, `amount`, `tax`, `status` (draft/open/paid/void), `due_date`, `paid_at`, `invoice_number`.
- **platform_settings** — `key` (PK), `value` (jsonb), `description`, `updated_at`. Used for global defaults (email gateway, signup mode, default modules, maintenance banner).
- **feature_flags** — `key` (PK), `enabled`, `target` (global/company/plan), `target_value`, `description`.
- **platform_audit_logs** — `actor_id`, `action`, `entity`, `entity_id`, `metadata`, `ip`, `created_at`. Operator-only audit trail.
- **email_templates** — `key`, `subject`, `body_html`, `body_text`, `description` (global templates for operator-managed emails).

### Enum additions
- `subscription_status` enum: `active`, `trial`, `cancelled`, `past_due`, `suspended`.
- `invoice_status` enum: `draft`, `open`, `paid`, `void`.

### Functions & policies
- `is_super_admin(_user_id uuid)` — already exists; ensure `authenticated` can execute.
- `log_platform_audit(...)` — SECURITY DEFINER helper to append to `platform_audit_logs`.
- RLS: platform tables restrict `SELECT/INSERT/UPDATE/DELETE` to service_role only; the operator console uses `supabaseAdmin` after verifying `isSuperAdmin`.
- GRANT `ALL` on each new table to `service_role`.

### Seed
- Seed `platform_settings` keys: `default_modules`, `signup_mode`, `email_from`, `support_email`, `maintenance_banner`.
- Seed `feature_flags`: `new_reports`, `ai_copilot`, `maintenance_module`, `multi_currency`.
- Seed one `platform_invoices` and `platform_subscriptions` row per existing company so the dashboard has real data.

## 2. Server functions (`src/features/admin-platform/*.functions.ts`)

All functions require `requireSupabaseAuth` and explicitly verify `isSuperAdmin` before using `supabaseAdmin`.

- `getPlatformDashboardMetrics()` — tenant count, active users, MRR, trial count, open invoices, today's logins.
- `listTenants({ search, plan, status, page, limit })` — companies + organization + subscription.
- `getTenantDetails({ companyId })` — company, org, branches, users, subscription, invoices.
- `createTenant({ name, slug, plan, ownerEmail, ownerFullName, ownerPassword })` — create company + owner profile + user_roles + subscription + audit log.
- `updateTenant({ companyId, plan, isActive, enabledModules })` — update company + subscription + audit log.
- `suspendTenant({ companyId, reason })` — set `is_active=false`, subscription status `suspended`, audit log.
- `listAllUsers({ search, companyId, role, page, limit })` — profiles + companies + roles.
- `updateUserRoles({ userId, roles })` — idempotent replace of `user_roles` for the user, restricted to admin/super_admin/manager/viewer.
- `resetUserPassword({ userId })` — generate a password reset link/ticket via `supabaseAdmin.auth.admin.generateLink` and optionally send email.
- `impersonateUser({ userId })` — generate a one-time sign-in link for support (logged).
- `listSubscriptions({ status, plan })` and `updateSubscription({ subscriptionId, plan, status, endsAt })`.
- `listInvoices({ companyId, status })`, `createInvoice({ companyId, amount, dueDate })`, `markInvoicePaid({ invoiceId })`.
- `getPlatformSettings()`, `updatePlatformSetting({ key, value })`.
- `listFeatureFlags()`, `updateFeatureFlag({ key, enabled, target, targetValue })`.
- `listPlatformAuditLogs({ action, entity, limit })`, `logPlatformAudit({ action, entity, entityId, metadata })`.
- `getSystemHealth()` — returns recent error counts, slow queries, storage usage (where available from Supabase). For now, synthetic metrics from `audit_logs` and `platform_audit_logs`.

## 3. Routing (`src/routes/_authenticated.admin.*`)

Convert the existing `admin.tsx` guard into a proper operator layout with a sidebar, then add child routes.

- `_authenticated.admin.tsx` — Super Admin layout with `<Outlet />` and a vertical navigation rail.
- `_authenticated.admin.index.tsx` — renamed/overhauled to `/admin` platform dashboard.
  - KPI cards: Tenants, Active Users, MRR, Open Invoices, Trial Conversions.
  - Charts: tenants by plan, MRR trend, sign-ups over time (last 30 days).
  - Recent activity feed from `platform_audit_logs`.
- `_authenticated.admin.tenants.tsx` — `/admin/tenants` — full tenant list with search, filters, status, plan, actions (view, edit, suspend, impersonate owner).
- `_authenticated.admin.tenants.$id.tsx` — `/admin/tenants/$id` — tenant detail with tabs (Overview, Users, Subscriptions, Invoices, Audit).
- `_authenticated.admin.users.tsx` — `/admin/users` — overhauled cross-tenant user list with search, company filter, role badges, reset-password, role editor.
- `_authenticated.admin.billing.tsx` — `/admin/billing` — subscriptions and invoices, mark-paid, create invoice, plan changes.
- `_authenticated.admin.settings.tsx` — `/admin/settings` — global settings editor (key/value jsonb), email defaults, maintenance banner.
- `_authenticated.admin.feature-flags.tsx` — `/admin/feature-flags` — toggle flags globally or per company/plan.
- `_authenticated.admin.audit.tsx` — `/admin/audit` — platform operator audit logs.
- `_authenticated.admin.health.tsx` — `/admin/health` — system health dashboard (synthetic metrics, recent errors, API request volume).

## 4. UI components (`src/features/admin-platform/`)

- `PlatformLayout.tsx` — sidebar + top bar for operator console. Distinct visual identity (darker top bar, operator badge) so it is never confused with the tenant workspace.
- `PlatformNav.tsx` — navigation items for the operator console.
- `KpiCard.tsx` and `MetricChart.tsx` — reused from shared dashboard components.
- `TenantList.tsx`, `TenantDetail.tsx`, `TenantForm.tsx`.
- `UserList.tsx`, `UserRoleEditor.tsx`, `PasswordResetDialog.tsx`.
- `SubscriptionList.tsx`, `InvoiceList.tsx`, `InvoiceForm.tsx`.
- `SettingsEditor.tsx`, `FeatureFlagEditor.tsx`.
- `AuditLogTable.tsx`, `SystemHealthPanel.tsx`.

## 5. Security & RBAC

- All operator routes remain under `/_authenticated/admin` and reuse the existing `isSuperAdmin` guard.
- Every server function verifies `isSuperAdmin` via `context.supabase` + `public.is_super_admin(context.userId)` before invoking `supabaseAdmin`.
- Operator actions are written to `platform_audit_logs` with actor and IP where available.
- No PII is returned in list endpoints beyond what is necessary for admin operations.
- Use `supabaseAdmin` for writes to platform tables; use `context.supabase` for reads where the user is authenticated and the policy allows.

## 6. Navigation & access

- Add a discreet "Operator Console" link in the main workspace TopBar or user menu, visible only to `super_admin`.
- Inside the operator console, keep a clear "Back to Workspace" link.
- The console URL path remains `/admin/*` for the platform operator and `/workspace/administration/*` for tenant admins.

## 7. Out of scope

- Real payment gateway integration (Stripe/Paddle); invoices are records only.
- Real email sending; the UI prepares templates and records intent.
- Advanced monitoring (Datadog/New Relic); health page uses synthetic/derived data.

## 8. Delivery order

1. Database migration (platform tables + seed data).
2. Server functions for dashboard, tenants, users, billing, settings, audit, health.
3. Operator layout and navigation.
4. Platform dashboard (`/admin`).
5. Tenant management (`/admin/tenants`, `/admin/tenants/$id`).
6. User management overhaul (`/admin/users`).
7. Billing (`/admin/billing`).
8. Settings, feature flags, audit, health.
9. TopBar operator link and navigation polish.
10. Security review and audit logging.