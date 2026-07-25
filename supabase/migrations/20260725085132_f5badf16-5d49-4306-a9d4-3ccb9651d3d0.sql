
-- Vendor Returns
CREATE TABLE IF NOT EXISTS public.vendor_returns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vret_number text NOT NULL,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  grn_id uuid REFERENCES public.grns(id) ON DELETE SET NULL,
  reason text,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount_total numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  cgst_total numeric(14,2) NOT NULL DEFAULT 0,
  sgst_total numeric(14,2) NOT NULL DEFAULT 0,
  igst_total numeric(14,2) NOT NULL DEFAULT 0,
  grand_total numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, vret_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_returns TO authenticated;
GRANT ALL ON public.vendor_returns TO service_role;
ALTER TABLE public.vendor_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vret_company_select" ON public.vendor_returns FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "vret_company_insert" ON public.vendor_returns FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "vret_company_update" ON public.vendor_returns FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "vret_company_delete" ON public.vendor_returns FOR DELETE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE TRIGGER trg_vret_touch BEFORE UPDATE ON public.vendor_returns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS idx_vret_company_date ON public.vendor_returns(company_id, return_date DESC);

CREATE TABLE IF NOT EXISTS public.vendor_return_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vret_id uuid NOT NULL REFERENCES public.vendor_returns(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
  description text NOT NULL,
  hsn text,
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  unit text,
  rate numeric(14,2) NOT NULL DEFAULT 0,
  discount_pct numeric(6,2) NOT NULL DEFAULT 0,
  tax_rate numeric(6,2) NOT NULL DEFAULT 0,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_return_items TO authenticated;
GRANT ALL ON public.vendor_return_items TO service_role;
ALTER TABLE public.vendor_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vret_items_company_all" ON public.vendor_return_items FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_vret_items_vret ON public.vendor_return_items(vret_id);

-- Update numbering
CREATE OR REPLACE FUNCTION public.next_proc_number(_company_id uuid, _prefix text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count int; v_year text;
BEGIN
  v_year := to_char(now(), 'YY');
  IF _prefix = 'INDENT' THEN SELECT COUNT(*)+1 INTO v_count FROM public.purchase_indents WHERE company_id=_company_id;
  ELSIF _prefix = 'RFQ' THEN SELECT COUNT(*)+1 INTO v_count FROM public.rfqs WHERE company_id=_company_id;
  ELSIF _prefix = 'PO' THEN SELECT COUNT(*)+1 INTO v_count FROM public.purchase_orders WHERE company_id=_company_id;
  ELSIF _prefix = 'GRN' THEN SELECT COUNT(*)+1 INTO v_count FROM public.grns WHERE company_id=_company_id;
  ELSIF _prefix = 'VINV' THEN SELECT COUNT(*)+1 INTO v_count FROM public.vendor_invoices WHERE company_id=_company_id;
  ELSIF _prefix = 'PAY' THEN SELECT COUNT(*)+1 INTO v_count FROM public.supplier_payments WHERE company_id=_company_id;
  ELSIF _prefix = 'VRET' THEN SELECT COUNT(*)+1 INTO v_count FROM public.vendor_returns WHERE company_id=_company_id;
  ELSIF _prefix = 'VQ' THEN SELECT COUNT(*)+1 INTO v_count FROM public.rfq_supplier_quotes WHERE company_id=_company_id;
  ELSE v_count := 1; END IF;
  RETURN _prefix || '-' || v_year || '-' || LPAD(v_count::text, 5, '0');
END $function$;

-- Attachments
CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  bucket_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.attachments TO authenticated;
GRANT ALL ON public.attachments TO service_role;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_company_select" ON public.attachments FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "att_company_insert" ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY "att_company_delete" ON public.attachments FOR DELETE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_att_entity ON public.attachments(company_id, entity_type, entity_id);

-- storage.objects policies for 'attachments' bucket (path: {company_id}/{entity_type}/{entity_id}/{filename})
DROP POLICY IF EXISTS "att_obj_select" ON storage.objects;
DROP POLICY IF EXISTS "att_obj_insert" ON storage.objects;
DROP POLICY IF EXISTS "att_obj_delete" ON storage.objects;
CREATE POLICY "att_obj_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text);
CREATE POLICY "att_obj_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments' AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text);
CREATE POLICY "att_obj_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text);
