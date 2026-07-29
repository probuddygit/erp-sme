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

// -------- New CRM Revamp Types --------
export interface AccountRow {
  id: string;
  company_id: string;
  name: string;
  gstin: string | null;
  pan: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  credit_limit: number;
  credit_days: number;
  price_list_id: string | null;
  territory: string | null;
  owner_id: string | null;
  status: string;
  gstin_verified_at: string | null;
  gstin_legal_name: string | null;
  customer_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityRow {
  id: string;
  company_id: string;
  account_id: string | null;
  lead_id: string | null;
  name: string;
  stage: string;
  value: number;
  probability: number;
  expected_close: string | null;
  owner_id: string | null;
  quotation_id: string | null;
  lost_reason: string | null;
  stage_entered_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StageConfigRow {
  id: string;
  company_id: string;
  kind: "lead" | "opportunity";
  stage_key: string;
  label: string;
  sort_order: number;
  tone: string | null;
  aging_threshold_days: number;
  is_terminal: boolean;
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

export function useConvertLeadToQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.rpc("convert_lead_to_quotation" as never, { _lead_id: leadId } as never);
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      qc.invalidateQueries({ queryKey: ["sales", "quotations"] });
      toast.success("Converted to quotation");
    },
    onError: (e) => handleError(e, "Conversion failed"),
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

// -------- Accounts (CRM Revamp) --------
export function useAccounts() {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ["crm", "accounts_v2", cid],
    enabled: !!cid,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_accounts").select("*").eq("company_id", cid!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AccountRow[];
    },
  });
}

export function useAccount(id: string | null | undefined) {
  return useQuery({
    queryKey: ["crm", "accounts_v2", "one", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_accounts").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as AccountRow | null;
    },
  });
}

export function useSaveAccount() {
  const cid = useCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AccountRow> & { id?: string }) => {
      if (!cid) throw new Error("No active company");
      const payload = { ...input, company_id: cid };
      if (input.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("crm_accounts").update(rest as never).eq("id", id!);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("crm_accounts").insert({ ...payload, created_by: u.user?.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "accounts_v2"] });
      toast.success("Account saved");
    },
    onError: (e) => handleError(e, "Save failed"),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm", "accounts_v2"] }); toast.success("Deleted"); },
    onError: (e) => handleError(e, "Delete failed"),
  });
}

// Account 360 aggregated view
export function useAccount360(accountId: string | null | undefined) {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ["crm", "account360", accountId, cid],
    enabled: !!accountId && !!cid,
    queryFn: async () => {
      const [contacts, opps, activities, acc] = await Promise.all([
        supabase.from("crm_contacts").select("*").eq("company_id", cid!).eq("account_id", accountId!).order("created_at", { ascending: false }),
        supabase.from("crm_opportunities").select("*").eq("company_id", cid!).eq("account_id", accountId!).order("created_at", { ascending: false }),
        supabase.from("crm_activities").select("*").eq("company_id", cid!).eq("account_id", accountId!).order("scheduled_at", { ascending: false }).limit(50),
        supabase.from("crm_accounts").select("*, customer_id").eq("id", accountId!).maybeSingle(),
      ]);
      let orders: unknown[] = []; let invoices: unknown[] = []; let outstanding = 0;
      const customerId = (acc.data as { customer_id?: string | null } | null)?.customer_id ?? null;
      if (customerId) {
        const [o, i] = await Promise.all([
          supabase.from("sales_orders").select("id, so_number, order_date, status, total_amount").eq("company_id", cid!).eq("customer_id", customerId).order("order_date", { ascending: false }).limit(20),
          supabase.from("invoices").select("id, invoice_number, invoice_date, status, total_amount, paid_amount, due_date").eq("company_id", cid!).eq("customer_id", customerId).order("invoice_date", { ascending: false }).limit(20),
        ]);
        orders = o.data ?? [];
        invoices = i.data ?? [];
        for (const inv of invoices as { total_amount: number; paid_amount: number }[]) {
          outstanding += Number(inv.total_amount ?? 0) - Number(inv.paid_amount ?? 0);
        }
      }
      return {
        contacts: contacts.data ?? [],
        opportunities: opps.data ?? [],
        activities: activities.data ?? [],
        orders,
        invoices,
        outstanding,
      };
    },
  });
}

// -------- Opportunities --------
export function useOpportunities() {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ["crm", "opportunities_v2", cid],
    enabled: !!cid,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_opportunities").select("*").eq("company_id", cid!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OpportunityRow[];
    },
  });
}

export function useSaveOpportunity() {
  const cid = useCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<OpportunityRow> & { id?: string }) => {
      if (!cid) throw new Error("No active company");
      const payload = { ...input, company_id: cid };
      if (input.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("crm_opportunities").update(rest as never).eq("id", id!);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("crm_opportunities").insert({ ...payload, created_by: u.user?.id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "opportunities_v2"] });
      toast.success("Opportunity saved");
    },
    onError: (e) => handleError(e, "Save failed"),
  });
}

export function useMoveOpportunityStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage, lost_reason }: { id: string; stage: string; lost_reason?: string }) => {
      const payload: Record<string, unknown> = { stage };
      if (stage === "lost" && lost_reason) payload.lost_reason = lost_reason;
      const { error } = await supabase.from("crm_opportunities").update(payload as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm", "opportunities_v2"] }); },
    onError: (e) => handleError(e, "Stage change failed"),
  });
}

