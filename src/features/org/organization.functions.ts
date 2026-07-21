import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'org';
}

export const createOrganization = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) => {
    if (!d?.name || d.name.trim().length < 2) throw new Error('Organization name required');
    return { name: d.name.trim() };
  })
  .handler(async ({ data, context }) => {
    const base = slugify(data.name);
    const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: org, error } = await context.supabase
      .from('organizations')
      .insert({ name: data.name, slug, owner_id: context.userId })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    // Bootstrap: owner role has no company yet; RLS blocks self-insert, use admin
    await supabaseAdmin.from('user_roles').upsert(
      { user_id: context.userId, role: 'owner', company_id: null },
      { onConflict: 'user_id,role,company_id' },
    );
    return org;
  });

export const getMyOrganization = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', context.userId)
      .maybeSingle();
    return data;
  });
