
DO $$ BEGIN CREATE TYPE public.indent_status AS ENUM ('draft','submitted','approved','rejected','converted','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rfq_status AS ENUM ('draft','sent','quoted','closed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.po_status AS ENUM ('draft','pending_approval','approved','rejected','sent','partially_received','received','closed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.grn_status AS ENUM ('draft','posted','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.vinv_status AS ENUM ('draft','matched','approved','paid','partially_paid','disputed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  contact_person text,
  email text,
  phone text,
  gst_number text,
  address text,
  payment_terms text,
  lead_time_days int NOT NULL DEFAULT 7,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_indents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  indent_number text NOT NULL,
  status indent_status NOT NULL DEFAULT 'draft',
  required_by date,
  source text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.purchase_indent_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  indent_id uuid NOT NULL,
  item_id uuid,
  item_name text NOT NULL,
  item_code text,
  unit text NOT NULL DEFAULT 'pcs',
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  notes text,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE public.rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  rfq_number text NOT NULL,
  status rfq_status NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  indent_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rfq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  rfq_id uuid NOT NULL,
  item_id uuid,
  item_name text NOT NULL,
  item_code text,
  unit text NOT NULL DEFAULT 'pcs',
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0
);
CREATE TABLE public.rfq_supplier_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  rfq_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  rfq_item_id uuid NOT NULL,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  lead_time_days int NOT NULL DEFAULT 0,
  notes text,
  is_selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  po_number text NOT NULL,
  supplier_id uuid NOT NULL,
  rfq_id uuid,
  indent_id uuid,
  status po_status NOT NULL DEFAULT 'draft',
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_date date,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  freight numeric(14,2) NOT NULL DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,
  approval_level int NOT NULL DEFAULT 0,
  approved_by uuid,
  approved_at timestamptz,
  approval_notes text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  po_id uuid NOT NULL,
  item_id uuid,
  item_name text NOT NULL,
  item_code text,
  unit text NOT NULL DEFAULT 'pcs',
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  received_quantity numeric(14,3) NOT NULL DEFAULT 0,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  tax_percent numeric(5,2) NOT NULL DEFAULT 18,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE public.grns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  grn_number text NOT NULL,
  po_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  warehouse_id uuid,
  status grn_status NOT NULL DEFAULT 'draft',
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  freight numeric(14,2) NOT NULL DEFAULT 0,
  duty numeric(14,2) NOT NULL DEFAULT 0,
  other_landed numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.grn_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  grn_id uuid NOT NULL,
  po_item_id uuid,
  item_id uuid,
  item_name text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  warehouse_id uuid,
  batch_no text,
  expiry_date date,
  notes text,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE public.vendor_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  vinv_number text NOT NULL,
  supplier_invoice_no text,
  supplier_id uuid NOT NULL,
  po_id uuid,
  grn_id uuid,
  status vinv_status NOT NULL DEFAULT 'draft',
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  amount_due numeric(14,2) NOT NULL DEFAULT 0,
  match_status text NOT NULL DEFAULT 'unmatched',
  match_notes text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.vendor_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  vinv_id uuid NOT NULL,
  po_item_id uuid,
  item_name text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  tax_percent numeric(5,2) NOT NULL DEFAULT 18,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  payment_number text NOT NULL,
  vinv_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL,
  method payment_method NOT NULL DEFAULT 'bank_transfer',
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_indents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_indent_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "proc insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'procurement'::app_role]));
CREATE POLICY "proc update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'procurement'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "proc delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'procurement'::app_role]));
CREATE POLICY "super admin suppliers" ON public.suppliers FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['purchase_indents','purchase_indent_items','rfqs','rfq_items','rfq_supplier_quotes','purchase_orders','purchase_order_items','grns','grn_items']
  LOOP
    EXECUTE format('CREATE POLICY "members view %1$s" ON public.%1$I FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "proc insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY[''admin''::app_role,''procurement''::app_role]))', t);
    EXECUTE format('CREATE POLICY "proc update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY[''admin''::app_role,''procurement''::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "proc delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY[''admin''::app_role,''procurement''::app_role]))', t);
    EXECUTE format('CREATE POLICY "super admin %1$s" ON public.%1$I FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()))', t);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['vendor_invoices','vendor_invoice_items','supplier_payments']
  LOOP
    EXECUTE format('CREATE POLICY "members view %1$s" ON public.%1$I FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "finproc insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY[''admin''::app_role,''procurement''::app_role,''finance''::app_role]))', t);
    EXECUTE format('CREATE POLICY "finproc update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY[''admin''::app_role,''procurement''::app_role,''finance''::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "finproc delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY[''admin''::app_role,''finance''::app_role]))', t);
    EXECUTE format('CREATE POLICY "super admin %1$s" ON public.%1$I FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()))', t);
  END LOOP;
