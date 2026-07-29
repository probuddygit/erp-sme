
-- =========================================================
-- CRM REVAMP MIGRATION (additive)
-- Rollback: see .lovable/backup/crm_revamp_rollback.sql
-- =========================================================

-- --- crm_accounts -----------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  gstin text,
  pan text,
  billing_address text,
  shipping_address text,
  credit_limit numeric NOT NULL DEFAULT 0,
  credit_days integer NOT NULL DEFAULT 0,
  price_list_id uuid REFERENCES public.price_lists(id) ON DELETE SET NULL,
  territory text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  gstin_verified_at timestamptz,
  gstin_legal_name text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_accounts TO authenticated;
GRANT ALL ON public.crm_accounts TO service_role;
ALTER TABLE public.crm_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_accounts company members read"   ON public.crm_accounts FOR SELECT TO authenticated USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "crm_accounts company members insert" ON public.crm_accounts FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "crm_accounts company members update" ON public.crm_accounts FOR UPDATE TO authenticated USING (company_id = public.get_user_company(auth.uid())) WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "crm_accounts company members delete" ON public.crm_accounts FOR DELETE TO authenticated USING (company_id = public.get_user_company(auth.uid()));
CREATE TRIGGER trg_crm_accounts_touch BEFORE UPDATE ON public.crm_accounts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS idx_crm_accounts_company ON public.crm_accounts(company_id);

-- --- crm_opportunities ------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  name text NOT NULL,
  stage text NOT NULL DEFAULT 'prospecting',
  value numeric NOT NULL DEFAULT 0,
  probability integer NOT NULL DEFAULT 20,
  expected_close date,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  lost_reason text,
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_opportunities TO authenticated;
GRANT ALL ON public.crm_opportunities TO service_role;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_opps read"   ON public.crm_opportunities FOR SELECT TO authenticated USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "crm_opps insert" ON public.crm_opportunities FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "crm_opps update" ON public.crm_opportunities FOR UPDATE TO authenticated USING (company_id = public.get_user_company(auth.uid())) WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "crm_opps delete" ON public.crm_opportunities FOR DELETE TO authenticated USING (company_id = public.get_user_company(auth.uid()));
CREATE TRIGGER trg_crm_opps_touch BEFORE UPDATE ON public.crm_opportunities FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS idx_crm_opps_company ON public.crm_opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_opps_account ON public.crm_opportunities(account_id);

-- Auto-update stage_entered_at when stage changes
CREATE OR REPLACE FUNCTION public.tg_opp_stage_entered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_entered_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_opp_stage_entered BEFORE UPDATE ON public.crm_opportunities FOR EACH ROW EXECUTE FUNCTION public.tg_opp_stage_entered();

-- --- crm_stage_configs ------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_stage_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('lead','opportunity')),
  stage_key text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  tone text,
  aging_threshold_days integer NOT NULL DEFAULT 14,
  is_terminal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, kind, stage_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_stage_configs TO authenticated;
GRANT ALL ON public.crm_stage_configs TO service_role;
ALTER TABLE public.crm_stage_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage_cfg read"   ON public.crm_stage_configs FOR SELECT TO authenticated USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "stage_cfg insert" ON public.crm_stage_configs FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "stage_cfg update" ON public.crm_stage_configs FOR UPDATE TO authenticated USING (company_id = public.get_user_company(auth.uid())) WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "stage_cfg delete" ON public.crm_stage_configs FOR DELETE TO authenticated USING (company_id = public.get_user_company(auth.uid()));
CREATE TRIGGER trg_stage_cfg_touch BEFORE UPDATE ON public.crm_stage_configs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- --- extend leads -----------------------------------------
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS product_interest text,
  ADD COLUMN IF NOT EXISTS territory text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS score numeric,
  ADD COLUMN IF NOT EXISTS score_factors jsonb,
  ADD COLUMN IF NOT EXISTS converted_account_id uuid REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS disqualified_reason text,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS channel text;

-- --- extend crm_contacts ----------------------------------
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false;

-- --- extend crm_activities --------------------------------
ALTER TABLE public.crm_activities
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gps_lat numeric,
  ADD COLUMN IF NOT EXISTS gps_lng numeric,
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS checked_in boolean NOT NULL DEFAULT false;

