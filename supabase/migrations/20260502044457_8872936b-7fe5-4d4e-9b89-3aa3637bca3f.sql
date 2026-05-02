
-- Enums
CREATE TYPE public.bom_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.work_order_status AS ENUM ('planned', 'released', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.production_log_event AS ENUM ('created', 'released', 'started', 'paused', 'resumed', 'completed', 'cancelled', 'note');

-- Bills of Materials
CREATE TABLE public.bills_of_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  product_name text NOT NULL,
  product_code text,
  version text NOT NULL DEFAULT 'v1',
  output_quantity numeric NOT NULL DEFAULT 1,
  output_unit text NOT NULL DEFAULT 'pcs',
  status bom_status NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bom_company ON public.bills_of_materials(company_id);

-- BOM components (multi-level via sub_bom_id)
CREATE TABLE public.bom_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  bom_id uuid NOT NULL REFERENCES public.bills_of_materials(id) ON DELETE CASCADE,
  component_name text NOT NULL,
  component_code text,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'pcs',
  unit_cost numeric NOT NULL DEFAULT 0,
  sub_bom_id uuid REFERENCES public.bills_of_materials(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bom_components_bom ON public.bom_components(bom_id);
CREATE INDEX idx_bom_components_company ON public.bom_components(company_id);

-- Work Orders
CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  wo_number text NOT NULL,
  bom_id uuid REFERENCES public.bills_of_materials(id) ON DELETE SET NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  planned_quantity numeric NOT NULL DEFAULT 1,
  produced_quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pcs',
  status work_order_status NOT NULL DEFAULT 'planned',
  priority integer NOT NULL DEFAULT 5,
  scheduled_start date,
  scheduled_end date,
  actual_start timestamptz,
  actual_end timestamptz,
  notes text,
  auto_triggered boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wo_company ON public.work_orders(company_id);
CREATE INDEX idx_wo_status ON public.work_orders(status);
CREATE INDEX idx_wo_sales_order ON public.work_orders(sales_order_id);

-- Production Logs (event history)
CREATE TABLE public.production_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  event production_log_event NOT NULL,
  from_status work_order_status,
  to_status work_order_status,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prod_logs_wo ON public.production_logs(work_order_id);
CREATE INDEX idx_prod_logs_company ON public.production_logs(company_id);

-- Material Consumption
CREATE TABLE public.material_consumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  material_name text NOT NULL,
  material_code text,
  quantity numeric NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  consumed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mc_wo ON public.material_consumption(work_order_id);
CREATE INDEX idx_mc_company ON public.material_consumption(company_id);

-- Production Output (finished goods)
CREATE TABLE public.production_output (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  is_scrap boolean NOT NULL DEFAULT false,
  produced_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_wo ON public.production_output(work_order_id);
CREATE INDEX idx_po_company ON public.production_output(company_id);

-- Triggers for updated_at
CREATE TRIGGER trg_bom_updated BEFORE UPDATE ON public.bills_of_materials FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_wo_updated BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable RLS
ALTER TABLE public.bills_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_output ENABLE ROW LEVEL SECURITY;

-- RLS Policies: bills_of_materials
CREATE POLICY "super admin bom" ON public.bills_of_materials FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view bom" ON public.bills_of_materials FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "prod insert bom" ON public.bills_of_materials FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role]));
CREATE POLICY "prod update bom" ON public.bills_of_materials FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "prod delete bom" ON public.bills_of_materials FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role]));

-- RLS: bom_components
CREATE POLICY "super admin bomc" ON public.bom_components FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view bomc" ON public.bom_components FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "prod insert bomc" ON public.bom_components FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role]));
CREATE POLICY "prod update bomc" ON public.bom_components FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "prod delete bomc" ON public.bom_components FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role]));

-- RLS: work_orders
CREATE POLICY "super admin wo" ON public.work_orders FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view wo" ON public.work_orders FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "prod insert wo" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role, 'sales'::app_role]));
CREATE POLICY "prod update wo" ON public.work_orders FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "prod delete wo" ON public.work_orders FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role]));

-- RLS: production_logs
CREATE POLICY "super admin plog" ON public.production_logs FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view plog" ON public.production_logs FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "prod insert plog" ON public.production_logs FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role]));

-- RLS: material_consumption
CREATE POLICY "super admin mc" ON public.material_consumption FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view mc" ON public.material_consumption FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "prod insert mc" ON public.material_consumption FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role]));
CREATE POLICY "prod update mc" ON public.material_consumption FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "prod delete mc" ON public.material_consumption FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role]));

-- RLS: production_output
CREATE POLICY "super admin po" ON public.production_output FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view po" ON public.production_output FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "prod insert po" ON public.production_output FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role]));
CREATE POLICY "prod update po" ON public.production_output FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "prod delete po" ON public.production_output FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'production'::app_role]));

-- Work order number generator
CREATE OR REPLACE FUNCTION public.next_wo_number(_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_year text;
BEGIN
  v_year := to_char(now(), 'YY');
  SELECT COUNT(*)+1 INTO v_count FROM public.work_orders WHERE company_id = _company_id;
  RETURN 'WO-' || v_year || '-' || LPAD(v_count::text, 5, '0');
END; $$;

-- BOM explosion: returns flattened raw materials needed for a target qty of a BOM
CREATE OR REPLACE FUNCTION public.explode_bom(_bom_id uuid, _qty numeric)
RETURNS TABLE(material_name text, material_code text, unit text, total_quantity numeric, total_cost numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE expand AS (
    -- root: components of the requested BOM, scaled by _qty / output_quantity
    SELECT
      c.component_name,
      c.component_code,
      c.unit,
      (c.quantity * _qty / NULLIF(b.output_quantity, 0)) AS qty,
      c.unit_cost,
      c.sub_bom_id
    FROM public.bom_components c
    JOIN public.bills_of_materials b ON b.id = c.bom_id
    WHERE c.bom_id = _bom_id

    UNION ALL

    -- recursive: explode sub-BOMs
    SELECT
      c.component_name,
      c.component_code,
      c.unit,
      (c.quantity * e.qty / NULLIF(sb.output_quantity, 0)) AS qty,
      c.unit_cost,
      c.sub_bom_id
    FROM expand e
    JOIN public.bills_of_materials sb ON sb.id = e.sub_bom_id
    JOIN public.bom_components c ON c.bom_id = sb.id
    WHERE e.sub_bom_id IS NOT NULL
  )
  SELECT
    e.component_name AS material_name,
    e.component_code AS material_code,
    e.unit,
    SUM(e.qty)::numeric AS total_quantity,
    SUM(e.qty * e.unit_cost)::numeric AS total_cost
  FROM expand e
  WHERE e.sub_bom_id IS NULL  -- only leaf raw materials
  GROUP BY e.component_name, e.component_code, e.unit;
END; $$;
