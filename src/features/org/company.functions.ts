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
    const { data: co, error } = await context.supabase
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
    // Link creator's profile + grant admin role for the company
    await context.supabase.from('profiles').update({ company_id: co.id }).eq('id', context.userId);
    await context.supabase.from('user_roles').insert({ user_id: context.userId, role: 'admin', company_id: co.id });
    return co;
  });
