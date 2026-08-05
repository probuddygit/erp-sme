import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export interface AuditRow {
  id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  ip: string | null;
  user_agent: string | null;
  user_id: string | null;
  metadata: any;
  created_at: string;
}

export function fmtTs(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

/** Company-scoped audit log feed, optionally filtered by action prefixes. */
export function useAuditLogs(opts: { match?: string[]; exclude?: string[]; limit?: number } = {}) {
  const { company } = useAuth();
  const query = useQuery({
    enabled: !!company?.id,
    queryKey: ["admin-audit-logs", company?.id, opts.limit ?? 300],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity, entity_id, ip, user_agent, user_id, metadata, created_at")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false })
        .limit(opts.limit ?? 300);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const all = query.data ?? [];
  const rows = all.filter((r) => {
    const a = (r.action ?? "").toLowerCase();
    if (opts.match && !opts.match.some((m) => a.includes(m))) return false;
    if (opts.exclude && opts.exclude.some((m) => a.includes(m))) return false;
    return true;
  });

  return { rows, all, isLoading: query.isLoading };
}

/** Names for the user ids referenced by logs. */
export function useUserNames() {
  const { company } = useAuth();
  const q = useQuery({
    enabled: !!company?.id,
    queryKey: ["admin-user-names", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("company_id", company!.id);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = p.full_name ?? "—"; });
      return map;
    },
  });
  return q.data ?? {};
}
