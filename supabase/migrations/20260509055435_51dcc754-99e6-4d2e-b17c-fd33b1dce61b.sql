DO $$ BEGIN CREATE TYPE public.qc_stage AS ENUM ('incoming','in_process','finished'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.qc_result AS ENUM ('pending','accepted','rejected','accepted_with_deviation'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.ncr_severity AS ENUM ('minor','major','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.ncr_status AS ENUM ('open','investigating','resolved','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.qc_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  inspection_number TEXT NOT NULL,
  stage public.qc_stage NOT NULL,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type TEXT,
  reference_id UUID,
  reference_number TEXT,
  item_id UUID,
  item_name TEXT,
  batch_no TEXT,
  quantity_inspected NUMERIC NOT NULL DEFAULT 0,
  quantity_accepted NUMERIC NOT NULL DEFAULT 0,
  quantity_rejected NUMERIC NOT NULL DEFAULT 0,
  result public.qc_result NOT NULL DEFAULT 'pending',
  inspector_name TEXT,
  inspector_id UUID,
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, inspection_number)
);
CREATE INDEX idx_qc_insp_company_date ON public.qc_inspections (company_id, inspection_date DESC);
CREATE INDEX idx_qc_insp_stage ON public.qc_inspections (company_id, stage);
CREATE INDEX idx_qc_insp_batch ON public.qc_inspections (company_id, batch_no);

CREATE TABLE public.qc_inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  inspection_id UUID NOT NULL REFERENCES public.qc_inspections(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  parameter TEXT NOT NULL,
  expected_value TEXT,
  actual_value TEXT,
  passed BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_qc_items_inspection ON public.qc_inspection_items (inspection_id);

CREATE TABLE public.ncr_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  ncr_number TEXT NOT NULL,
  raised_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspection_id UUID REFERENCES public.qc_inspections(id) ON DELETE SET NULL,
  source_stage public.qc_stage,
  reference_type TEXT,
  reference_id UUID,
  reference_number TEXT,
  item_id UUID,
  item_name TEXT,
  batch_no TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  severity public.ncr_severity NOT NULL DEFAULT 'minor',
  status public.ncr_status NOT NULL DEFAULT 'open',
  defect_description TEXT NOT NULL,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  assigned_to UUID,
  assigned_to_name TEXT,
  resolved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, ncr_number)
);
CREATE INDEX idx_ncr_company_date ON public.ncr_records (company_id, raised_date DESC);
CREATE INDEX idx_ncr_status ON public.ncr_records (company_id, status);
CREATE INDEX idx_ncr_batch ON public.ncr_records (company_id, batch_no);

CREATE TRIGGER trg_qc_insp_updated BEFORE UPDATE ON public.qc_inspections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ncr_updated BEFORE UPDATE ON public.ncr_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ncr_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view qc_inspections" ON public.qc_inspections FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "qc insert qc_inspections" ON public.qc_inspections FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'production'::app_role,'quality'::app_role]));
CREATE POLICY "qc update qc_inspections" ON public.qc_inspections FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'production'::app_role,'quality'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "qc delete qc_inspections" ON public.qc_inspections FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'production'::app_role,'quality'::app_role]));
CREATE POLICY "super admin qc_inspections" ON public.qc_inspections FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "members view qc_items" ON public.qc_inspection_items FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "qc insert qc_items" ON public.qc_inspection_items FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'production'::app_role,'quality'::app_role]));
CREATE POLICY "qc update qc_items" ON public.qc_inspection_items FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'production'::app_role,'quality'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "qc delete qc_items" ON public.qc_inspection_items FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'production'::app_role,'quality'::app_role]));
CREATE POLICY "super admin qc_items" ON public.qc_inspection_items FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "members view ncr" ON public.ncr_records FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "qc insert ncr" ON public.ncr_records FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'production'::app_role,'quality'::app_role]));
CREATE POLICY "qc update ncr" ON public.ncr_records FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'production'::app_role,'quality'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "qc delete ncr" ON public.ncr_records FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'production'::app_role,'quality'::app_role]));
CREATE POLICY "super admin ncr" ON public.ncr_records FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));