import { BACKUP_CATALOG, type BackupRunEntry } from './backup-catalog';

export async function requireSuperAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc('is_super_admin', {
    _user_id: context.userId,
  });
  if (error || !isAdmin) throw new Response('Forbidden', { status: 403 });
}

export async function loadAdminClient() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin as any;
}

export function resolveTable(table: string) {
  const entry = BACKUP_CATALOG.find((t) => t.table === table);
  if (!entry) throw new Response('Unknown table', { status: 400 });
  return entry;
}

const CONFIG_KEY = 'platform.backup.config';
const HISTORY_KEY = 'platform.backup.history';

export const DEFAULT_BACKUP_CONFIG = {
  enabled: false,
  frequency: 'daily',
  time: '02:00',
  retention_days: 30,
  destination: 'download',
  include_platform_tables: true,
  notify_email: '',
};

export async function readSetting(admin: any, key: string, fallback: unknown) {
  const { data } = await admin.from('platform_settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? fallback;
}

export async function writeSetting(admin: any, key: string, value: unknown, description: string) {
  const { error } = await admin
    .from('platform_settings')
    .upsert({ key, value, description, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
}

export const BACKUP_CONFIG_KEY = CONFIG_KEY;
export const BACKUP_HISTORY_KEY = HISTORY_KEY;

export async function appendHistory(admin: any, entry: BackupRunEntry) {
  const current = ((await readSetting(admin, HISTORY_KEY, [])) as BackupRunEntry[]) ?? [];
  const next = [entry, ...current].slice(0, 100);
  await writeSetting(admin, HISTORY_KEY, next, 'Operator backup / export run history');
  return next;
}
