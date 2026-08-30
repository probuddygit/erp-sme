import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export interface ApprovalRow {
  id: string;
  entity_type: string;
  entity_id: string;
  rule_name: string | null;
  status: string;
  current_step: number;
  total_steps: number;
  notes: string | null;
  created_at: string;
}

/** Approval header for a single document, if a workflow was raised for it. */
export function useApprovalFor(entityType: string, entityId?: string | null) {
  const { company } = useAuth();
  return useQuery({
    enabled: !!entityId && !!company?.id,
    queryKey: ["approval", company?.id, entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approvals")
        .select("id,entity_type,entity_id,rule_name,status,current_step,total_steps,notes,created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ApprovalRow | null;
    },
  });
}
