
-- ENUMS
DO $$ BEGIN CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sales_return_status AS ENUM ('draft','approved','received','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.delivery_note_status AS ENUM ('draft','dispatched','delivered','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.recurring_frequency AS ENUM ('monthly','quarterly','yearly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- APPROVAL RULES
CREATE TABLE IF NOT EXISTS public.approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  min_amount NUMERIC(14,2) DEFAULT 0,
  max_amount NUMERIC(14,2),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_rules TO authenticated;
GRANT ALL ON public.approval_rules TO service_role;
ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_rules_select" ON public.approval_rules FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.get_user_company(auth.uid()));
CREATE POLICY "approval_rules_write_admin" ON public.approval_rules FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin']::app_role[])))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin']::app_role[])));
CREATE INDEX IF NOT EXISTS idx_approval_rules_company ON public.approval_rules(company_id, entity_type, active);

-- APPROVALS
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  rule_id UUID REFERENCES public.approval_rules(id) ON DELETE SET NULL,
  rule_name TEXT,
  amount NUMERIC(14,2),
  status public.approval_status NOT NULL DEFAULT 'pending',
  current_step INT NOT NULL DEFAULT 1,
  total_steps INT NOT NULL DEFAULT 1,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals_select" ON public.approvals FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.get_user_company(auth.uid()));
CREATE POLICY "approvals_insert" ON public.approvals FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR company_id = public.get_user_company(auth.uid()));
CREATE POLICY "approvals_update" ON public.approvals FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin']::app_role[])))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin']::app_role[])));
CREATE INDEX IF NOT EXISTS idx_approvals_company ON public.approvals(company_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_entity ON public.approvals(entity_type, entity_id);

-- APPROVAL STEPS
CREATE TABLE IF NOT EXISTS public.approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  approver_role public.app_role,
  approver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision public.approval_status NOT NULL DEFAULT 'pending',
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_steps TO authenticated;
GRANT ALL ON public.approval_steps TO service_role;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_steps_select" ON public.approval_steps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.approvals a WHERE a.id = approval_id AND (public.is_super_admin(auth.uid()) OR a.company_id = public.get_user_company(auth.uid()))));
CREATE POLICY "approval_steps_write" ON public.approval_steps FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.approvals a WHERE a.id = approval_id AND (public.is_super_admin(auth.uid()) OR a.company_id = public.get_user_company(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.approvals a WHERE a.id = approval_id AND (public.is_super_admin(auth.uid()) OR a.company_id = public.get_user_company(auth.uid()))));
CREATE INDEX IF NOT EXISTS idx_approval_steps_approval ON public.approval_steps(approval_id, step_number);

-- SALES RETURNS
CREATE TABLE IF NOT EXISTS public.sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  return_no TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  status public.sales_return_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, return_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_returns TO authenticated;
GRANT ALL ON public.sales_returns TO service_role;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_returns_select" ON public.sales_returns FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.get_user_company(auth.uid()));
CREATE POLICY "sales_returns_write" ON public.sales_returns FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[])))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[])));
CREATE INDEX IF NOT EXISTS idx_sales_returns_company ON public.sales_returns(company_id, status);

CREATE TABLE IF NOT EXISTS public.sales_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  qty NUMERIC(14,3) NOT NULL,
  uom TEXT,
  rate NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_return_items TO authenticated;
GRANT ALL ON public.sales_return_items TO service_role;
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_return_items_select" ON public.sales_return_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales_returns r WHERE r.id = return_id AND (public.is_super_admin(auth.uid()) OR r.company_id = public.get_user_company(auth.uid()))));
CREATE POLICY "sales_return_items_write" ON public.sales_return_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales_returns r WHERE r.id = return_id AND (public.is_super_admin(auth.uid()) OR (r.company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), r.company_id, ARRAY['admin','sales']::app_role[])))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales_returns r WHERE r.id = return_id AND (public.is_super_admin(auth.uid()) OR (r.company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), r.company_id, ARRAY['admin','sales']::app_role[])))));

-- DELIVERY NOTES
CREATE TABLE IF NOT EXISTS public.delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  dn_no TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicle_no TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  status public.delivery_note_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, dn_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_notes TO authenticated;
GRANT ALL ON public.delivery_notes TO service_role;
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_notes_select" ON public.delivery_notes FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.get_user_company(auth.uid()));
CREATE POLICY "delivery_notes_write" ON public.delivery_notes FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[])))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[])));
CREATE INDEX IF NOT EXISTS idx_delivery_notes_company ON public.delivery_notes(company_id, status);

