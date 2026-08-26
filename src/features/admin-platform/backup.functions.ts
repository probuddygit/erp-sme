import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import {
  appendHistory,
  BACKUP_CONFIG_KEY,
  BACKUP_HISTORY_KEY,
  DEFAULT_BACKUP_CONFIG,
  loadAdminClient,
  readSetting,
  requireSuperAdmin,
  resolveTable,
  writeSetting,
} from './backup.server';
import { BACKUP_CATALOG, type BackupRunEntry } from './backup-catalog';

export const getBackupTenants = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();
    const { data, error } = await admin.from('companies').select('id, name, slug').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; name: string; slug: string }[];
  });

export const getBackupCounts = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ companyId: z.string().uuid().nullable().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();
    const results = await Promise.all(
      BACKUP_CATALOG.map(async (t) => {
        let q = admin.from(t.table).select('id', { count: 'exact', head: true });
        if (data.companyId && t.tenantScoped) q = q.eq('company_id', data.companyId);
        const { count, error } = await q;
        return [t.table, error ? -1 : (count ?? 0)] as const;
      }),
    );
    return Object.fromEntries(results) as Record<string, number>;
  });

export const exportBackupTables = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tables: z.array(z.string()).min(1).max(60),
        companyId: z.string().uuid().nullable().optional(),
        limit: z.number().int().min(1).max(20000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();
    const limit = data.limit ?? 10000;

    const out: Record<string, Record<string, unknown>[]> = {};
    let total = 0;
    for (const name of data.tables) {
      const entry = resolveTable(name);
      let q = admin.from(entry.table).select('*').limit(limit);
      if (data.companyId && entry.tenantScoped) q = q.eq('company_id', data.companyId);
      const { data: rows, error } = await q;
      if (error) throw new Error(`${entry.table}: ${error.message}`);
      out[entry.table] = (rows ?? []) as Record<string, unknown>[];
      total += out[entry.table].length;
    }

    const history = await appendHistory(admin, {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actor: (context.claims as { email?: string })?.email ?? context.userId,
      kind: data.tables.length > 1 ? 'bundle' : 'csv',
      scope: data.companyId ?? 'all-tenants',
      tables: data.tables,
      rows: total,
    } satisfies BackupRunEntry);

    return { data: out, totalRows: total, history };
  });

export const getBackupConfig = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();
    const [config, history] = await Promise.all([
      readSetting(admin, BACKUP_CONFIG_KEY, DEFAULT_BACKUP_CONFIG),
      readSetting(admin, BACKUP_HISTORY_KEY, []),
    ]);
    return {
      config: { ...DEFAULT_BACKUP_CONFIG, ...(config as Record<string, unknown>) },
      history: (history ?? []) as BackupRunEntry[],
    };
  });

export const saveBackupConfig = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        enabled: z.boolean(),
        frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
        time: z.string().max(20),
        retention_days: z.number().int().min(1).max(3650),
        destination: z.enum(['download', 'cloud', 's3', 'gdrive']),
        include_platform_tables: z.boolean(),
        notify_email: z.string().max(200),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context);
    const admin = await loadAdminClient();
    await writeSetting(admin, BACKUP_CONFIG_KEY, data, 'Operator backup schedule configuration');
    return data;
  });
