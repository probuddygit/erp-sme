-- Enums
CREATE TYPE public.lead_status AS ENUM ('new','contacted','qualified','proposal','negotiation','won','lost');
CREATE TYPE public.lead_source AS ENUM ('website','referral','cold_call','email','event','other');
CREATE TYPE public.quotation_status AS ENUM ('draft','sent','accepted','rejected','expired');
CREATE TYPE public.sales_order_status AS ENUM ('draft','pending_approval','approved','rejected','fulfilled','cancelled');
CREATE TYPE public.invoice_status AS ENUM ('draft','sent','partially_paid','paid','overdue','cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash','bank_transfer','cheque','upi','card','other');
CREATE TYPE public.tax_type AS ENUM ('intra_state','inter_state','exempt');

-- Helper: check if user has any of given roles in their company
CREATE OR REPLACE FUNCTION public.has_company_role(_user_id uuid, _company_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = ANY(_roles)
  );
$$;

-- Customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  gst_number text,
  billing_address text,
  shipping_address text,
  state_code text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_company ON public.customers(company_id);

-- Customer pricing rules
CREATE TABLE public.customer_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_name text,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  special_price numeric(14,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pricing_company ON public.customer_pricing_rules(company_id);

-- Leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  title text NOT NULL,
  contact_name text,
  email text,
  phone text,
  company_name text,
  source lead_source NOT NULL DEFAULT 'other',
  status lead_status NOT NULL DEFAULT 'new',
  expected_value numeric(14,2) NOT NULL DEFAULT 0,
  win_probability int NOT NULL DEFAULT 10 CHECK (win_probability BETWEEN 0 AND 100),
  expected_close_date date,
  owner_id uuid,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_company ON public.leads(company_id);
CREATE INDEX idx_leads_status ON public.leads(company_id, status);

-- Quotations
CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  quotation_number text NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  status quotation_status NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount_total numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,
  tax_type tax_type NOT NULL DEFAULT 'intra_state',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, quotation_number)
);
CREATE INDEX idx_quotations_company ON public.quotations(company_id);

CREATE TABLE public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  product_name text NOT NULL,
  description text,
  quantity numeric(14,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  tax_percent numeric(5,2) NOT NULL DEFAULT 18,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0
);
CREATE INDEX idx_quote_items_q ON public.quotation_items(quotation_id);

-- Sales orders
CREATE TABLE public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  order_number text NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  status sales_order_status NOT NULL DEFAULT 'draft',
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  delivery_date date,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount_total numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,
  tax_type tax_type NOT NULL DEFAULT 'intra_state',
  approval_notes text,
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, order_number)
);
CREATE INDEX idx_so_company ON public.sales_orders(company_id);

CREATE TABLE public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  product_name text NOT NULL,
  description text,
  quantity numeric(14,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  tax_percent numeric(5,2) NOT NULL DEFAULT 18,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0
);
CREATE INDEX idx_so_items_so ON public.sales_order_items(sales_order_id);

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  invoice_number text NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount_total numeric(14,2) NOT NULL DEFAULT 0,
  cgst_total numeric(14,2) NOT NULL DEFAULT 0,
  sgst_total numeric(14,2) NOT NULL DEFAULT 0,
  igst_total numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  amount_due numeric(14,2) NOT NULL DEFAULT 0,
  tax_type tax_type NOT NULL DEFAULT 'intra_state',
  notes text,
  last_reminder_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, invoice_number)
);
CREATE INDEX idx_inv_company ON public.invoices(company_id);

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  product_name text NOT NULL,
  description text,
  quantity numeric(14,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  tax_percent numeric(5,2) NOT NULL DEFAULT 18,
  cgst_amount numeric(14,2) NOT NULL DEFAULT 0,
  sgst_amount numeric(14,2) NOT NULL DEFAULT 0,
  igst_amount numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0
);
CREATE INDEX idx_inv_items_inv ON public.invoice_items(invoice_id);

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL DEFAULT 'bank_transfer',
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pay_company ON public.payments(company_id);
CREATE INDEX idx_pay_invoice ON public.payments(invoice_id);

