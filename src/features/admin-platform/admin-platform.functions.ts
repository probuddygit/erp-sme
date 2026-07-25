import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { getRequestHeader } from '@tanstack/react-start/server';
import { z } from 'zod';
import type { AppModule } from '@/lib/auth-context';

const PLANS = ['trial', 'starter', 'pro', 'enterprise'] as const;
const SUBSCRIPTION_STATUSES = ['active', 'trial', 'cancelled', 'past_due', 'suspended'] as const;
const INVOICE_STATUSES = ['draft', 'open', 'paid', 'void'] as const;

async function requireSuperAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase
    .rpc('is_super_admin', { _user_id: context.userId });
  if (error || !isAdmin) {
    throw new Response('Forbidden', { status: 403 });
  }
}

async function loadAdminClient() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin;
}

function logAudit(supabase: any, actorId: string, action: string, entity: string, entityId: string | null, metadata: Record<string, unknown> = {}) {
  return supabase.rpc('log_platform_audit', {
    _actor_id: actorId,
    _action: action,
    _entity: entity,
    _entity_id: entityId ?? null,
    _metadata: metadata,
  }).catch((err: any) => {
    console.error('Failed to log platform audit', err);
  });
}

export const getPlatformDashboardMetrics = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    const [companies, users, subscriptions, openInvoices, todayLogins] = await Promise.all([
      admin.from('companies').select('id', { count: 'exact', head: true }),
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('platform_subscriptions').select('id, status, monthly_price'),
      admin.from('platform_invoices').select('id, amount').eq('status', 'open'),
      admin.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'USER_LOGIN').gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    ]);

    const mrr = (subscriptions.data ?? []).reduce((sum, s) => sum + (Number(s.monthly_price) || 0), 0);
    const trialCount = (subscriptions.data ?? []).filter((s) => s.status === 'trial').length;

    return {
      tenantCount: companies.count ?? 0,
      userCount: users.count ?? 0,
      mrr,
      trialCount,
      openInvoiceCount: openInvoices.data?.length ?? 0,
      openInvoiceAmount: (openInvoices.data ?? []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
      todayLoginCount: todayLogins.count ?? 0,
    };
  });

const listTenantsSchema = z.object({
  search: z.string().optional(),
  plan: z.enum(PLANS).optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const listTenants = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => listTenantsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    let query = admin
      .from('companies')
      .select('id, name, slug, plan, is_active, enabled_modules, created_at, organization_id, organizations!inner(id, name, owner_id)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (data.search) {
      query = query.or(`name.ilike.%${data.search}%,slug.ilike.%${data.search}%`);
    }
    if (data.plan) {
      query = query.eq('plan', data.plan);
    }

    const from = (data.page - 1) * data.limit;
    const to = from + data.limit - 1;
    query = query.range(from, to);

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);

    const companyIds = (rows ?? []).map((r: any) => r.id);
    let subs: Record<string, any> = {};
    if (companyIds.length > 0) {
      const { data: subRows } = await admin
        .from('platform_subscriptions')
        .select('company_id, status, seats, monthly_price, trial_ends_at')
        .in('company_id', companyIds);
      subs = Object.fromEntries((subRows ?? []).map((s: any) => [s.company_id, s]));
    }

    const mapped = (rows ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      plan: r.plan,
      isActive: r.is_active,
      enabledModules: r.enabled_modules as AppModule[],
      createdAt: r.created_at,
      organization: r.organizations as any,
      subscription: subs[r.id] ?? null,
    }));

    return { rows: mapped, count: count ?? 0, page: data.page, limit: data.limit };
  });

const getTenantSchema = z.object({ companyId: z.string().uuid() });

