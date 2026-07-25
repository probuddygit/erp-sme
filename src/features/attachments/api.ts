import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export type EntityType =
  | "purchase_indent"
  | "rfq"
  | "rfq_supplier_quote"
  | "purchase_order"
  | "grn"
  | "vendor_invoice"
  | "supplier_payment"
  | "vendor_return"
  | "quotation"
  | "sales_order"
  | "invoice"
  | "delivery_note"
  | "sales_return"
  | "payment"
  | "crm_lead"
  | "crm_contact"
  | "crm_account"
  | "crm_opportunity"
  | "ncr"
  | "qc_inspection"
  | "item"
  | "supplier"
  | "customer";

export interface AttachmentRow {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  bucket_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
}

const BUCKET = "attachments";

function keyFor(entityType: EntityType, entityId: string, companyId?: string) {
  return ["attachments", companyId ?? "*", entityType, entityId];
}

export function useAttachments(entityType: EntityType, entityId: string | null | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: keyFor(entityType, entityId ?? "-", profile?.company_id ?? undefined),
    enabled: !!profile?.company_id && !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attachments" as any)
        .select("*")
        .eq("company_id", profile!.company_id!)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as AttachmentRow[];
    },
  });
}

export function useAttachmentCounts(entityType: EntityType, entityIds: string[]) {
  const { profile } = useAuth();
  const ids = [...new Set(entityIds)].filter(Boolean).sort();
  return useQuery({
    queryKey: ["attachment-counts", profile?.company_id, entityType, ids.join(",")],
    enabled: !!profile?.company_id && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attachments" as any)
        .select("entity_id")
        .eq("company_id", profile!.company_id!)
        .eq("entity_type", entityType)
        .in("entity_id", ids);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of (data ?? []) as unknown as { entity_id: string }[]) {
        map[r.entity_id] = (map[r.entity_id] ?? 0) + 1;
      }
      return map;
    },
  });
}

export function useUploadAttachment() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { entityType: EntityType; entityId: string; file: File }) => {
      if (!profile?.company_id || !user?.id) throw new Error("Not signed in");
      const cleanName = args.file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${profile.company_id}/${args.entityType}/${args.entityId}/${crypto.randomUUID()}-${cleanName}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, args.file, {
        cacheControl: "3600",
        upsert: false,
        contentType: args.file.type || undefined,
      });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("attachments" as any).insert({
        company_id: profile.company_id,
        entity_type: args.entityType,
        entity_id: args.entityId,
        bucket_path: path,
        file_name: args.file.name,
        mime_type: args.file.type || null,
        size_bytes: args.file.size,
        uploaded_by: user.id,
      });
      if (insErr) {
        await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
        throw insErr;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: keyFor(vars.entityType, vars.entityId, profile?.company_id ?? undefined) });
      qc.invalidateQueries({ queryKey: ["attachment-counts", profile?.company_id, vars.entityType] });
      toast.success("File uploaded");
    },
    onError: (e: any) => toast.error(e?.message ?? "Upload failed"),
  });
}

export function useDeleteAttachment() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: AttachmentRow) => {
      await supabase.storage.from(BUCKET).remove([row.bucket_path]).catch(() => {});
      const { error } = await supabase.from("attachments" as any).delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, row) => {
      qc.invalidateQueries({ queryKey: keyFor(row.entity_type as EntityType, row.entity_id, profile?.company_id ?? undefined) });
      qc.invalidateQueries({ queryKey: ["attachment-counts", profile?.company_id, row.entity_type] });
      toast.success("File deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });
}

export async function downloadAttachment(row: AttachmentRow) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.bucket_path, 300);
  if (error || !data?.signedUrl) {
    toast.error(error?.message ?? "Could not create download link");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}