-- Triggers: updated_at
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_pricing_updated BEFORE UPDATE ON public.customer_pricing_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_so_updated BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_inv_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Trigger: auto-update invoice paid amount when payments change
CREATE OR REPLACE FUNCTION public.recalc_invoice_paid()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_paid numeric(14,2);
  v_grand numeric(14,2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payments WHERE invoice_id = v_invoice_id;
  SELECT grand_total INTO v_grand FROM public.invoices WHERE id = v_invoice_id;
  UPDATE public.invoices
  SET amount_paid = v_paid,
      amount_due = GREATEST(v_grand - v_paid, 0),
      status = CASE
        WHEN v_paid >= v_grand AND v_grand > 0 THEN 'paid'::invoice_status
        WHEN v_paid > 0 THEN 'partially_paid'::invoice_status
        ELSE status
      END,
      updated_at = now()
  WHERE id = v_invoice_id;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_payments_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_paid();

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Generic policies macro: super admin all + company member select + sales/admin write
-- Customers
CREATE POLICY "super admin customers" ON public.customers FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view customers" ON public.customers FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales manage customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE POLICY "sales update customers" ON public.customers FOR UPDATE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]))
  WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales delete customers" ON public.customers FOR DELETE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));

-- Pricing rules
CREATE POLICY "super admin pricing" ON public.customer_pricing_rules FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view pricing" ON public.customer_pricing_rules FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales manage pricing" ON public.customer_pricing_rules FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE POLICY "sales update pricing" ON public.customer_pricing_rules FOR UPDATE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]))
  WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales delete pricing" ON public.customer_pricing_rules FOR DELETE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));

-- Leads
CREATE POLICY "super admin leads" ON public.leads FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view leads" ON public.leads FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales insert leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE POLICY "sales update leads" ON public.leads FOR UPDATE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]))
  WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales delete leads" ON public.leads FOR DELETE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));

-- Quotations
CREATE POLICY "super admin quotations" ON public.quotations FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view quotations" ON public.quotations FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales insert quotations" ON public.quotations FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE POLICY "sales update quotations" ON public.quotations FOR UPDATE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]))
  WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales delete quotations" ON public.quotations FOR DELETE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));

CREATE POLICY "super admin quote items" ON public.quotation_items FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view quote items" ON public.quotation_items FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales manage quote items" ON public.quotation_items FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE POLICY "sales update quote items" ON public.quotation_items FOR UPDATE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]))
  WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales delete quote items" ON public.quotation_items FOR DELETE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));

-- Sales orders
CREATE POLICY "super admin so" ON public.sales_orders FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view so" ON public.sales_orders FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales insert so" ON public.sales_orders FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE POLICY "sales update so" ON public.sales_orders FOR UPDATE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]))
  WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales delete so" ON public.sales_orders FOR DELETE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));

CREATE POLICY "super admin so items" ON public.sales_order_items FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view so items" ON public.sales_order_items FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales manage so items" ON public.sales_order_items FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE POLICY "sales update so items" ON public.sales_order_items FOR UPDATE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]))
  WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "sales delete so items" ON public.sales_order_items FOR DELETE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));

-- Invoices (sales+finance can manage)
CREATE POLICY "super admin invoices" ON public.invoices FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view invoices" ON public.invoices FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "salesfin insert invoices" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales','finance']::app_role[]));
CREATE POLICY "salesfin update invoices" ON public.invoices FOR UPDATE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales','finance']::app_role[]))
  WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "salesfin delete invoices" ON public.invoices FOR DELETE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','finance']::app_role[]));

CREATE POLICY "super admin inv items" ON public.invoice_items FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view inv items" ON public.invoice_items FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "salesfin manage inv items" ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales','finance']::app_role[]));
CREATE POLICY "salesfin update inv items" ON public.invoice_items FOR UPDATE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales','finance']::app_role[]))
  WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "salesfin delete inv items" ON public.invoice_items FOR DELETE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','sales','finance']::app_role[]));

-- Payments (finance + admin)
CREATE POLICY "super admin payments" ON public.payments FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "members view payments" ON public.payments FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "fin insert payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','finance']::app_role[]));
CREATE POLICY "fin update payments" ON public.payments FOR UPDATE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','finance']::app_role[]))
  WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "fin delete payments" ON public.payments FOR DELETE TO authenticated
  USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','finance']::app_role[]));

-- Document number generator
CREATE OR REPLACE FUNCTION public.next_doc_number(_company_id uuid, _prefix text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count int;
  v_year text;
BEGIN
  v_year := to_char(now(), 'YY');
  IF _prefix = 'QUO' THEN
    SELECT COUNT(*)+1 INTO v_count FROM public.quotations WHERE company_id = _company_id;
  ELSIF _prefix = 'SO' THEN
    SELECT COUNT(*)+1 INTO v_count FROM public.sales_orders WHERE company_id = _company_id;
  ELSIF _prefix = 'INV' THEN
    SELECT COUNT(*)+1 INTO v_count FROM public.invoices WHERE company_id = _company_id;
  ELSE
    v_count := 1;
  END IF;
  RETURN _prefix || '-' || v_year || '-' || LPAD(v_count::text, 5, '0');
END; $$;