export const getTenantDetails = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => getTenantSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    const { data: company, error: companyError } = await admin
      .from('companies')
      .select('*, organizations(*)')
      .eq('id', data.companyId)
      .maybeSingle();
    if (companyError) throw new Error(companyError.message);
    if (!company) throw new Response('Tenant not found', { status: 404 });

    const [{ data: branches }, { data: users }, { data: subscription }, { data: invoices }] = await Promise.all([
      admin.from('branches').select('*').eq('company_id', data.companyId).order('is_head_office', { ascending: false }),
      admin.from('profiles').select('id, full_name, email, username, created_at').eq('company_id', data.companyId),
      admin.from('platform_subscriptions').select('*').eq('company_id', data.companyId).maybeSingle(),
      admin.from('platform_invoices').select('*').eq('company_id', data.companyId).order('created_at', { ascending: false }),
    ]);

    return {
      company,
      branches: branches ?? [],
      users: users ?? [],
      subscription: subscription ?? null,
      invoices: invoices ?? [],
    };
  });

const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  plan: z.enum(PLANS).default('trial'),
  ownerEmail: z.string().email(),
  ownerFullName: z.string().min(2),
  ownerPassword: z.string().min(8),
});

export const createTenant = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createTenantSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    const { data: existingSlug } = await admin.from('companies').select('id').eq('slug', data.slug).maybeSingle();
    if (existingSlug) throw new Error('Company slug already taken');

    const defaultModules: AppModule[] = ['sales', 'procurement', 'inventory', 'finance', 'reports'];

    const { data: company, error: companyError } = await admin
      .from('companies')
      .insert({
        name: data.name,
        slug: data.slug,
        plan: data.plan as any,
        legal_name: data.name,
        is_active: true,
        enabled_modules: defaultModules,
      })
      .select('*')
      .single();
    if (companyError || !company) throw new Error(companyError?.message ?? 'Failed to create company');

    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({ name: data.name, slug: `${data.slug}-org`, owner_id: context.userId })
      .select('*')
      .single();
    if (orgError || !org) {
      await admin.from('companies').delete().eq('id', company.id);
      throw new Error(orgError?.message ?? 'Failed to create organization');
    }

    await admin.from('companies').update({ organization_id: org.id }).eq('id', company.id);

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: data.ownerEmail,
      password: data.ownerPassword,
      email_confirm: true,
      user_metadata: { full_name: data.ownerFullName },
    });
    if (authError || !authUser) {
      await admin.from('companies').delete().eq('id', company.id);
      await admin.from('organizations').delete().eq('id', org.id);
      throw new Error(authError?.message ?? 'Failed to create owner user');
    }

    await admin.from('profiles').upsert({
      id: authUser.user.id,
      full_name: data.ownerFullName,
      email: data.ownerEmail,
      company_id: company.id,
    });

    await admin.from('user_roles').insert([
      { user_id: authUser.user.id, role: 'owner', company_id: null },
      { user_id: authUser.user.id, role: 'admin', company_id: company.id },
    ]);

    await admin.from('organizations').update({ owner_id: authUser.user.id }).eq('id', org.id);

    const monthlyPrice = data.plan === 'trial' ? 0 : data.plan === 'starter' ? 99 : data.plan === 'pro' ? 299 : 599;
    const { data: subscription } = await admin
      .from('platform_subscriptions')
      .insert({
        company_id: company.id,
        plan: data.plan,
        status: 'trial',
        billing_email: data.ownerEmail,
        seats: 1,
        monthly_price: monthlyPrice,
        trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      })
      .select('*')
      .single();

    await admin.from('platform_invoices').insert({
      company_id: company.id,
      subscription_id: subscription?.id ?? null,
      invoice_number: `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${company.id.slice(0, 8)}`,
      amount: 0,
      tax: 0,
      status: 'draft',
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    });

    await logAudit(context.supabase, context.userId, 'TENANT_CREATED', 'company', company.id, {
      name: data.name,
      slug: data.slug,
      plan: data.plan,
      ownerEmail: data.ownerEmail,
    });

    return { company, organization: org, subscription };
  });

const updateTenantSchema = z.object({
  companyId: z.string().uuid(),
  plan: z.enum(PLANS).optional(),
  isActive: z.boolean().optional(),
  enabledModules: z.array(z.string()).optional(),
});