CREATE TABLE IF NOT EXISTS public.delivery_note_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dn_id UUID NOT NULL REFERENCES public.delivery_notes(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  qty NUMERIC(14,3) NOT NULL,
  uom TEXT,
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_note_items TO authenticated;
GRANT ALL ON public.delivery_note_items TO service_role;
ALTER TABLE public.delivery_note_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_note_items_select" ON public.delivery_note_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.delivery_notes d WHERE d.id = dn_id AND (public.is_super_admin(auth.uid()) OR d.company_id = public.get_user_company(auth.uid()))));
CREATE POLICY "delivery_note_items_write" ON public.delivery_note_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.delivery_notes d WHERE d.id = dn_id AND (public.is_super_admin(auth.uid()) OR (d.company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), d.company_id, ARRAY['admin','sales']::app_role[])))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.delivery_notes d WHERE d.id = dn_id AND (public.is_super_admin(auth.uid()) OR (d.company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), d.company_id, ARRAY['admin','sales']::app_role[])))));

-- RECURRING INVOICE TEMPLATES
CREATE TABLE IF NOT EXISTS public.recurring_invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  frequency public.recurring_frequency NOT NULL,
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  template JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_invoice_templates TO authenticated;
GRANT ALL ON public.recurring_invoice_templates TO service_role;
ALTER TABLE public.recurring_invoice_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_inv_select" ON public.recurring_invoice_templates FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.get_user_company(auth.uid()));
CREATE POLICY "rec_inv_write" ON public.recurring_invoice_templates FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales','finance']::app_role[])))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales','finance']::app_role[])));
CREATE INDEX IF NOT EXISTS idx_rec_inv_next_run ON public.recurring_invoice_templates(active, next_run_date);

-- ITEMS reorder columns
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS reorder_level NUMERIC(14,3) DEFAULT 0;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS reorder_qty NUMERIC(14,3) DEFAULT 0;

-- REORDER ALERT TRIGGER
CREATE OR REPLACE FUNCTION public.tg_check_reorder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_onhand NUMERIC;
BEGIN
  SELECT i.id, i.name, i.sku, i.reorder_level, i.reorder_qty, i.company_id
    INTO v_item FROM public.items i WHERE i.id = NEW.item_id;
  IF v_item.id IS NULL OR COALESCE(v_item.reorder_level, 0) <= 0 THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(SUM(CASE WHEN st.direction = 'in' THEN st.qty ELSE -st.qty END), 0)
    INTO v_onhand FROM public.stock_transactions st WHERE st.item_id = v_item.id;
  IF v_onhand <= v_item.reorder_level THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.alerts
      WHERE company_id = v_item.company_id
        AND alert_type = 'low_stock'
        AND entity_id = v_item.id
        AND status IN ('active','acknowledged')
    ) THEN
      INSERT INTO public.alerts (company_id, alert_type, severity, title, message, entity_type, entity_id, status)
      VALUES (v_item.company_id, 'low_stock', 'warning',
              'Low stock: ' || COALESCE(v_item.name, v_item.sku, 'item'),
              format('On-hand %s is at or below reorder level %s. Suggested reorder qty: %s',
                     v_onhand, v_item.reorder_level, COALESCE(v_item.reorder_qty,0)),
              'item', v_item.id, 'active');
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_reorder ON public.stock_transactions;
CREATE TRIGGER trg_check_reorder AFTER INSERT ON public.stock_transactions FOR EACH ROW EXECUTE FUNCTION public.tg_check_reorder();
REVOKE EXECUTE ON FUNCTION public.tg_check_reorder() FROM PUBLIC, anon, authenticated;

-- updated_at triggers
DO $$ BEGIN CREATE TRIGGER trg_approvals_touch BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trg_approval_rules_touch BEFORE UPDATE ON public.approval_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trg_sales_returns_touch BEFORE UPDATE ON public.sales_returns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trg_delivery_notes_touch BEFORE UPDATE ON public.delivery_notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trg_rec_inv_touch BEFORE UPDATE ON public.recurring_invoice_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