export function useDeleteOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm", "opportunities_v2"] }); toast.success("Deleted"); },
    onError: (e) => handleError(e, "Delete failed"),
  });
}

// -------- Stage configs --------
export function useStageConfigs(kind: "lead" | "opportunity") {
  const cid = useCompanyId();
  return useQuery({
    queryKey: ["crm", "stage_configs", kind, cid],
    enabled: !!cid,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_stage_configs").select("*").eq("company_id", cid!).eq("kind", kind).order("sort_order");
      if (error) throw error;
      return (data ?? []) as StageConfigRow[];
    },
  });
}

export function useSaveStageConfig() {
  const cid = useCompanyId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<StageConfigRow> & { id?: string; kind: "lead" | "opportunity" }) => {
      if (!cid) throw new Error("No active company");
      const payload = { ...input, company_id: cid };
      if (input.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("crm_stage_configs").update(rest as never).eq("id", id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_stage_configs").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm", "stage_configs"] }); toast.success("Saved"); },
    onError: (e) => handleError(e, "Save failed"),
  });
}

export function useDeleteStageConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_stage_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm", "stage_configs"] }); },
    onError: (e) => handleError(e, "Delete failed"),
  });
}

// -------- Convert Lead (Account + Contact + Opportunity) --------
export function useConvertLeadToAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.rpc("convert_lead_to_account" as never, { _lead_id: leadId } as never);
      if (error) throw error;
      return data as unknown as { account_id: string; contact_id: string | null; opportunity_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      qc.invalidateQueries({ queryKey: ["crm", "accounts_v2"] });
      qc.invalidateQueries({ queryKey: ["crm", "opportunities_v2"] });
      qc.invalidateQueries({ queryKey: ["crm", "contacts"] });
      toast.success("Converted to Account + Opportunity");
    },
    onError: (e) => handleError(e, "Conversion failed"),
  });
}

// -------- AI helpers (deterministic heuristics) --------
export interface LeadScoreResult {
  score: number;
  band: "hot" | "warm" | "cold";
  factors: { label: string; delta: number }[];
}

export function scoreLead(l: Partial<LeadRow>): LeadScoreResult {
  const factors: { label: string; delta: number }[] = [];
  let s = 30;
  const value = Number(l.expected_value ?? 0);
  if (value >= 500000) { s += 25; factors.push({ label: "High deal value (₹5L+)", delta: 25 }); }
  else if (value >= 100000) { s += 15; factors.push({ label: "Medium deal value", delta: 15 }); }
  else if (value > 0) { s += 5; factors.push({ label: "Small deal value", delta: 5 }); }

  const prob = Number(l.win_probability ?? 0);
  if (prob >= 60) { s += 15; factors.push({ label: `Strong win probability (${prob}%)`, delta: 15 }); }
  else if (prob >= 30) { s += 8; factors.push({ label: `Moderate win probability`, delta: 8 }); }

  const src = (l.source ?? "").toLowerCase();
  if (["referral", "partner"].includes(src)) { s += 12; factors.push({ label: "Warm channel (referral/partner)", delta: 12 }); }
  else if (["website", "linkedin"].includes(src)) { s += 6; factors.push({ label: "Inbound channel", delta: 6 }); }

  if (l.email) { s += 4; factors.push({ label: "Email captured", delta: 4 }); }
  if (l.phone) { s += 4; factors.push({ label: "Phone captured", delta: 4 }); }
  if (l.company_name) { s += 4; factors.push({ label: "Company identified", delta: 4 }); }

  if (l.expected_close_date) {
    const days = Math.round((new Date(l.expected_close_date).getTime() - Date.now()) / 86400000);
    if (days > 0 && days <= 30) { s += 10; factors.push({ label: "Closing within 30 days", delta: 10 }); }
    else if (days < 0) { s -= 15; factors.push({ label: "Close date is overdue", delta: -15 }); }
  }

  const status = (l.status ?? "").toLowerCase();
  if (status === "qualified") { s += 8; factors.push({ label: "Marked qualified", delta: 8 }); }
  if (status === "disqualified" || status === "lost") { s -= 40; factors.push({ label: "Disqualified/Lost", delta: -40 }); }

  s = Math.max(0, Math.min(100, Math.round(s)));
  const band: LeadScoreResult["band"] = s >= 70 ? "hot" : s >= 40 ? "warm" : "cold";
  return { score: s, band, factors };
}

export function suggestNextAction(l: Partial<LeadRow>): string {
  const status = (l.status ?? "new").toLowerCase();
  if (status === "new") return l.phone ? "Call within 24h to introduce and qualify budget." : "Send intro email + request phone number.";
  if (status === "contacted") return "Book a discovery call and confirm product interest.";
  if (status === "qualified") return "Convert to Account & send Quotation this week.";
  if (status === "proposal") return "Follow up on quotation; negotiate terms.";
  return "Log outcome and update status.";
}

export function validateGstinFormat(gstin: string | null | undefined): boolean {
  if (!gstin) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase());
}