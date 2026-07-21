
-- UOM
CREATE TABLE IF NOT EXISTS public.uom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uom TO authenticated;
GRANT ALL ON public.uom TO service_role;
ALTER TABLE public.uom ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uom_company_all" ON public.uom FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_uom_touch BEFORE UPDATE ON public.uom FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- GST Rates
CREATE TABLE IF NOT EXISTS public.gst_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate numeric(6,3) NOT NULL,
  cgst numeric(6,3) NOT NULL DEFAULT 0,
  sgst numeric(6,3) NOT NULL DEFAULT 0,
  igst numeric(6,3) NOT NULL DEFAULT 0,
  hsn_sac text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gst_rates TO authenticated;
GRANT ALL ON public.gst_rates TO service_role;
ALTER TABLE public.gst_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gst_rates_company_all" ON public.gst_rates FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_gst_rates_touch BEFORE UPDATE ON public.gst_rates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Payment Terms
CREATE TABLE IF NOT EXISTS public.payment_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  net_days integer NOT NULL DEFAULT 0,
  discount_percent numeric(6,3) DEFAULT 0,
  discount_days integer DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_terms TO authenticated;
GRANT ALL ON public.payment_terms TO service_role;
ALTER TABLE public.payment_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_terms_company_all" ON public.payment_terms FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_payment_terms_touch BEFORE UPDATE ON public.payment_terms FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Tax Codes
CREATE TABLE IF NOT EXISTS public.tax_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  tax_type text NOT NULL DEFAULT 'gst',
  rate numeric(6,3) NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_codes TO authenticated;
GRANT ALL ON public.tax_codes TO service_role;
ALTER TABLE public.tax_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_codes_company_all" ON public.tax_codes FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_tax_codes_touch BEFORE UPDATE ON public.tax_codes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Price Lists
CREATE TABLE IF NOT EXISTS public.price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  list_type text NOT NULL DEFAULT 'sales',
  currency text NOT NULL DEFAULT 'INR',
  valid_from date,
  valid_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_lists TO authenticated;
GRANT ALL ON public.price_lists TO service_role;
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_lists_company_all" ON public.price_lists FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_price_lists_touch BEFORE UPDATE ON public.price_lists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Currencies
CREATE TABLE IF NOT EXISTS public.currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  symbol text,
  exchange_rate numeric(14,6) NOT NULL DEFAULT 1,
  is_base boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currencies TO authenticated;
GRANT ALL ON public.currencies TO service_role;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "currencies_company_all" ON public.currencies FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_currencies_touch BEFORE UPDATE ON public.currencies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
