import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

/* ---------------- Pick lists ---------------- */
export function usePickLists() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["sales", "pick_lists", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pick_lists")
        .select(
          "*, order:sales_orders(order_number, customer:customers(name)), warehouse:warehouses(name, code), items:pick_list_items(*, item:items(name, sku, unit))",
        )
        .eq("company_id", profile!.company_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSavePickedQty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lines: { id: string; qty_picked: number }[]) => {
      for (const l of lines) {
        const { error } = await supabase
          .from("pick_list_items")
          .update({ qty_picked: l.qty_picked })
          .eq("id", l.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", "pick_lists"] });
      toast.success("Picked quantities saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

export function useSetPickListStatus() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: Record<string, unknown> = { status, modified_by: user?.id ?? null };
      if (status === "picked") {
        patch['picked_by'] = user?.id ?? null;
        patch['picked_at'] = new Date().toISOString();
      }
      const { error } = await supabase.from("pick_lists").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", "pick_lists", profile?.company_id] });
      toast.success("Pick list updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });
}

/* ---------------- Packing slips ---------------- */
export function usePackingSlips() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["sales", "packing_slips", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packing_slips")
        .select("*, pick_list:pick_lists(pick_no), order:sales_orders(order_number, customer:customers(name))")
        .eq("company_id", profile!.company_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePackingSlip() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      pick_list_id: string;
      sales_order_id: string | null;
      packages: number;
      gross_weight?: number | null;
      notes?: string;
    }) => {
      const companyId = profile!.company_id!;
      const { count } = await supabase
        .from("packing_slips")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      const pack_no = `PACK-${new Date().getFullYear().toString().slice(2)}-${String((count ?? 0) + 1).padStart(5, "0")}`;
      const { data, error } = await supabase
        .from("packing_slips")
        .insert({
          company_id: companyId,
          pack_no,
          pick_list_id: input.pick_list_id,
          sales_order_id: input.sales_order_id,
          packages: input.packages,
          gross_weight: input.gross_weight ?? null,
          notes: input.notes ?? null,
          status: "packed",
          packed_by: user?.id ?? null,
          packed_at: new Date().toISOString(),
          created_by: user?.id ?? null,
        })
        .select("id, pack_no")
        .single();
      if (error) throw error;
      await supabase.from("pick_lists").update({ status: "packed" }).eq("id", input.pick_list_id);
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["sales", "packing_slips"] });
      qc.invalidateQueries({ queryKey: ["sales", "pick_lists"] });
      toast.success(`Packing slip ${d?.pack_no} created`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Packing failed"),
  });
}

/* ---------------- Dispatches ---------------- */
export function useDispatches() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["sales", "dispatches", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatches")
        .select(
          "*, order:sales_orders(order_number, customer:customers(name)), delivery_note:delivery_notes(dn_no, status), packing_slip:packing_slips(pack_no)",
        )
        .eq("company_id", profile!.company_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface DispatchInput {
  id?: string;
  packing_slip_id?: string | null;
  sales_order_id?: string | null;
  delivery_note_id?: string | null;
  vehicle_no?: string;
  transporter_name?: string;
  driver_name?: string;
  driver_phone?: string;
  dispatched_at?: string | null;
  status?: string;
  notes?: string;
}

export function useSaveDispatch() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DispatchInput) => {
      const companyId = profile!.company_id!;
      if (input.id) {
        const { error } = await supabase
          .from("dispatches")
          .update({ ...input, modified_by: user?.id ?? null })
          .eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { count } = await supabase
        .from("dispatches")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      const dispatch_no = `DSP-${new Date().getFullYear().toString().slice(2)}-${String((count ?? 0) + 1).padStart(5, "0")}`;
      const { data, error } = await supabase
        .from("dispatches")
        .insert({ ...input, company_id: companyId, dispatch_no, created_by: user?.id ?? null })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", "dispatches"] });
      toast.success("Dispatch saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Dispatch save failed"),
  });
}

export function useMarkDispatched() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id: string; delivery_note_id: string | null }) => {
      const { error } = await supabase
        .from("dispatches")
        .update({ status: "dispatched", dispatched_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;
      if (row.delivery_note_id) {
        const { error: dnErr } = await supabase
          .from("delivery_notes")
          .update({ status: "dispatched" })
          .eq("id", row.delivery_note_id);
        if (dnErr) throw dnErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales", "dispatches"] });
      qc.invalidateQueries({ queryKey: ["sales", "delivery_notes"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      toast.success("Dispatched — stock issued and COGS posted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Dispatch failed"),
  });
}

/* ---------------- Reservations ---------------- */
export function useReservations() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["inventory", "reservations", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_reservations")
        .select("*, item:items(name, sku), warehouse:warehouses(name), order:sales_orders(order_number)")
        .eq("company_id", profile!.company_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReleaseReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stock_reservations").update({ status: "released" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Reservation released");
    },
    onError: (e: any) => toast.error(e?.message ?? "Release failed"),
  });
}

/** On hand / reserved / available per item+warehouse. */
export function useAvailability() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["inventory", "availability", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("item_availability", { _company_id: profile!.company_id! });
      if (error) throw error;
      return (data ?? []) as {
        item_id: string;
        warehouse_id: string;
        on_hand: number;
        reserved: number;
        available: number;
      }[];
    },
  });
}
