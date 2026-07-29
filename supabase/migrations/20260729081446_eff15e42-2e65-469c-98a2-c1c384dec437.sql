-- Extend sales_order_status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='partially_dispatched' AND enumtypid = 'public.sales_order_status'::regtype) THEN
    ALTER TYPE public.sales_order_status ADD VALUE 'partially_dispatched';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='dispatched' AND enumtypid = 'public.sales_order_status'::regtype) THEN
    ALTER TYPE public.sales_order_status ADD VALUE 'dispatched';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='invoiced' AND enumtypid = 'public.sales_order_status'::regtype) THEN
    ALTER TYPE public.sales_order_status ADD VALUE 'invoiced';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='closed' AND enumtypid = 'public.sales_order_status'::regtype) THEN
    ALTER TYPE public.sales_order_status ADD VALUE 'closed';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='credit_hold' AND enumtypid = 'public.sales_order_status'::regtype) THEN
    ALTER TYPE public.sales_order_status ADD VALUE 'credit_hold';
  END IF;
END $$;

-- Quotations extensions
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS crm_account_id uuid REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.crm_opportunities(id) ON DELETE SET NULL;

-- Sales orders extensions
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS crm_account_id uuid REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promised_date date,
  ADD COLUMN IF NOT EXISTS credit_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_hold_reason text;

-- Sales order line extensions
ALTER TABLE public.sales_order_items
  ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qty_dispatched numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_invoiced numeric NOT NULL DEFAULT 0;

-- Delivery note extensions
ALTER TABLE public.delivery_notes
  ADD COLUMN IF NOT EXISTS transporter_name text,
  ADD COLUMN IF NOT EXISTS eway_bill_no text,
  ADD COLUMN IF NOT EXISTS place_of_supply text;

ALTER TABLE public.delivery_note_items
  ADD COLUMN IF NOT EXISTS sales_order_item_id uuid REFERENCES public.sales_order_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.stock_batches(id) ON DELETE SET NULL;

-- Invoice extensions
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS place_of_supply text,
  ADD COLUMN IF NOT EXISTS irn text,
  ADD COLUMN IF NOT EXISTS qr_code_data text,
  ADD COLUMN IF NOT EXISTS gstin_seq_no text;

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS hsn_code text,
  ADD COLUMN IF NOT EXISTS sales_order_item_id uuid REFERENCES public.sales_order_items(id) ON DELETE SET NULL;

-- Credit Notes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='credit_note_reason') THEN
    CREATE TYPE public.credit_note_reason AS ENUM ('return','pricing','discount','cancellation');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  cn_number text NOT NULL,
  cn_date date NOT NULL DEFAULT CURRENT_DATE,
  reason public.credit_note_reason NOT NULL DEFAULT 'return',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  gst_adjustment numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, cn_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_notes TO authenticated;
GRANT ALL ON public.credit_notes TO service_role;

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_notes_select_company" ON public.credit_notes FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "credit_notes_write_sales" ON public.credit_notes FOR ALL TO authenticated
  USING (
    (company_id = public.get_user_company(auth.uid())
     AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'sales') OR public.has_role(auth.uid(),'finance')))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    (company_id = public.get_user_company(auth.uid())
     AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'sales') OR public.has_role(auth.uid(),'finance')))
    OR public.is_super_admin(auth.uid())
  );

CREATE TRIGGER credit_notes_touch BEFORE UPDATE ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid NOT NULL REFERENCES public.credit_notes(id) ON DELETE CASCADE,
  invoice_item_id uuid REFERENCES public.invoice_items(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  qty numeric(14,3) NOT NULL DEFAULT 0,
  rate numeric(14,2) NOT NULL DEFAULT 0,
  tax_percent numeric(6,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_note_items TO authenticated;
GRANT ALL ON public.credit_note_items TO service_role;

ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_note_items_via_parent" ON public.credit_note_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.credit_notes cn WHERE cn.id = credit_note_id
      AND (cn.company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.credit_notes cn WHERE cn.id = credit_note_id
      AND (cn.company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()))
  ));

-- Helper: customer credit check (uses customer_credit table if present)
CREATE OR REPLACE FUNCTION public.check_customer_credit(_company_id uuid, _customer_id uuid, _order_total numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit numeric := 0;
  v_outstanding numeric := 0;
  v_available numeric := 0;
BEGIN
  IF _company_id IS DISTINCT FROM public.get_user_company(auth.uid())
     AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT COALESCE(credit_limit, 0) INTO v_limit
    FROM public.customer_credit WHERE customer_id = _customer_id;
  IF v_limit IS NULL THEN v_limit := 0; END IF;
  SELECT COALESCE(SUM(GREATEST(amount_due,0)),0) INTO v_outstanding
    FROM public.invoices
    WHERE company_id = _company_id AND customer_id = _customer_id
      AND status IN ('sent','partially_paid','overdue');
  v_available := v_limit - v_outstanding;
  RETURN jsonb_build_object(
    'ok', (v_limit <= 0 OR v_available >= COALESCE(_order_total,0)),
    'limit', v_limit,
    'outstanding', v_outstanding,
    'available', v_available,
    'order_total', COALESCE(_order_total,0)
  );
END $$;

REVOKE ALL ON FUNCTION public.check_customer_credit(uuid,uuid,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_customer_credit(uuid,uuid,numeric) TO authenticated;

-- Helper: confirm sales order (runs credit check)
CREATE OR REPLACE FUNCTION public.confirm_sales_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_so RECORD;
  v_check jsonb;
BEGIN
  SELECT * INTO v_so FROM public.sales_orders WHERE id = _order_id;
  IF v_so.id IS NULL THEN RAISE EXCEPTION 'sales order not found'; END IF;
  IF v_so.company_id IS DISTINCT FROM public.get_user_company(auth.uid())
     AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_check := public.check_customer_credit(v_so.company_id, v_so.customer_id, v_so.grand_total);

  IF (v_check->>'ok')::boolean THEN
    UPDATE public.sales_orders
      SET status='confirmed'::sales_order_status,
          credit_hold=false, credit_hold_reason=NULL,
          approved_by=auth.uid(), approved_at=now()
      WHERE id=_order_id;
  ELSE
    UPDATE public.sales_orders
      SET status='credit_hold'::sales_order_status,
          credit_hold=true,
          credit_hold_reason='Order '||v_so.grand_total||' exceeds available credit '||(v_check->>'available')
      WHERE id=_order_id;
  END IF;

  RETURN v_check;
END $$;

REVOKE ALL ON FUNCTION public.confirm_sales_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_sales_order(uuid) TO authenticated;