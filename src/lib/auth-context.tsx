import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "super_admin"
  | "admin"
  | "sales"
  | "procurement"
  | "production"
  | "finance"
  | "hr";

export type AppModule =
  | "sales"
  | "procurement"
  | "inventory"
  | "production"
  | "finance"
  | "hr"
  | "reports";

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

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  company: Company | null;
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
  super_admin: ["sales", "procurement", "inventory", "production", "finance", "hr", "reports"],
  admin: ["sales", "procurement", "inventory", "production", "finance", "hr", "reports"],
  sales: ["sales", "inventory", "reports"],
  procurement: ["procurement", "inventory", "reports"],
  production: ["production", "inventory"],
  finance: ["finance", "reports"],
  hr: ["hr"],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string) => {
    const [{ data: prof }, { data: rs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(prof as Profile | null);
    const roleList = (rs ?? []).map((r: { role: AppRole }) => r.role);
    setRoles(roleList);
    if (prof?.company_id) {
      const { data: co } = await supabase
        .from("companies")
        .select("*")
        .eq("id", prof.company_id)
        .maybeSingle();
      setCompany(co as Company | null);
    } else {
      setCompany(null);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadUserData(s.user.id), 0);
      } else {
        setProfile(null);
        setCompany(null);
        setRoles([]);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) await loadUserData(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
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
    await supabase.auth.signOut();
  };

  const refresh = async () => {
    if (user) await loadUserData(user.id);
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

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        profile,
        company,
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