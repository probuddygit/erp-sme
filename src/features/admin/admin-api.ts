import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Settings documents (JSON blobs in company_settings)                 */
/* ------------------------------------------------------------------ */

export function useSettingsDoc<T extends Record<string, any>>(key: string, fallback: T) {
  const { company } = useAuth();
  const q = useQuery({
    enabled: !!company?.id,
    queryKey: ["admin-settings", company?.id, key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("value")
        .eq("company_id", company!.id)
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return (data?.value ?? null) as T | null;
    },
  });
  return { ...q, value: { ...fallback, ...(q.data ?? {}) } as T };
}

export function useSaveSettingsDoc(key: string) {
  const qc = useQueryClient();
  const { company, user } = useAuth();
  return useMutation({
    mutationFn: async (value: unknown) => {
      if (!company?.id) throw new Error("No active company");
      const { error } = await supabase.from("company_settings").upsert(
        { company_id: company.id, key, value: value as never, updated_by: user?.id },
        { onConflict: "company_id,key" },
      );
      if (error) throw error;
      return value;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings", company?.id, key] });
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

/* ------------------------------------------------------------------ */
/* Settings collections (arrays of records in company_settings)        */
/* ------------------------------------------------------------------ */

export interface CollectionRow { id: string; [k: string]: any }

export function useSettingsCollection<T extends CollectionRow>(key: string, seed: T[] = []) {
  const { company, user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["admin-collection", company?.id, key];

  const query = useQuery({
    enabled: !!company?.id,
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("value")
        .eq("company_id", company!.id)
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      const v = data?.value as unknown;
      return Array.isArray(v) ? (v as T[]) : seed;
    },
  });

  const write = async (rows: T[]) => {
    if (!company?.id) throw new Error("No active company");
    const { error } = await supabase.from("company_settings").upsert(
      { company_id: company.id, key, value: rows as never, updated_by: user?.id },
      { onConflict: "company_id,key" },
    );
    if (error) throw error;
    return rows;
  };

  const rows = query.data ?? [];

  const save = useMutation({
    mutationFn: async (next: T[]) => write(next),
    onSuccess: (next) => qc.setQueryData(queryKey, next),
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  return {
    rows,
    isLoading: query.isLoading,
    create: async (row: Omit<T, "id">) => {
      await save.mutateAsync([...rows, { ...(row as any), id: crypto.randomUUID() }] as T[]);
      toast.success("Created");
    },
    update: async (id: string, patch: Partial<T>) => {
      await save.mutateAsync(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) as T[]);
      toast.success("Updated");
    },
    remove: async (id: string) => {
      await save.mutateAsync(rows.filter((r) => r.id !== id) as T[]);
      toast.success("Deleted");
    },
    replaceAll: async (next: T[]) => save.mutateAsync(next),
  };
}

/* ------------------------------------------------------------------ */
/* Generic company-scoped table CRUD                                   */
/* ------------------------------------------------------------------ */

export function useCompanyTable<T extends { id: string }>(
  table: string,
  opts: { orderBy?: string; ascending?: boolean; select?: string; scoped?: boolean } = {},
) {
  const { company } = useAuth();
  const qc = useQueryClient();
  const scoped = opts.scoped !== false;
  const queryKey = ["admin-table", table, company?.id];

  const query = useQuery({
    enabled: !scoped || !!company?.id,
    queryKey,
    queryFn: async () => {
      let qb = (supabase.from(table as never) as any).select(opts.select ?? "*");
      if (scoped) qb = qb.eq("company_id", company!.id);
      if (opts.orderBy) qb = qb.order(opts.orderBy, { ascending: opts.ascending ?? true });
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });

  const create = useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const payload = scoped ? { ...row, company_id: company!.id } : row;
      const { error } = await (supabase.from(table as never) as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Created"); },
    onError: (e: any) => toast.error(e?.message ?? "Create failed"),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Record<string, any> & { id: string }) => {
      const { error } = await (supabase.from(table as never) as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Updated"); },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(table as never) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  return { rows: query.data ?? [], isLoading: query.isLoading, create, update, remove, invalidate };
}

/* ------------------------------------------------------------------ */
/* CSV export                                                          */
/* ------------------------------------------------------------------ */

export function exportRowsToCsv(filename: string, rows: any[], columns: { key: string; header: string }[]) {
  if (!rows.length) { toast.error("Nothing to export"); return; }
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    columns.map((c) => esc(c.header)).join(","),
    ...rows.map((r) => columns.map((c) => esc(r[c.key])).join(",")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Exported");
}