END $$;

CREATE INDEX idx_suppliers_co ON public.suppliers(company_id);
CREATE INDEX idx_po_co_status ON public.purchase_orders(company_id, status);
CREATE INDEX idx_poi_po_id ON public.purchase_order_items(po_id);
CREATE INDEX idx_grn_co ON public.grns(company_id);
CREATE INDEX idx_grni_grn_id ON public.grn_items(grn_id);
CREATE INDEX idx_vinv_co ON public.vendor_invoices(company_id);
CREATE INDEX idx_supp_pay_co ON public.supplier_payments(company_id);

CREATE TRIGGER tg_suppliers_upd BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tg_pi_upd BEFORE UPDATE ON public.purchase_indents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tg_rfq_upd BEFORE UPDATE ON public.rfqs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tg_po_upd BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tg_grn_upd BEFORE UPDATE ON public.grns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tg_vinv_upd BEFORE UPDATE ON public.vendor_invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.next_proc_number(_company_id uuid, _prefix text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int; v_year text;
BEGIN
  v_year := to_char(now(), 'YY');
  IF _prefix = 'INDENT' THEN SELECT COUNT(*)+1 INTO v_count FROM public.purchase_indents WHERE company_id=_company_id;
  ELSIF _prefix = 'RFQ' THEN SELECT COUNT(*)+1 INTO v_count FROM public.rfqs WHERE company_id=_company_id;
  ELSIF _prefix = 'PO' THEN SELECT COUNT(*)+1 INTO v_count FROM public.purchase_orders WHERE company_id=_company_id;
  ELSIF _prefix = 'GRN' THEN SELECT COUNT(*)+1 INTO v_count FROM public.grns WHERE company_id=_company_id;
  ELSIF _prefix = 'VINV' THEN SELECT COUNT(*)+1 INTO v_count FROM public.vendor_invoices WHERE company_id=_company_id;
  ELSIF _prefix = 'PAY' THEN SELECT COUNT(*)+1 INTO v_count FROM public.supplier_payments WHERE company_id=_company_id;
  ELSE v_count := 1; END IF;
  RETURN _prefix || '-' || v_year || '-' || LPAD(v_count::text, 5, '0');
END $$;

CREATE OR REPLACE FUNCTION public.tg_grn_item_to_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_grn record;
BEGIN
  SELECT status, warehouse_id INTO v_grn FROM public.grns WHERE id = NEW.grn_id;
  IF v_grn.status = 'posted' AND NEW.item_id IS NOT NULL AND COALESCE(NEW.warehouse_id, v_grn.warehouse_id) IS NOT NULL AND NEW.quantity > 0 THEN
    PERFORM public.post_stock_receipt(
      NEW.company_id, NEW.item_id, COALESCE(NEW.warehouse_id, v_grn.warehouse_id),
      NEW.quantity, NEW.unit_cost,
      COALESCE(NEW.batch_no, 'GRN-'||NEW.grn_id::text),
      0, 0, 0, NEW.expiry_date,
      'grn', NEW.grn_id, 'GRN receipt'
    );
    IF NEW.po_item_id IS NOT NULL THEN
      UPDATE public.purchase_order_items SET received_quantity = received_quantity + NEW.quantity WHERE id = NEW.po_item_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_grn_items_to_stock AFTER INSERT ON public.grn_items
FOR EACH ROW EXECUTE FUNCTION public.tg_grn_item_to_stock();

CREATE OR REPLACE FUNCTION public.tg_grn_posted_backfill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NEW.status = 'posted' AND COALESCE(OLD.status::text,'draft') <> 'posted' THEN
    FOR r IN SELECT * FROM public.grn_items WHERE grn_id = NEW.id LOOP
      IF r.item_id IS NOT NULL AND COALESCE(r.warehouse_id, NEW.warehouse_id) IS NOT NULL AND r.quantity > 0 THEN
        PERFORM public.post_stock_receipt(
          r.company_id, r.item_id, COALESCE(r.warehouse_id, NEW.warehouse_id),
          r.quantity, r.unit_cost,
          COALESCE(r.batch_no, 'GRN-'||NEW.id::text),
          0,0,0, r.expiry_date,
          'grn', NEW.id, 'GRN receipt (posted)'
        );
        IF r.po_item_id IS NOT NULL THEN
          UPDATE public.purchase_order_items SET received_quantity = received_quantity + r.quantity WHERE id = r.po_item_id;
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_grn_posted AFTER UPDATE ON public.grns FOR EACH ROW EXECUTE FUNCTION public.tg_grn_posted_backfill();
