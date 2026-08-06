import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSettingsCollection, type CollectionRow } from "@/features/admin/admin-api";
import { toast } from "sonner";
import type { CanvasNode } from "./data";

/* ----------------------------- collections ----------------------------- */

export interface ConditionalRuleRow extends CollectionRow {
  name: string; when: string; then: string; active: boolean;
}
export interface NotificationRuleRow extends CollectionRow {
  event: string; channels: string; audience: string; template: string; enabled: boolean;
}
export interface EscalationRuleRow extends CollectionRow {
  workflow: string; after_hours: number; action: string; escalate_to: string; enabled: boolean;
}
export interface FlowRow extends CollectionRow {
  name: string; status: string; nodes: CanvasNode[]; updated_at?: string;
}

export const useConditionalRules = () => useSettingsCollection<ConditionalRuleRow>("workflow.conditional");
export const useNotificationRules = () => useSettingsCollection<NotificationRuleRow>("workflow.notifications");
export const useEscalationRules = () => useSettingsCollection<EscalationRuleRow>("workflow.escalation");
export const useFlows = () => useSettingsCollection<FlowRow>("workflow.flows");

/* ------------------------------- runs ---------------------------------- */

export interface RunRow {
  id: string;
  entity_type: string;
  entity_id: string;
  rule_name: string | null;
  status: string;
  amount: number | null;
  current_step: number;
  total_steps: number;
  created_at: string;
  updated_at: string;
}

export function useWorkflowRuns() {
  const { company } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["workflow-runs", company?.id];

  const query = useQuery({
    enabled: !!company?.id,
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approvals")
        .select("id, entity_type, entity_id, rule_name, status, amount, current_step, total_steps, created_at, updated_at")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as RunRow[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase.from("approvals").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey });
      toast.success(v.status === "approved" ? "Approved" : "Rejected");
    },
    onError: (e: any) => toast.error(e?.message ?? "Action failed"),
  });

  return { rows: query.data ?? [], isLoading: query.isLoading, decide, refetch: query.refetch };
}
