import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "super_admin"
  | "owner"
  | "admin"
  | "manager"
  | "viewer"
  | "sales"
  | "procurement"
  | "production"
  | "finance"
  | "hr"
  | "quality"
  | "maintenance";

export type AppModule =
  | "sales"
  | "procurement"
  | "inventory"
  | "production"
  | "finance"
  | "hr"
  | "reports"
  | "quality"
  | "maintenance";

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  enabled_modules: AppModule[];
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  company_id: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: string;
  status: string;
}

export interface Branch {
  id: string;
  company_id: string;
  name: string;
  code: string;
  is_head_office: boolean;
  is_active: boolean;
}

export interface FinancialYear {
  id: string;
  company_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_closed: boolean;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  company: Company | null;
  organization: Organization | null;
  branches: Branch[];
  activeBranchId: string | null;
  setActiveBranchId: (id: string | null) => void;
  financialYears: FinancialYear[];
  activeFY: FinancialYear | null;
  setActiveFYId: (id: string | null) => void;
  permissions: Set<string>;
  hasPermission: (key: string) => boolean;
  roles: AppRole[];
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
  hasModule: (m: AppModule) => boolean;
  canAccessModule: (m: AppModule) => boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

const ROLE_MODULE_MAP: Record<AppRole, AppModule[]> = {
  super_admin: ["sales", "procurement", "inventory", "production", "finance", "hr", "reports", "quality", "maintenance"],
  owner: ["sales", "procurement", "inventory", "production", "finance", "hr", "reports", "quality", "maintenance"],
  admin: ["sales", "procurement", "inventory", "production", "finance", "hr", "reports", "quality", "maintenance"],
  manager: ["sales", "procurement", "inventory", "production", "finance", "hr", "reports", "quality", "maintenance"],
  viewer: ["sales", "procurement", "inventory", "production", "finance", "hr", "reports", "quality", "maintenance"],
  sales: ["sales", "inventory", "reports"],
  procurement: ["procurement", "inventory", "reports"],
  production: ["production", "inventory", "quality", "maintenance"],
  finance: ["finance", "reports"],
  hr: ["hr"],
  quality: ["quality", "production", "inventory"],
  maintenance: ["maintenance", "inventory", "production"],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [activeFYId, setActiveFYIdState] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionLoadRef = useRef(0);

  const clearUserData = useCallback(() => {
    setProfile(null);
    setCompany(null);
    setOrganization(null);
    setBranches([]);
    setActiveBranchIdState(null);
    setFinancialYears([]);
    setActiveFYIdState(null);
    setPermissions(new Set());
    setRoles([]);
  }, []);

  const loadUserData = useCallback(async (uid: string) => {
    const [{ data: prof, error: profileError }, { data: rs, error: rolesError }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    if (profileError) throw profileError;
    if (rolesError) throw rolesError;

    const roleList = (rs ?? []).map((r: { role: AppRole }) => r.role);
    let nextCompany: Company | null = null;
    let nextOrg: Organization | null = null;
    let nextBranches: Branch[] = [];
    let nextFYs: FinancialYear[] = [];
    if (prof?.company_id) {
      const { data: co, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", prof.company_id)
        .maybeSingle();
      if (companyError) throw companyError;
      nextCompany = co as Company | null;
      const orgId = (co as unknown as { organization_id?: string | null } | null)?.organization_id ?? null;
      const [{ data: orgRow }, { data: brRows }, { data: fyRows }] = await Promise.all([
        orgId
          ? supabase.from("organizations").select("*").eq("id", orgId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("branches").select("*").eq("company_id", prof.company_id).order("is_head_office", { ascending: false }),
        supabase.from("financial_years").select("*").eq("company_id", prof.company_id).order("start_date", { ascending: false }),
      ]);
      nextOrg = (orgRow as Organization | null) ?? null;
      nextBranches = (brRows as Branch[] | null) ?? [];
      nextFYs = (fyRows as FinancialYear[] | null) ?? [];
    } else {
      // Owner without a company yet — still fetch their org
      const { data: ownerOrg } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", uid)
        .maybeSingle();
      nextOrg = (ownerOrg as Organization | null) ?? null;
    }

    // Permission set: union of role_permissions for all held roles + user overrides.
    let permSet = new Set<string>();
    if (roleList.length > 0) {
      const { data: rpRows } = await supabase
        .from("role_permissions")
        .select("permission_key")
        .in("role", roleList);
      permSet = new Set((rpRows ?? []).map((r: { permission_key: string }) => r.permission_key));
    }
    if (prof?.company_id) {
      const { data: overrides } = await supabase
        .from("user_permission_overrides")
        .select("permission_key, granted")
        .eq("user_id", uid)
        .eq("company_id", prof.company_id);
      for (const o of overrides ?? []) {
        if (o.granted) permSet.add(o.permission_key);
        else permSet.delete(o.permission_key);
      }
    }

    return {
      profile: prof as Profile | null,
      roles: roleList,
      company: nextCompany,
      organization: nextOrg,
      branches: nextBranches,
      financialYears: nextFYs,
      permissions: permSet,
    };
  }, []);

  const applySession = useCallback(async (nextSession: Session | null) => {
    const loadId = ++sessionLoadRef.current;
    setLoading(true);
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      clearUserData();
      if (loadId === sessionLoadRef.current) setLoading(false);
      return;
    }

    try {
      const nextUserData = await loadUserData(nextSession.user.id);
      if (loadId !== sessionLoadRef.current) return;
      setProfile(nextUserData.profile);
      setRoles(nextUserData.roles);
      setCompany(nextUserData.company);
      setOrganization(nextUserData.organization);
      setBranches(nextUserData.branches);
      setFinancialYears(nextUserData.financialYears);
      setPermissions(nextUserData.permissions);
      setActiveBranchIdState((prev) => prev ?? nextUserData.branches.find((b) => b.is_head_office)?.id ?? nextUserData.branches[0]?.id ?? null);
      setActiveFYIdState((prev) => prev ?? nextUserData.financialYears.find((f) => f.is_active)?.id ?? nextUserData.financialYears[0]?.id ?? null);
    } catch (error) {
      console.error("Failed to load auth profile", error);
      if (loadId === sessionLoadRef.current) clearUserData();
    } finally {
      if (loadId === sessionLoadRef.current) setLoading(false);
    }
  }, [clearUserData, loadUserData]);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      void applySession(s);
    });
    supabase.auth.getSession()
      .then(({ data }) => {
        if (mounted) void applySession(data.session);
      })
      .catch((error) => {
        console.error("Failed to restore auth session", error);
        if (mounted) void applySession(null);
      });
    return () => {
      mounted = false;
      sessionLoadRef.current += 1;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return { error: error.message };
    }
    if (data.session) await applySession(data.session);
    return { error: null };
  };

