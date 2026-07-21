import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const createBranch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    company_id: string; name: string; code: string;
    gstin?: string; state_code?: string; address?: string; is_head_office?: boolean;
  }) => {
    if (!d?.company_id || !d?.name || !d?.code) throw new Error('company_id, name and code required');
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from('branches')
      .insert({
        company_id: data.company_id,
        name: data.name,
        code: data.code.toUpperCase(),
        gstin: data.gstin ?? null,
        state_code: data.state_code ?? null,
        address: data.address ?? null,
        is_head_office: !!data.is_head_office,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listBranches = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { company_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from('branches')
      .select('*')
      .eq('company_id', data.company_id)
      .order('is_head_office', { ascending: false })
      .order('name');
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
