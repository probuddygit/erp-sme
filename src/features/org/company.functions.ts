import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const createCompany = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    organization_id: string;
    name: string;
    legal_name?: string;
    gstin?: string;
    pan?: string;
    state_code?: string;
    currency?: string;
    address?: string;
  }) => {
    if (!d?.organization_id) throw new Error('organization_id required');
    if (!d?.name || d.name.trim().length < 2) throw new Error('Company name required');
    return d;
  })
  .handler(async ({ data, context }) => {
    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${Math.random().toString(36).slice(2, 6)}`;
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    // Verify caller owns the organization (RLS on organizations enforces membership,
    // but insert-into-companies must be authorized here).
    const { data: org } = await context.supabase
      .from('organizations').select('id, owner_id').eq('id', data.organization_id).maybeSingle();
    if (!org || org.owner_id !== context.userId) throw new Error('Not authorized to add company to this organization');

    const { data: co, error } = await supabaseAdmin
      .from('companies')
      .insert({
        organization_id: data.organization_id,
        name: data.name,
        slug,
        legal_name: data.legal_name ?? data.name,
        gstin: data.gstin ?? null,
        pan: data.pan ?? null,
        state_code: data.state_code ?? null,
        currency: data.currency ?? 'INR',
        address: data.address ?? null,
        plan: 'trial',
        is_active: true,
        enabled_modules: ['sales','procurement','inventory','finance','reports'],
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    await supabaseAdmin.from('profiles').update({ company_id: co.id }).eq('id', context.userId);
    await supabaseAdmin.from('user_roles').upsert(
      { user_id: context.userId, role: 'admin', company_id: co.id },
      { onConflict: 'user_id,role,company_id' },
    );
    return co;
  });