export const updateTenant = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateTenantSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    const update: any = {};
    if (data.plan !== undefined) update.plan = data.plan;
    if (data.isActive !== undefined) update.is_active = data.isActive;
    if (data.enabledModules !== undefined) update.enabled_modules = data.enabledModules;

    const { data: company, error } = await admin
      .from('companies')
      .update(update)
      .eq('id', data.companyId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    if (data.plan !== undefined) {
      const monthlyPrice = data.plan === 'trial' ? 0 : data.plan === 'starter' ? 99 : data.plan === 'pro' ? 299 : 599;
      await admin
        .from('platform_subscriptions')
        .update({ plan: data.plan, monthly_price: monthlyPrice })
        .eq('company_id', data.companyId);
    }

    await logAudit(context.supabase, context.userId, 'TENANT_UPDATED', 'company', data.companyId, {
      plan: data.plan,
      isActive: data.isActive,
      enabledModules: data.enabledModules,
    });

    return company;
  });

const suspendTenantSchema = z.object({
  companyId: z.string().uuid(),
  reason: z.string().min(1),
});

export const suspendTenant = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => suspendTenantSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    await admin.from('companies').update({ is_active: false }).eq('id', data.companyId);
    await admin
      .from('platform_subscriptions')
      .update({ status: 'suspended' })
      .eq('company_id', data.companyId);

    await logAudit(context.supabase, context.userId, 'TENANT_SUSPENDED', 'company', data.companyId, { reason: data.reason });
    return { ok: true };
  });

const listAllUsersSchema = z.object({
  search: z.string().optional(),
  companyId: z.string().uuid().optional(),
  role: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const listAllUsers = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => listAllUsersSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    let query = admin
      .from('profiles')
      .select('id, full_name, email, username, company_id, created_at, companies(id, name)')
      .order('created_at', { ascending: false });

    if (data.search) {
      query = query.or(`full_name.ilike.%${data.search}%,email.ilike.%${data.search}%,username.ilike.%${data.search}%`);
    }
    if (data.companyId) {
      query = query.eq('company_id', data.companyId);
    }

    const from = (data.page - 1) * data.limit;
    const to = from + data.limit - 1;
    const { data: rows, error, count } = await query.range(from, to);
    if (error) throw new Error(error.message);

    const userIds = (rows ?? []).map((r: any) => r.id);
    let roles: Record<string, string[]> = {};
    if (userIds.length > 0) {
      const { data: roleRows } = await admin.from('user_roles').select('user_id, role').in('user_id', userIds);
      if (data.role) {
        roles = Object.fromEntries(
          (roleRows ?? [])
            .filter((r: any) => r.role === data.role)
            .reduce((acc: Map<string, string[]>, r: any) => {
              const list = acc.get(r.user_id) ?? [];
              list.push(r.role);
              acc.set(r.user_id, list);
              return acc;
            }, new Map())
            .entries()
        );
      } else {
        roles = (roleRows ?? []).reduce((acc: Record<string, string[]>, r: any) => {
          acc[r.user_id] = acc[r.user_id] ?? [];
          acc[r.user_id].push(r.role);
          return acc;
        }, {});
      }
    }

    const mapped = (rows ?? []).map((r: any) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      username: r.username,
      company: r.companies,
      companyId: r.company_id,
      createdAt: r.created_at,
      roles: roles[r.id] ?? [],
    }));

    return { rows: mapped, count: count ?? 0, page: data.page, limit: data.limit };
  });

const updateUserRolesSchema = z.object({
  userId: z.string().uuid(),
  roles: z.array(z.string()).min(1),
  companyId: z.string().uuid().optional(),
});

export const updateUserRoles = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateUserRolesSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    const { data: profile } = await admin.from('profiles').select('id, company_id').eq('id', data.userId).maybeSingle();
    if (!profile) throw new Response('User not found', { status: 404 });

    const targetCompanyId = data.companyId ?? profile.company_id;
    if (!targetCompanyId) throw new Error('User has no company; assign a company first');

    await admin.from('user_roles').delete().eq('user_id', data.userId).eq('company_id', targetCompanyId);

    const inserts = data.roles.map((role) => ({
      user_id: data.userId,
      role: role as any,
      company_id: targetCompanyId,
    }));
    const { error } = await admin.from('user_roles').insert(inserts as any);
    if (error) throw new Error(error.message);

    await logAudit(context.supabase, context.userId, 'USER_ROLES_UPDATED', 'user', data.userId, { roles: data.roles, companyId: targetCompanyId });
    return { ok: true };
  });

