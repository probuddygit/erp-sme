
DO $$ BEGIN
  CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','revoked','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  plan TEXT NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS pan TEXT,
  ADD COLUMN IF NOT EXISTS state_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- BRANCHES
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  gstin TEXT,
  state_code TEXT,
  address TEXT,
  is_head_office BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- FINANCIAL YEARS
CREATE TABLE IF NOT EXISTS public.financial_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_years TO authenticated;
GRANT ALL ON public.financial_years TO service_role;
ALTER TABLE public.financial_years ENABLE ROW LEVEL SECURITY;

-- PERMISSIONS
CREATE TABLE IF NOT EXISTS public.permissions (
  key TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.app_role NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id, permission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permission_overrides TO authenticated;
GRANT ALL ON public.user_permission_overrides TO service_role;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- INVITATIONS
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  token_hash TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  metadata JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id AND owner_id = _user_id);
$$;
REVOKE ALL ON FUNCTION public.is_org_owner(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_org_owner(_user_id, _org_id)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.companies c ON c.id = p.company_id
        WHERE p.id = _user_id AND c.organization_id = _org_id
      );
$$;
REVOKE ALL ON FUNCTION public.is_org_member(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _company_id uuid, _perm_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT granted FROM public.user_permission_overrides
      WHERE user_id = _user_id AND company_id = _company_id AND permission_key = _perm_key),
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = _user_id
        AND (ur.company_id = _company_id OR ur.company_id IS NULL OR ur.role = 'super_admin')
        AND rp.permission_key = _perm_key
    )
  );
$$;
REVOKE ALL ON FUNCTION public.has_permission(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid,uuid,text) TO authenticated;

-- POLICIES
DROP POLICY IF EXISTS org_select ON public.organizations;
CREATE POLICY org_select ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id) OR public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS org_insert ON public.organizations;
CREATE POLICY org_insert ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS org_update ON public.organizations;
CREATE POLICY org_update ON public.organizations FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS org_delete ON public.organizations;
CREATE POLICY org_delete ON public.organizations FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS branches_select ON public.branches;
CREATE POLICY branches_select ON public.branches FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = branches.company_id)
  );
DROP POLICY IF EXISTS branches_write ON public.branches;
CREATE POLICY branches_write ON public.branches FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS fy_select ON public.financial_years;
CREATE POLICY fy_select ON public.financial_years FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = financial_years.company_id)
  );
DROP POLICY IF EXISTS fy_write ON public.financial_years;
CREATE POLICY fy_write ON public.financial_years FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS perm_select ON public.permissions;
CREATE POLICY perm_select ON public.permissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS role_perm_select ON public.role_permissions;
CREATE POLICY role_perm_select ON public.role_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS upo_select ON public.user_permission_overrides;
CREATE POLICY upo_select ON public.user_permission_overrides FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS upo_write ON public.user_permission_overrides;
CREATE POLICY upo_write ON public.user_permission_overrides FOR ALL TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS inv_select ON public.invitations;
CREATE POLICY inv_select ON public.invitations FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (company_id IS NOT NULL AND public.is_company_admin(auth.uid(), company_id))
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
DROP POLICY IF EXISTS inv_write ON public.invitations;
CREATE POLICY inv_write ON public.invitations FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (company_id IS NOT NULL AND public.is_company_admin(auth.uid(), company_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (company_id IS NOT NULL AND public.is_company_admin(auth.uid(), company_id)));

DROP POLICY IF EXISTS audit_insert ON public.audit_logs;
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS audit_select ON public.audit_logs;
CREATE POLICY audit_select ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (company_id IS NOT NULL AND public.is_company_admin(auth.uid(), company_id))
  );

-- TRIGGERS
DROP TRIGGER IF EXISTS trg_org_updated ON public.organizations;
CREATE TRIGGER trg_org_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_branch_updated ON public.branches;
CREATE TRIGGER trg_branch_updated BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_fy_updated ON public.financial_years;
CREATE TRIGGER trg_fy_updated BEFORE UPDATE ON public.financial_years
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_inv_updated ON public.invitations;
CREATE TRIGGER trg_inv_updated BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- SEED PERMISSIONS
INSERT INTO public.permissions(key, module, action, description) VALUES
  ('dashboard.view','dashboard','view','View dashboard'),
  ('crm.view','crm','view','View CRM'),
  ('crm.create','crm','create','Create CRM records'),
  ('crm.update','crm','update','Update CRM records'),
  ('crm.delete','crm','delete','Delete CRM records'),
  ('sales.view','sales','view','View sales'),
  ('sales.create','sales','create','Create sales'),
  ('sales.update','sales','update','Update sales'),
  ('sales.delete','sales','delete','Delete sales'),
  ('sales.approve','sales','approve','Approve sales'),
  ('procurement.view','procurement','view','View procurement'),
  ('procurement.create','procurement','create','Create procurement'),
  ('procurement.update','procurement','update','Update procurement'),
  ('procurement.delete','procurement','delete','Delete procurement'),
  ('procurement.approve','procurement','approve','Approve procurement'),
  ('inventory.view','inventory','view','View inventory'),
  ('inventory.create','inventory','create','Create inventory'),
  ('inventory.update','inventory','update','Update inventory'),
  ('inventory.delete','inventory','delete','Delete inventory'),
  ('finance.view','finance','view','View finance'),
  ('finance.create','finance','create','Create finance'),
  ('finance.update','finance','update','Update finance'),
  ('finance.delete','finance','delete','Delete finance'),
  ('finance.approve','finance','approve','Approve finance'),
  ('gst.view','gst','view','View GST'),
  ('gst.file','gst','file','File GST returns'),
  ('reports.view','reports','view','View reports'),
  ('reports.export','reports','export','Export reports'),
  ('workflow.view','workflow','view','View workflows'),
  ('workflow.manage','workflow','manage','Manage workflows'),
  ('admin.view','admin','view','View administration'),
  ('admin.users.manage','admin','users.manage','Manage users'),
  ('admin.roles.manage','admin','roles.manage','Manage roles and permissions'),
  ('admin.company.manage','admin','company.manage','Manage company settings'),
  ('admin.branches.manage','admin','branches.manage','Manage branches'),
  ('admin.fy.manage','admin','fy.manage','Manage financial years'),
  ('admin.audit.view','admin','audit.view','View audit logs')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions(role, permission_key)
SELECT r, p.key
FROM public.permissions p,
     (VALUES ('owner'::public.app_role),('super_admin'::public.app_role),('admin'::public.app_role)) AS x(r)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions(role, permission_key)
SELECT 'manager'::public.app_role, key FROM public.permissions
WHERE module <> 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions(role, permission_key)
SELECT 'viewer'::public.app_role, key FROM public.permissions WHERE action = 'view'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions(role, permission_key) VALUES
  ('sales','dashboard.view'),
  ('sales','sales.view'),('sales','sales.create'),('sales','sales.update'),('sales','sales.delete'),
  ('sales','crm.view'),('sales','crm.create'),('sales','crm.update'),
  ('sales','inventory.view'),('sales','reports.view'),
  ('procurement','dashboard.view'),
  ('procurement','procurement.view'),('procurement','procurement.create'),('procurement','procurement.update'),('procurement','procurement.delete'),
  ('procurement','inventory.view'),('procurement','reports.view'),
  ('finance','dashboard.view'),
  ('finance','finance.view'),('finance','finance.create'),('finance','finance.update'),('finance','finance.delete'),
  ('finance','gst.view'),('finance','gst.file'),('finance','reports.view'),('finance','reports.export')
ON CONFLICT DO NOTHING;
