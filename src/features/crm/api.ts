import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

// -------- Types --------
export interface LeadRow {
  id: string;
  company_id: string;
  title: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  source: string;
  status: string;
  expected_value: number;
  win_probability: number;
  expected_close_date: string | null;
  owner_id: string | null;
  customer_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactRow {
  id: string;
  company_id: string;
  customer_id: string | null;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  owner_id: string | null;
  last_contacted_at: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUpRow {
  id: string;
  company_id: string;
  lead_id: string | null;
  subject: string;
  owner_id: string | null;
  due_date: string;
  priority: "low" | "medium" | "high";
  done: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityRow {
  id: string;
  company_id: string;
  activity_type: "call" | "meeting" | "email" | "task" | "note";
  subject: string;
  related_type: string | null;
  related_id: string | null;
  owner_id: string | null;
  scheduled_at: string;
  status: "planned" | "done" | "overdue";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailRow {
  id: string;
  company_id: string;
  direction: "inbound" | "outbound";
  subject: string;
  from_addr: string;
  to_addr: string;
  preview: string | null;
  body: string | null;
  sent_at: string;
  opened: boolean;
  related_type: string | null;
  related_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerRow {
  id: string;
  company_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  gst_number: string | null;
  billing_address: string | null;
  state_code: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

// -------- Helpers --------
function useCompanyId() {
  const { company } = useAuth();
  return company?.id ?? null;
}

function handleError(e: unknown, msg: string) {
  const m = (e as { message?: string })?.message ?? msg;
  toast.error(m);
  throw e;
}

// -------- Leads --------
export function useLeads() {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ["crm", "leads", cid],
    enabled: !!cid,
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("company_id", cid!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    },
  });
}

export function useSaveLead() {
  const cid = useCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<LeadRow> & { id?: string }) => {
      if (!cid) throw new Error("No active company");
      const payload = { ...input, company_id: cid };
      if (input.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("leads").update(rest as never).eq("id", id!);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("leads").insert({ ...payload, created_by: u.user?.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      toast.success("Saved");
    },
    onError: (e) => handleError(e, "Save failed"),
  });
}

// -------- Contacts --------
export function useContacts() {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ["crm", "contacts", cid],
    enabled: !!cid,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_contacts").select("*").eq("company_id", cid!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContactRow[];
    },
  });
}

export function useSaveContact() {
  const cid = useCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ContactRow> & { id?: string }) => {
      if (!cid) throw new Error("No active company");
      const payload = { ...input, company_id: cid };
      if (input.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("crm_contacts").update(rest as never).eq("id", id!);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("crm_contacts").insert({ ...payload, created_by: u.user?.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "contacts"] });
      toast.success("Saved");
    },
    onError: (e) => handleError(e, "Save failed"),
  });
}

// -------- Follow-ups --------
export function useFollowUps() {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ["crm", "follow_ups", cid],
    enabled: !!cid,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_follow_ups").select("*").eq("company_id", cid!).order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FollowUpRow[];
    },
  });
}

export function useSaveFollowUp() {
  const cid = useCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FollowUpRow> & { id?: string }) => {
      if (!cid) throw new Error("No active company");
      const payload = { ...input, company_id: cid };
      if (input.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("crm_follow_ups").update(rest as never).eq("id", id!);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("crm_follow_ups").insert({ ...payload, created_by: u.user?.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "follow_ups"] });
      toast.success("Saved");
    },
    onError: (e) => handleError(e, "Save failed"),
  });
}

export function useToggleFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("crm_follow_ups").update({ done } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm", "follow_ups"] }),
    onError: (e) => handleError(e, "Update failed"),
  });
}

// -------- Activities --------
export function useActivities() {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ["crm", "activities", cid],
    enabled: !!cid,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_activities").select("*").eq("company_id", cid!).order("scheduled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
  });
}

export function useSaveActivity() {
  const cid = useCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ActivityRow> & { id?: string }) => {
      if (!cid) throw new Error("No active company");
      const payload = { ...input, company_id: cid };
      if (input.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("crm_activities").update(rest as never).eq("id", id!);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("crm_activities").insert({ ...payload, created_by: u.user?.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "activities"] });
      toast.success("Saved");
    },
    onError: (e) => handleError(e, "Save failed"),
  });
}

// -------- Emails --------
export function useEmails() {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ["crm", "emails", cid],
    enabled: !!cid,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_email_history").select("*").eq("company_id", cid!).order("sent_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmailRow[];
    },
  });
}

export function useSaveEmail() {
  const cid = useCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<EmailRow> & { id?: string }) => {
      if (!cid) throw new Error("No active company");
      const payload = { ...input, company_id: cid };
      if (input.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("crm_email_history").update(rest as never).eq("id", id!);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("crm_email_history").insert({ ...payload, created_by: u.user?.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "emails"] });
      toast.success("Saved");
    },
    onError: (e) => handleError(e, "Save failed"),
  });
}

// -------- Customers (Accounts view) --------
export function useCustomers() {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ["crm", "customers", cid],
    enabled: !!cid,
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("company_id", cid!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerRow[];
    },
  });
}

export function useSaveCustomer() {
  const cid = useCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CustomerRow> & { id?: string }) => {
      if (!cid) throw new Error("No active company");
      const payload = { ...input, company_id: cid };
      if (input.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("customers").update(rest as never).eq("id", id!);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("customers").insert({ ...payload, created_by: u.user?.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "customers"] });
      toast.success("Saved");
    },
    onError: (e) => handleError(e, "Save failed"),
  });
}

// -------- Formatters --------
export const formatINR = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
export const formatDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
export const formatDateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");