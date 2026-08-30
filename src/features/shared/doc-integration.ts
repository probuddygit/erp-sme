import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type DocKind = Database["public"]["Enums"]["doc_kind"];
export type PostingStatus = Database["public"]["Enums"]["posting_status"];

// ---------- Comments ----------
export function useDocumentComments(kind: DocKind, id?: string) {
  const { company } = useAuth();
  return useQuery({
    enabled: !!id && !!company?.id,
    queryKey: ["doc-comments", kind, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_comments")
        .select("*")
        .eq("doc_kind", kind)
        .eq("doc_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddComment(kind: DocKind, id?: string) {
  const qc = useQueryClient();
  const { company, user } = useAuth();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!company?.id || !id || !user?.id) throw new Error("Missing context");
      const { error } = await supabase.from("document_comments").insert({
        company_id: company.id,
        doc_kind: kind,
        doc_id: id,
        author_id: user.id,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doc-comments", kind, id] });
      toast.success("Comment added");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
}

// ---------- Events (event bus / activity log) ----------
export function useDocumentEvents(kind: DocKind, id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["doc-events", kind, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_events")
        .select("*")
        .eq("doc_kind", kind)
        .eq("doc_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function recordEvent(
  companyId: string,
  kind: DocKind,
  id: string,
  event: string,
  payload: Record<string, unknown> = {},
) {
  const { error } = await supabase.rpc("record_document_event", {
    _company_id: companyId,
    _kind: kind,
    _id: id,
    _event: event,
    _payload: payload as never,
  });
  if (error) throw error;
}

// ---------- Document links (traceability) ----------
export function useDocumentLinks(kind: DocKind, id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["doc-links", kind, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_links")
        .select("*")
        .or(`and(source_kind.eq.${kind},source_id.eq.${id}),and(destination_kind.eq.${kind},destination_id.eq.${id})`);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function linkDocuments(
  companyId: string,
  src: { kind: DocKind; id: string },
  dst: { kind: DocKind; id: string },
) {
  const { error } = await supabase.rpc("link_documents", {
    _company_id: companyId,
    _src_kind: src.kind,
    _src_id: src.id,
    _dst_kind: dst.kind,
    _dst_id: dst.id,
  });
  if (error) throw error;
}

// ---------- Company settings ----------
export function useCompanySetting<T = unknown>(key: string) {
  const { company } = useAuth();
  return useQuery({
    enabled: !!company?.id,
    queryKey: ["company-setting", company?.id, key],
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
}

export function useSetCompanySetting() {
  const qc = useQueryClient();
  const { company, user } = useAuth();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      if (!company?.id) throw new Error("No company");
      const { error } = await supabase.from("company_settings").upsert(
        { company_id: company.id, key, value: value as never, updated_by: user?.id },
        { onConflict: "company_id,key" },
      );
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["company-setting", company?.id, v.key] });
      toast.success("Setting saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

// ---------- Notifications (in-app inbox) ----------
export function useMyNotifications() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user?.id,
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
// ---------- Comment counts (list views) ----------
export function useCommentCounts(kind: DocKind, ids: string[]) {
  const uniq = [...new Set(ids)].filter(Boolean).sort();
  return useQuery({
    enabled: uniq.length > 0,
    queryKey: ["doc-comment-counts", kind, uniq.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_comments")
        .select("doc_id")
        .eq("doc_kind", kind)
        .in("doc_id", uniq);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data ?? []) map[r.doc_id] = (map[r.doc_id] ?? 0) + 1;
      return map;
    },
  });
}
