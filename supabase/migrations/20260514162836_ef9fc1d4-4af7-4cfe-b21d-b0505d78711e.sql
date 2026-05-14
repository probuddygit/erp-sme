
DO $$ BEGIN
  CREATE TYPE public.machine_status AS ENUM ('running','idle','under_maintenance','breakdown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  machine_code text NOT NULL,
  name text NOT NULL,
  machine_type text,
  manufacturer text,
  model_number text,
  serial_number text,
  installation_date date,
  warranty_expiry date,
  plant_location text,
  department text,
  production_line text,
  capacity text,
  status public.machine_status NOT NULL DEFAULT 'idle',
  runtime_hours numeric NOT NULL DEFAULT 0,
  runtime_threshold_hours numeric,
  maintenance_frequency_days integer,
  last_maintenance_date date,
  next_maintenance_date date,
  notes text,
  attachment_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, machine_code)
);

CREATE INDEX IF NOT EXISTS idx_machines_company ON public.machines(company_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON public.machines(company_id, status);

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view machines" ON public.machines
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "maint insert machines" ON public.machines
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_user_company(auth.uid())
    AND public.has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'maintenance'::app_role,'production'::app_role])
  );

CREATE POLICY "maint update machines" ON public.machines
  FOR UPDATE TO authenticated
  USING (
    company_id = public.get_user_company(auth.uid())
    AND public.has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'maintenance'::app_role,'production'::app_role])
  )
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "maint delete machines" ON public.machines
  FOR DELETE TO authenticated
  USING (
    company_id = public.get_user_company(auth.uid())
    AND public.has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'maintenance'::app_role])
  );

CREATE POLICY "super admin machines" ON public.machines
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_machines_touch
  BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable maintenance module for all existing companies
UPDATE public.companies
SET enabled_modules = enabled_modules || ARRAY['maintenance'::app_module]
WHERE NOT ('maintenance'::app_module = ANY(enabled_modules));

-- Update default for new companies
ALTER TABLE public.companies
  ALTER COLUMN enabled_modules SET DEFAULT ARRAY['sales','procurement','inventory','production','finance','hr','maintenance']::app_module[];
