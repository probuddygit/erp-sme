import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { getRequestHeader } from '@tanstack/react-start/server';

export const logAudit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { action: string; entity?: string; entity_id?: string; company_id?: string; organization_id?: string; metadata?: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const ip = getRequestHeader('x-forwarded-for') ?? null;
    const ua = getRequestHeader('user-agent') ?? null;
    const { error } = await context.supabase.from('audit_logs').insert({
      user_id: context.userId,
      action: data.action,
      entity: data.entity ?? null,
      entity_id: data.entity_id ?? null,
      company_id: data.company_id ?? null,
      organization_id: data.organization_id ?? null,
      metadata: data.metadata ?? null,
      ip,
      user_agent: ua,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
