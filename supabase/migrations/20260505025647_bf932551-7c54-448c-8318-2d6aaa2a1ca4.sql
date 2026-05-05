
-- ============== ENUMS ==============
DO $$ BEGIN CREATE TYPE public.account_type AS ENUM ('asset','liability','equity','revenue','expense'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.je_status AS ENUM ('draft','posted','reversed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.gst_kind AS ENUM ('output','input'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============== TABLES ==============
CREATE TABLE public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  type account_type NOT NULL,
  parent_id uuid,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  currency text NOT NULL DEFAULT 'INR',
  gst_rate numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  entry_number text NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  source_module text,
  source_type text,
  source_id uuid,
  narration text,
  status je_status NOT NULL DEFAULT 'posted',
  total_debit numeric(14,2) NOT NULL DEFAULT 0,
  total_credit numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL,
  debit numeric(14,2) NOT NULL DEFAULT 0,
  credit numeric(14,2) NOT NULL DEFAULT 0,
  description text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.gst_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  entry_id uuid REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  kind gst_kind NOT NULL,
  rate numeric(5,2) NOT NULL DEFAULT 0,
  taxable_value numeric(14,2) NOT NULL DEFAULT 0,
  cgst numeric(14,2) NOT NULL DEFAULT 0,
  sgst numeric(14,2) NOT NULL DEFAULT 0,
  igst numeric(14,2) NOT NULL DEFAULT 0,
  source_module text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_je_company_date ON public.journal_entries(company_id, entry_date);
CREATE INDEX idx_jl_account ON public.journal_lines(account_id);
CREATE INDEX idx_jl_entry ON public.journal_lines(entry_id);
CREATE INDEX idx_je_source ON public.journal_entries(source_module, source_id);

-- ============== RLS ==============
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view coa" ON public.chart_of_accounts FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "fin manage coa ins" ON public.chart_of_accounts FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'finance'::app_role]));
CREATE POLICY "fin manage coa upd" ON public.chart_of_accounts FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'finance'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "fin manage coa del" ON public.chart_of_accounts FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'finance'::app_role]) AND is_system = false);
CREATE POLICY "super admin coa" ON public.chart_of_accounts FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "members view je" ON public.journal_entries FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "fin insert je" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'finance'::app_role]));
CREATE POLICY "fin update je" ON public.journal_entries FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'finance'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "super admin je" ON public.journal_entries FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "members view jl" ON public.journal_lines FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "fin insert jl" ON public.journal_lines FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'finance'::app_role]));
CREATE POLICY "super admin jl" ON public.journal_lines FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "members view gst" ON public.gst_ledger FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "super admin gst" ON public.gst_ledger FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- ============== HELPERS ==============
CREATE OR REPLACE FUNCTION public.next_je_number(_company_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int; v_year text;
BEGIN
  v_year := to_char(now(), 'YY');
  SELECT COUNT(*)+1 INTO v_count FROM public.journal_entries WHERE company_id = _company_id;
  RETURN 'JE-' || v_year || '-' || LPAD(v_count::text, 6, '0');
END $$;

-- Seed standard accounts for a company
CREATE OR REPLACE FUNCTION public.seed_chart_of_accounts(_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE company_id = _company_id) THEN RETURN; END IF;
  INSERT INTO public.chart_of_accounts(company_id,code,name,type,is_system) VALUES
    (_company_id,'1000','Cash','asset',true),
    (_company_id,'1010','Bank','asset',true),
    (_company_id,'1100','Accounts Receivable','asset',true),
    (_company_id,'1200','Inventory','asset',true),
    (_company_id,'1300','GST Input Credit','asset',true),
    (_company_id,'2000','Accounts Payable','liability',true),
    (_company_id,'2100','GST Output Payable','liability',true),
    (_company_id,'3000','Owner Equity','equity',true),
    (_company_id,'3100','Retained Earnings','equity',true),
    (_company_id,'4000','Sales Revenue','revenue',true),
    (_company_id,'5000','Cost of Goods Sold','expense',true),
    (_company_id,'5100','Operating Expenses','expense',true),
    (_company_id,'5200','Freight & Duty','expense',true);
END $$;

-- Seed when a company is created
CREATE OR REPLACE FUNCTION public.tg_seed_company_coa()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_chart_of_accounts(NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_company_coa ON public.companies;
CREATE TRIGGER tg_company_coa AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.tg_seed_company_coa();

-- Backfill existing companies
DO $$ DECLARE r record;
BEGIN FOR r IN SELECT id FROM public.companies LOOP PERFORM public.seed_chart_of_accounts(r.id); END LOOP; END $$;

-- Look up an account by code
CREATE OR REPLACE FUNCTION public.acct(_company_id uuid, _code text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.chart_of_accounts WHERE company_id=_company_id AND code=_code LIMIT 1;
$$;

-- Post a balanced journal entry
CREATE OR REPLACE FUNCTION public.post_journal(
  _company_id uuid, _date date, _module text, _src_type text, _src_id uuid,
  _narration text, _lines jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid; v_num text; v_dr numeric := 0; v_cr numeric := 0; v_line jsonb; v_pos int := 0;
BEGIN
  v_num := public.next_je_number(_company_id);
  INSERT INTO public.journal_entries(company_id, entry_number, entry_date, source_module, source_type, source_id, narration, status)
  VALUES(_company_id, v_num, _date, _module, _src_type, _src_id, _narration, 'posted')
  RETURNING id INTO v_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    INSERT INTO public.journal_lines(company_id, entry_id, account_id, debit, credit, description, position)
    VALUES(_company_id, v_id,
      (v_line->>'account_id')::uuid,
      COALESCE((v_line->>'debit')::numeric, 0),
      COALESCE((v_line->>'credit')::numeric, 0),
      v_line->>'description', v_pos);
    v_dr := v_dr + COALESCE((v_line->>'debit')::numeric, 0);
    v_cr := v_cr + COALESCE((v_line->>'credit')::numeric, 0);
    v_pos := v_pos + 1;
  END LOOP;

  UPDATE public.journal_entries SET total_debit = v_dr, total_credit = v_cr WHERE id = v_id;
  RETURN v_id;
END $$;

-- ============== AUTO POSTING TRIGGERS ==============
-- Sales invoice posted: DR AR, CR Revenue, CR GST Output
CREATE OR REPLACE FUNCTION public.tg_post_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ar uuid; v_rev uuid; v_gst uuid; v_je uuid; v_lines jsonb;
BEGIN
  IF NEW.status IN ('sent','partially_paid','paid','overdue') AND
     (TG_OP = 'INSERT' OR OLD.status = 'draft') AND
     NOT EXISTS (SELECT 1 FROM public.journal_entries WHERE source_module='sales' AND source_type='invoice' AND source_id=NEW.id) THEN
    v_ar := public.acct(NEW.company_id,'1100');
    v_rev := public.acct(NEW.company_id,'4000');
    v_gst := public.acct(NEW.company_id,'2100');
    v_lines := jsonb_build_array(
      jsonb_build_object('account_id', v_ar, 'debit', NEW.grand_total, 'credit', 0, 'description', 'AR ' || NEW.invoice_number),
      jsonb_build_object('account_id', v_rev, 'debit', 0, 'credit', NEW.subtotal - COALESCE(NEW.discount_total,0), 'description', 'Revenue'),
      jsonb_build_object('account_id', v_gst, 'debit', 0, 'credit', NEW.tax_total, 'description', 'GST output')
    );
    v_je := public.post_journal(NEW.company_id, NEW.invoice_date, 'sales', 'invoice', NEW.id, 'Sales invoice ' || NEW.invoice_number, v_lines);
    IF NEW.tax_total > 0 THEN
      INSERT INTO public.gst_ledger(company_id, entry_id, txn_date, kind, taxable_value, cgst, sgst, igst, source_module, source_id)
      VALUES(NEW.company_id, v_je, NEW.invoice_date, 'output', NEW.subtotal - COALESCE(NEW.discount_total,0),
             COALESCE(NEW.cgst_total,0), COALESCE(NEW.sgst_total,0), COALESCE(NEW.igst_total,0), 'sales', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_invoice_post ON public.invoices;
CREATE TRIGGER tg_invoice_post AFTER INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.tg_post_invoice();

-- Customer payment: DR Bank, CR AR
CREATE OR REPLACE FUNCTION public.tg_post_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bank uuid; v_ar uuid;
BEGIN
  v_bank := public.acct(NEW.company_id, CASE WHEN NEW.method = 'cash' THEN '1000' ELSE '1010' END);
  v_ar := public.acct(NEW.company_id,'1100');
  PERFORM public.post_journal(NEW.company_id, NEW.payment_date, 'sales', 'payment', NEW.id, 'Customer payment',
    jsonb_build_array(
      jsonb_build_object('account_id', v_bank, 'debit', NEW.amount, 'credit', 0, 'description', 'Receipt'),
      jsonb_build_object('account_id', v_ar, 'debit', 0, 'credit', NEW.amount, 'description', 'AR settlement')
    ));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_payment_post ON public.payments;
CREATE TRIGGER tg_payment_post AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tg_post_payment();

-- GRN posted: DR Inventory, DR Freight, CR AP (uses unit_cost * qty as approximation; vendor invoice will reconcile)
CREATE OR REPLACE FUNCTION public.tg_post_grn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv uuid; v_ap uuid; v_freight uuid; v_total numeric; v_lines jsonb;
BEGIN
  IF NEW.status='posted' AND COALESCE(OLD.status::text,'draft')<>'posted' THEN
    SELECT COALESCE(SUM(quantity*unit_cost),0) INTO v_total FROM public.grn_items WHERE grn_id=NEW.id;
    IF v_total + COALESCE(NEW.freight,0)+COALESCE(NEW.duty,0)+COALESCE(NEW.other_landed,0) <= 0 THEN RETURN NEW; END IF;
    v_inv := public.acct(NEW.company_id,'1200');
    v_ap := public.acct(NEW.company_id,'2000');
    v_freight := public.acct(NEW.company_id,'5200');
    v_lines := jsonb_build_array(
      jsonb_build_object('account_id', v_inv, 'debit', v_total, 'credit', 0, 'description', 'Inventory ' || NEW.grn_number),
      jsonb_build_object('account_id', v_freight, 'debit', COALESCE(NEW.freight,0)+COALESCE(NEW.duty,0)+COALESCE(NEW.other_landed,0), 'credit', 0, 'description', 'Landed cost'),
      jsonb_build_object('account_id', v_ap, 'debit', 0, 'credit', v_total + COALESCE(NEW.freight,0)+COALESCE(NEW.duty,0)+COALESCE(NEW.other_landed,0), 'description', 'AP accrual')
    );
    PERFORM public.post_journal(NEW.company_id, NEW.received_date, 'procurement', 'grn', NEW.id, 'Goods receipt ' || NEW.grn_number, v_lines);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_grn_post ON public.grns;
CREATE TRIGGER tg_grn_post AFTER INSERT OR UPDATE ON public.grns FOR EACH ROW EXECUTE FUNCTION public.tg_post_grn();

-- Vendor invoice: DR GST Input (if any), no inventory move (already booked at GRN). Only book the GST + reclass AP if needed.
-- For simplicity: when vendor invoice has tax, DR GST Input, CR AP.
CREATE OR REPLACE FUNCTION public.tg_post_vinv()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_gst uuid; v_ap uuid; v_je uuid;
BEGIN
  IF NEW.status IN ('matched','approved','paid','partially_paid') AND
     (TG_OP='INSERT' OR OLD.status='draft') AND
     COALESCE(NEW.tax_total,0) > 0 AND
     NOT EXISTS (SELECT 1 FROM public.journal_entries WHERE source_module='procurement' AND source_type='vendor_invoice' AND source_id=NEW.id) THEN
    v_gst := public.acct(NEW.company_id,'1300');
    v_ap := public.acct(NEW.company_id,'2000');
    v_je := public.post_journal(NEW.company_id, NEW.invoice_date, 'procurement', 'vendor_invoice', NEW.id, 'Vendor invoice ' || NEW.vinv_number,
      jsonb_build_array(
        jsonb_build_object('account_id', v_gst, 'debit', NEW.tax_total, 'credit', 0, 'description', 'GST input'),
        jsonb_build_object('account_id', v_ap, 'debit', 0, 'credit', NEW.tax_total, 'description', 'AP — tax')
      ));
    INSERT INTO public.gst_ledger(company_id, entry_id, txn_date, kind, taxable_value, igst, source_module, source_id)
    VALUES(NEW.company_id, v_je, NEW.invoice_date, 'input', NEW.subtotal, NEW.tax_total, 'procurement', NEW.id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_vinv_post ON public.vendor_invoices;
CREATE TRIGGER tg_vinv_post AFTER INSERT OR UPDATE ON public.vendor_invoices FOR EACH ROW EXECUTE FUNCTION public.tg_post_vinv();

-- Supplier payment: DR AP, CR Bank
CREATE OR REPLACE FUNCTION public.tg_post_sup_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bank uuid; v_ap uuid;
BEGIN
  v_bank := public.acct(NEW.company_id, CASE WHEN NEW.method='cash' THEN '1000' ELSE '1010' END);
  v_ap := public.acct(NEW.company_id,'2000');
  PERFORM public.post_journal(NEW.company_id, NEW.payment_date, 'procurement', 'supplier_payment', NEW.id, 'Supplier payment',
    jsonb_build_array(
      jsonb_build_object('account_id', v_ap, 'debit', NEW.amount, 'credit', 0, 'description', 'AP settle'),
      jsonb_build_object('account_id', v_bank, 'debit', 0, 'credit', NEW.amount, 'description', 'Bank out')
    ));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_sup_payment_post ON public.supplier_payments;
CREATE TRIGGER tg_sup_payment_post AFTER INSERT ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION public.tg_post_sup_payment();

-- Production output: DR Finished Inventory, CR WIP/COGS recognition is deferred to sale; record consumption as DR COGS, CR Inventory
-- Material consumption: DR COGS, CR Inventory
CREATE OR REPLACE FUNCTION public.tg_post_consumption()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cogs uuid; v_inv uuid;
BEGIN
  IF COALESCE(NEW.total_cost,0) <= 0 THEN RETURN NEW; END IF;
  v_cogs := public.acct(NEW.company_id,'5000');
  v_inv := public.acct(NEW.company_id,'1200');
  PERFORM public.post_journal(NEW.company_id, NEW.consumed_at::date, 'production', 'consumption', NEW.id, 'Material consumption',
    jsonb_build_array(
      jsonb_build_object('account_id', v_cogs, 'debit', NEW.total_cost, 'credit', 0, 'description', NEW.material_name),
      jsonb_build_object('account_id', v_inv, 'debit', 0, 'credit', NEW.total_cost, 'description', 'Inventory issue')
    ));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_consumption_post ON public.material_consumption;
CREATE TRIGGER tg_consumption_post AFTER INSERT ON public.material_consumption FOR EACH ROW EXECUTE FUNCTION public.tg_post_consumption();

-- ============== REPORTING VIEWS / FUNCTIONS ==============
CREATE OR REPLACE FUNCTION public.account_balances(_company_id uuid, _from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS TABLE(account_id uuid, code text, name text, type account_type, debit numeric, credit numeric, balance numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.code, a.name, a.type,
    COALESCE(SUM(jl.debit),0) AS debit,
    COALESCE(SUM(jl.credit),0) AS credit,
    COALESCE(SUM(jl.debit - jl.credit),0) AS balance
  FROM public.chart_of_accounts a
  LEFT JOIN public.journal_lines jl ON jl.account_id = a.id
  LEFT JOIN public.journal_entries je ON je.id = jl.entry_id AND je.status='posted'
    AND (_from IS NULL OR je.entry_date >= _from)
    AND (_to IS NULL OR je.entry_date <= _to)
  WHERE a.company_id = _company_id
  GROUP BY a.id, a.code, a.name, a.type
  ORDER BY a.code;
$$;
