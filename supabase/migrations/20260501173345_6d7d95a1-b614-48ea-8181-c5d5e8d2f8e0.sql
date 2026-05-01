
-- Enums
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','sales','procurement','production','finance','hr');
CREATE TYPE public.subscription_plan AS ENUM ('trial','starter','pro','enterprise');
CREATE TYPE public.app_module AS ENUM ('sales','procurement','inventory','production','finance','hr');

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan public.subscription_plan NOT NULL DEFAULT 'trial',
  is_active BOOLEAN NOT NULL DEFAULT true,
  enabled_modules public.app_module[] NOT NULL DEFAULT ARRAY['sales','procurement','inventory','production','finance','hr']::public.app_module[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate table — NEVER store roles on profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, company_id)
);

-- Security definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.get_user_company(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin' AND company_id = _company_id
  );
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER touch_companies BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "super admin all companies" ON public.companies
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "members view own company" ON public.companies
FOR SELECT TO authenticated
USING (id = public.get_user_company(auth.uid()));

CREATE POLICY "company admin update own company" ON public.companies
FOR UPDATE TO authenticated
USING (public.is_company_admin(auth.uid(), id))
WITH CHECK (public.is_company_admin(auth.uid(), id));

-- Profiles policies
CREATE POLICY "super admin all profiles" ON public.profiles
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "user view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "user update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "members view company profiles" ON public.profiles
FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()) AND company_id IS NOT NULL);

CREATE POLICY "company admin manage company profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_company_admin(auth.uid(), company_id))
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- User roles policies
CREATE POLICY "super admin all roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "user view own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "company admin view company roles" ON public.user_roles
FOR SELECT TO authenticated
USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "company admin manage company roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.is_company_admin(auth.uid(), company_id) AND role <> 'super_admin');

CREATE POLICY "company admin delete company roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.is_company_admin(auth.uid(), company_id) AND role <> 'super_admin');