  const signUp: AuthCtx["signUp"] = async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    // Use local scope to avoid 403 when the server-side session is already gone
    // (e.g., expired, revoked, or invalidated). This still clears local storage.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      console.warn("signOut error (ignored):", error.message);
    }
    await applySession(null);
  };

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const nextUserData = await loadUserData(user.id);
      setProfile(nextUserData.profile);
      setRoles(nextUserData.roles);
      setCompany(nextUserData.company);
      setOrganization(nextUserData.organization);
      setBranches(nextUserData.branches);
      setFinancialYears(nextUserData.financialYears);
      setPermissions(nextUserData.permissions);
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = roles.includes("super_admin");
  const isCompanyAdmin = roles.includes("admin");
  const hasRole = (r: AppRole) => roles.includes(r);
  const hasModule = (m: AppModule) => company?.enabled_modules?.includes(m) ?? false;
  const canAccessModule = (m: AppModule) => {
    if (isSuperAdmin) return true;
    if (!hasModule(m)) return false;
    return roles.some((r) => ROLE_MODULE_MAP[r]?.includes(m));
  };
  const hasPermission = (key: string) => isSuperAdmin || roles.includes("owner") || permissions.has(key);
  const activeFY = financialYears.find((f) => f.id === activeFYId) ?? null;
  const setActiveBranchId = (id: string | null) => setActiveBranchIdState(id);
  const setActiveFYId = (id: string | null) => setActiveFYIdState(id);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        profile,
        company,
        organization,
        branches,
        activeBranchId,
        setActiveBranchId,
        financialYears,
        activeFY,
        setActiveFYId,
        permissions,
        hasPermission,
        roles,
        isSuperAdmin,
        isCompanyAdmin,
        loading,
        signIn,
        signUp,
        signOut,
        refresh,
        hasRole,
        hasModule,
        canAccessModule,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}