import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { createHash, randomBytes } from 'crypto';

const ALLOWED_ROLES = new Set([
  'owner','admin','manager','viewer',
  'sales','procurement','production','finance','hr','quality','maintenance',
]);

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export const createInvitation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; role: string; company_id: string; organization_id: string }) => {
    if (!d?.email?.includes('@')) throw new Error('Valid email required');
    if (!ALLOWED_ROLES.has(d.role)) throw new Error('Invalid role');
    if (!d.company_id || !d.organization_id) throw new Error('company and organization required');
    return d;
  })
  .handler(async ({ data, context }) => {
    const token = randomBytes(24).toString('hex');
    const token_hash = hashToken(token);
    const { data: row, error } = await context.supabase
      .from('invitations')
      .insert({
        email: data.email.toLowerCase(),
        role: data.role as 'admin',
        company_id: data.company_id,
        organization_id: data.organization_id,
        token_hash,
        invited_by: context.userId,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return { invitation: row, token };
  });

export const listInvitations = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { company_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from('invitations')
      .select('*')
      .eq('company_id', data.company_id)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const revokeInvitation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('invitations').update({ status: 'revoked' }).eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acceptInvitation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) => {
    if (!d?.token) throw new Error('token required');
    return d;
  })
  .handler(async ({ data, context }) => {
    const token_hash = hashToken(data.token);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: inv, error } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token_hash', token_hash)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error('Invitation not found');
    if (inv.status !== 'pending') throw new Error(`Invitation is ${inv.status}`);
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      await supabaseAdmin.from('invitations').update({ status: 'expired' }).eq('id', inv.id);
      throw new Error('Invitation expired');
    }
    // Match email
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (!authUser?.user?.email || authUser.user.email.toLowerCase() !== inv.email.toLowerCase()) {
      throw new Error('Invitation email does not match the signed-in user');
    }
    // Attach profile + role
    await supabaseAdmin.from('profiles').update({ company_id: inv.company_id }).eq('id', context.userId);
    await supabaseAdmin.from('user_roles').upsert(
      { user_id: context.userId, role: inv.role, company_id: inv.company_id },
      { onConflict: 'user_id,role,company_id' },
    );
    await supabaseAdmin.from('invitations').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    }).eq('id', inv.id);
    return { ok: true, company_id: inv.company_id };
  });