const resetUserPasswordSchema = z.object({ userId: z.string().uuid() });

export const resetUserPassword = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => resetUserPasswordSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    const { data: profile } = await admin.from('profiles').select('email').eq('id', data.userId).maybeSingle();
    if (!profile?.email) throw new Error('User has no email');

    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: profile.email,
      options: { redirectTo: `${process.env.APP_URL ?? 'http://localhost:8080'}/auth/reset-password` },
    });
    if (error) throw new Error(error.message);

    await logAudit(context.supabase, context.userId, 'USER_PASSWORD_RESET', 'user', data.userId, {});
    return { email: profile.email, recoveryLink: linkData?.properties?.action_link ?? null };
  });

const impersonateUserSchema = z.object({ userId: z.string().uuid() });

export const impersonateUser = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => impersonateUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    const { data: profile } = await admin.from('profiles').select('email').eq('id', data.userId).maybeSingle();
    if (!profile?.email) throw new Error('User has no email');

    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
      options: { redirectTo: process.env.APP_URL ?? 'http://localhost:8080' },
    });
    if (error) throw new Error(error.message);

    await logAudit(context.supabase, context.userId, 'USER_IMPERSONATED', 'user', data.userId, {});
    return { email: profile.email, magicLink: linkData?.properties?.action_link ?? null };
  });

const listSubscriptionsSchema = z.object({
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  plan: z.enum(PLANS).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const listSubscriptions = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => listSubscriptionsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    let query = admin
      .from('platform_subscriptions')
      .select('*, companies(id, name, slug)', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (data.status) query = query.eq('status', data.status);
    if (data.plan) query = query.eq('plan', data.plan);

    const from = (data.page - 1) * data.limit;
    const to = from + data.limit - 1;
    const { data: rows, error, count } = await query.range(from, to);
    if (error) throw new Error(error.message);

    return { rows: rows ?? [], count: count ?? 0, page: data.page, limit: data.limit };
  });

const updateSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  plan: z.enum(PLANS).optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  endsAt: z.string().datetime().optional(),
});

export const updateSubscription = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateSubscriptionSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    const update: any = {};
    if (data.plan !== undefined) {
      update.plan = data.plan;
      update.monthly_price = data.plan === 'trial' ? 0 : data.plan === 'starter' ? 99 : data.plan === 'pro' ? 299 : 599;
    }
    if (data.status !== undefined) update.status = data.status;
    if (data.endsAt !== undefined) update.ends_at = data.endsAt;

    const { data: sub, error } = await admin
      .from('platform_subscriptions')
      .update(update)
      .eq('id', data.subscriptionId)
      .select('*, companies(id)')
      .single();
    if (error) throw new Error(error.message);

    await admin.from('companies').update({ plan: sub.plan }).eq('id', sub.company_id);
    await logAudit(context.supabase, context.userId, 'SUBSCRIPTION_UPDATED', 'platform_subscriptions', data.subscriptionId, { plan: data.plan, status: data.status });
    return sub;
  });