-- --- convert_lead RPC (Accounts + Contact + Opportunity) --
CREATE OR REPLACE FUNCTION public.convert_lead_to_account(
  _lead_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _lead public.leads%ROWTYPE;
  _cid uuid;
  _acc_id uuid;
  _contact_id uuid;
  _opp_id uuid;
BEGIN
  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
  _cid := _lead.company_id;
  IF public.get_user_company(auth.uid()) IS DISTINCT FROM _cid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _lead.converted_account_id IS NOT NULL THEN
    _acc_id := _lead.converted_account_id;
  ELSE
    INSERT INTO public.crm_accounts (company_id, name, owner_id, created_by, territory)
    VALUES (_cid, COALESCE(_lead.company_name, _lead.title), _lead.owner_id, auth.uid(), _lead.territory)
    RETURNING id INTO _acc_id;
  END IF;

  IF _lead.contact_name IS NOT NULL OR _lead.email IS NOT NULL OR _lead.phone IS NOT NULL THEN
    INSERT INTO public.crm_contacts (company_id, account_id, name, email, phone, is_primary, created_by)
    VALUES (_cid, _acc_id, COALESCE(_lead.contact_name, _lead.title), _lead.email, _lead.phone, true, auth.uid())
    RETURNING id INTO _contact_id;
  END IF;

  INSERT INTO public.crm_opportunities (company_id, account_id, lead_id, name, stage, value, probability, expected_close, owner_id, created_by)
  VALUES (_cid, _acc_id, _lead.id, _lead.title, 'prospecting', COALESCE(_lead.expected_value, 0), COALESCE(_lead.win_probability, 20), _lead.expected_close_date, _lead.owner_id, auth.uid())
  RETURNING id INTO _opp_id;

  UPDATE public.leads SET converted_account_id = _acc_id, status = 'qualified' WHERE id = _lead_id;

  RETURN jsonb_build_object('account_id', _acc_id, 'contact_id', _contact_id, 'opportunity_id', _opp_id);
END $$;

REVOKE EXECUTE ON FUNCTION public.convert_lead_to_account(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.convert_lead_to_account(uuid) TO authenticated;

-- --- Seed default stage configs for existing companies ----
INSERT INTO public.crm_stage_configs (company_id, kind, stage_key, label, sort_order, tone, aging_threshold_days, is_terminal)
SELECT c.id, 'lead', v.stage_key, v.label, v.sort_order, v.tone, v.days, v.terminal
FROM public.companies c
CROSS JOIN (VALUES
  ('new',         'New',         1, 'bg-slate-100 text-slate-700 border-slate-200',   7,  false),
  ('contacted',   'Contacted',   2, 'bg-blue-50 text-blue-700 border-blue-200',       7,  false),
  ('qualified',   'Qualified',   3, 'bg-violet-50 text-violet-700 border-violet-200', 14, false),
  ('disqualified','Disqualified',4, 'bg-rose-50 text-rose-700 border-rose-200',       0,  true),
  ('converted',   'Converted',   5, 'bg-emerald-50 text-emerald-700 border-emerald-200', 0, true)
) AS v(stage_key,label,sort_order,tone,days,terminal)
ON CONFLICT (company_id, kind, stage_key) DO NOTHING;

INSERT INTO public.crm_stage_configs (company_id, kind, stage_key, label, sort_order, tone, aging_threshold_days, is_terminal)
SELECT c.id, 'opportunity', v.stage_key, v.label, v.sort_order, v.tone, v.days, v.terminal
FROM public.companies c
CROSS JOIN (VALUES
  ('prospecting',    'Prospecting',    1, 'bg-slate-100 text-slate-700 border-slate-200',   10, false),
  ('quotation_sent', 'Quotation Sent', 2, 'bg-blue-50 text-blue-700 border-blue-200',       10, false),
  ('negotiation',    'Negotiation',    3, 'bg-amber-50 text-amber-800 border-amber-200',    14, false),
  ('won',            'Won',            4, 'bg-emerald-50 text-emerald-700 border-emerald-200', 0, true),
  ('lost',           'Lost',           5, 'bg-rose-50 text-rose-700 border-rose-200',       0,  true)
) AS v(stage_key,label,sort_order,tone,days,terminal)
ON CONFLICT (company_id, kind, stage_key) DO NOTHING;

-- Auto-seed stage configs on new company creation
CREATE OR REPLACE FUNCTION public.tg_seed_stage_configs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.crm_stage_configs (company_id, kind, stage_key, label, sort_order, tone, aging_threshold_days, is_terminal)
  VALUES
    (NEW.id, 'lead','new','New',1,'bg-slate-100 text-slate-700 border-slate-200',7,false),
    (NEW.id, 'lead','contacted','Contacted',2,'bg-blue-50 text-blue-700 border-blue-200',7,false),
    (NEW.id, 'lead','qualified','Qualified',3,'bg-violet-50 text-violet-700 border-violet-200',14,false),
    (NEW.id, 'lead','disqualified','Disqualified',4,'bg-rose-50 text-rose-700 border-rose-200',0,true),
    (NEW.id, 'lead','converted','Converted',5,'bg-emerald-50 text-emerald-700 border-emerald-200',0,true),
    (NEW.id, 'opportunity','prospecting','Prospecting',1,'bg-slate-100 text-slate-700 border-slate-200',10,false),
    (NEW.id, 'opportunity','quotation_sent','Quotation Sent',2,'bg-blue-50 text-blue-700 border-blue-200',10,false),
    (NEW.id, 'opportunity','negotiation','Negotiation',3,'bg-amber-50 text-amber-800 border-amber-200',14,false),
    (NEW.id, 'opportunity','won','Won',4,'bg-emerald-50 text-emerald-700 border-emerald-200',0,true),
    (NEW.id, 'opportunity','lost','Lost',5,'bg-rose-50 text-rose-700 border-rose-200',0,true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_stage_configs ON public.companies;
CREATE TRIGGER trg_seed_stage_configs AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.tg_seed_stage_configs();
