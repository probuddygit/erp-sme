import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const createFinancialYear = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { company_id: string; name: string; start_date: string; end_date: string; is_active?: boolean }) => {
    if (!d?.company_id || !d?.name || !d?.start_date || !d?.end_date) throw new Error('All fields required');
    return d;
  })
  .handler(async ({ data, context }) => {
    if (data.is_active) {
      await context.supabase.from('financial_years').update({ is_active: false }).eq('company_id', data.company_id);
    }
    const { data: row, error } = await context.supabase
      .from('financial_years')
      .insert({
        company_id: data.company_id,
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: !!data.is_active,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listFinancialYears = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { company_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from('financial_years')
      .select('*')
      .eq('company_id', data.company_id)
      .order('start_date', { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setActiveFY = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { company_id: string; id: string }) => d)
  .handler(async ({ data, context }) => {
    await context.supabase.from('financial_years').update({ is_active: false }).eq('company_id', data.company_id);
    const { error } = await context.supabase.from('financial_years').update({ is_active: true }).eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