const listInvoicesSchema = z.object({
  companyId: z.string().uuid().optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const listInvoices = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => listInvoicesSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    let query = admin
      .from('platform_invoices')
      .select('*, companies(id, name)', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (data.companyId) query = query.eq('company_id', data.companyId);
    if (data.status) query = query.eq('status', data.status);

    const from = (data.page - 1) * data.limit;
    const to = from + data.limit - 1;
    const { data: rows, error, count } = await query.range(from, to);
    if (error) throw new Error(error.message);

    return { rows: rows ?? [], count: count ?? 0, page: data.page, limit: data.limit };
  });

const createInvoiceSchema = z.object({
  companyId: z.string().uuid(),
  subscriptionId: z.string().uuid().optional(),
  amount: z.number().min(0),
  tax: z.number().min(0).default(0),
  dueDate: z.string().date(),
});

export const createInvoice = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createInvoiceSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${data.companyId.slice(0, 8)}`;
    const { data: invoice, error } = await admin
      .from('platform_invoices')
      .insert({
        company_id: data.companyId,
        subscription_id: data.subscriptionId ?? null,
        invoice_number: invoiceNumber,
        amount: data.amount,
        tax: data.tax,
        status: 'open',
        due_date: data.dueDate,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await logAudit(context.supabase, context.userId, 'INVOICE_CREATED', 'platform_invoices', invoice.id, { amount: data.amount, companyId: data.companyId });
    return invoice;
  });

const markInvoicePaidSchema = z.object({ invoiceId: z.string().uuid() });

export const markInvoicePaid = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => markInvoicePaidSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    const { data: invoice, error } = await admin
      .from('platform_invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', data.invoiceId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await logAudit(context.supabase, context.userId, 'INVOICE_MARKED_PAID', 'platform_invoices', data.invoiceId, {});
    return invoice;
  });

export const getPlatformSettings = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();
    const { data, error } = await admin.from('platform_settings').select('*').order('key');
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const updatePlatformSettingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

export const updatePlatformSetting = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updatePlatformSettingSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    const { data: setting, error } = await admin
      .from('platform_settings')
      .update({ value: data.value, updated_at: new Date().toISOString() })
      .eq('key', data.key)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await logAudit(context.supabase, context.userId, 'SETTING_UPDATED', 'platform_settings', data.key, { value: data.value });
    return setting;
  });

export const listFeatureFlags = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();
    const { data, error } = await admin.from('feature_flags').select('*').order('key');
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const updateFeatureFlagSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
  target: z.enum(['global', 'company', 'plan']).optional(),
  targetValue: z.string().optional(),
});

export const updateFeatureFlag = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateFeatureFlagSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    const update: any = { enabled: data.enabled, updated_at: new Date().toISOString() };
    if (data.target !== undefined) update.target = data.target;
    if (data.targetValue !== undefined) update.target_value = data.targetValue;

    const { data: flag, error } = await admin
      .from('feature_flags')
      .update(update)
      .eq('key', data.key)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await logAudit(context.supabase, context.userId, 'FEATURE_FLAG_UPDATED', 'feature_flags', data.key, { enabled: data.enabled, target: data.target });
    return flag;
  });

const listAuditLogsSchema = z.object({
  action: z.string().optional(),
  entity: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listPlatformAuditLogs = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => listAuditLogsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    let query = admin
      .from('platform_audit_logs')
      .select('*, auth.users!platform_audit_logs_actor_id_fkey(email)')
      .order('created_at', { ascending: false })
      .limit(data.limit);
    if (data.action) query = query.eq('action', data.action);
    if (data.entity) query = query.eq('entity', data.entity);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return rows ?? [];
  });

export const getSystemHealth = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();

    const last24h = new Date(Date.now() - 86400000).toISOString();
    const last7d = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      { count: totalUsers },
      { count: totalCompanies },
      { count: activeCompanies },
      { data: recentAudit },
      { count: recentLogins },
      { count: recentSignups },
    ] = await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('companies').select('id', { count: 'exact', head: true }),
      admin.from('companies').select('id', { count: 'exact', head: true }).eq('is_active', true),
      admin.from('platform_audit_logs').select('id, action, created_at').gte('created_at', last24h).order('created_at', { ascending: false }).limit(20),
      admin.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'USER_LOGIN').gte('created_at', last24h),
      admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', last7d),
    ]);

    return {
      totalUsers: totalUsers ?? 0,
      totalCompanies: totalCompanies ?? 0,
      activeCompanies: activeCompanies ?? 0,
      recentAudit: recentAudit ?? [],
      logins24h: recentLogins ?? 0,
      signups7d: recentSignups ?? 0,
    };
  });
