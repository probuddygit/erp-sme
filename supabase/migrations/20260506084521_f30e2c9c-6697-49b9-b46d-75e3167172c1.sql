
-- Enums
DO $$ BEGIN
  CREATE TYPE public.employee_status AS ENUM ('active','on_leave','resigned','terminated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('present','absent','half_day','leave','holiday','week_off');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payroll_run_status AS ENUM ('draft','processed','posted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Employees
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_code text NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  designation text,
  department text,
  date_of_joining date NOT NULL DEFAULT CURRENT_DATE,
  date_of_birth date,
  status employee_status NOT NULL DEFAULT 'active',
  ctc_annual numeric NOT NULL DEFAULT 0,
  pf_number text,
  esi_number text,
  pan text,
  bank_name text,
  bank_account text,
  ifsc text,
  address text,
  user_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_code)
);
CREATE INDEX idx_employees_company ON public.employees(company_id);

-- Salary structure
CREATE TABLE public.salary_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  basic numeric NOT NULL DEFAULT 0,
  hra numeric NOT NULL DEFAULT 0,
  conveyance numeric NOT NULL DEFAULT 0,
  special_allowance numeric NOT NULL DEFAULT 0,
  other_allowances numeric NOT NULL DEFAULT 0,
  pf_employee_percent numeric NOT NULL DEFAULT 12,
  pf_employer_percent numeric NOT NULL DEFAULT 12,
  esi_employee_percent numeric NOT NULL DEFAULT 0.75,
  esi_employer_percent numeric NOT NULL DEFAULT 3.25,
  professional_tax numeric NOT NULL DEFAULT 200,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sal_emp ON public.salary_structures(employee_id);

-- Attendance
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  attendance_date date NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  check_in time,
  check_out time,
  hours_worked numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);
CREATE INDEX idx_att_company_date ON public.attendance(company_id, attendance_date);

-- Payroll runs
CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  run_number text NOT NULL,
  period_month int NOT NULL,
  period_year int NOT NULL,
  pay_date date NOT NULL DEFAULT CURRENT_DATE,
  status payroll_run_status NOT NULL DEFAULT 'draft',
  total_gross numeric NOT NULL DEFAULT 0,
  total_deductions numeric NOT NULL DEFAULT 0,
  total_net numeric NOT NULL DEFAULT 0,
  total_pf_employee numeric NOT NULL DEFAULT 0,
  total_pf_employer numeric NOT NULL DEFAULT 0,
  total_esi_employee numeric NOT NULL DEFAULT 0,
  total_esi_employer numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  days_present numeric NOT NULL DEFAULT 0,
  days_in_month numeric NOT NULL DEFAULT 30,
  basic numeric NOT NULL DEFAULT 0,
  hra numeric NOT NULL DEFAULT 0,
  allowances numeric NOT NULL DEFAULT 0,
  gross numeric NOT NULL DEFAULT 0,
  pf_employee numeric NOT NULL DEFAULT 0,
  pf_employer numeric NOT NULL DEFAULT 0,
  esi_employee numeric NOT NULL DEFAULT 0,
  esi_employer numeric NOT NULL DEFAULT 0,
  professional_tax numeric NOT NULL DEFAULT 0,
  tds numeric NOT NULL DEFAULT 0,
  other_deductions numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL DEFAULT 0
);
CREATE INDEX idx_pi_run ON public.payroll_items(run_id);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

-- Generic policies factory
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['employees','salary_structures','attendance','payroll_runs','payroll_items']) LOOP
    EXECUTE format('CREATE POLICY "members view %1$s" ON public.%1$s FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "hr insert %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY[''admin''::app_role,''hr''::app_role]))', t);
    EXECUTE format('CREATE POLICY "hr update %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY[''admin''::app_role,''hr''::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "hr delete %1$s" ON public.%1$s FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY[''admin''::app_role,''hr''::app_role]))', t);
    EXECUTE format('CREATE POLICY "super admin %1$s" ON public.%1$s FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()))', t);
  END LOOP;
END $$;

-- Triggers for updated_at
CREATE TRIGGER tg_emp_touch BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tg_sal_touch BEFORE UPDATE ON public.salary_structures FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tg_pr_touch BEFORE UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Numbering
CREATE OR REPLACE FUNCTION public.next_payroll_number(_company_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int; v_year text;
BEGIN
  v_year := to_char(now(),'YY');
  SELECT COUNT(*)+1 INTO v_count FROM public.payroll_runs WHERE company_id=_company_id;
  RETURN 'PAY-'||v_year||'-'||LPAD(v_count::text,5,'0');
END $$;

-- Add Salaries & Wages account on COA seed (extend seed)
CREATE OR REPLACE FUNCTION public.seed_chart_of_accounts(_company_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE company_id = _company_id) THEN
    -- ensure hr accounts exist
    INSERT INTO public.chart_of_accounts(company_id,code,name,type,is_system)
    SELECT _company_id, v.code, v.name, v.type::account_type, true
    FROM (VALUES
      ('5300','Salaries & Wages','expense'),
      ('2200','Salaries Payable','liability'),
      ('2210','PF Payable','liability'),
      ('2220','ESI Payable','liability'),
      ('2230','TDS Payable','liability')
    ) v(code,name,type)
    WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE company_id=_company_id AND code=v.code);
    RETURN;
  END IF;
  INSERT INTO public.chart_of_accounts(company_id,code,name,type,is_system) VALUES
    (_company_id,'1000','Cash','asset',true),
    (_company_id,'1010','Bank','asset',true),
    (_company_id,'1100','Accounts Receivable','asset',true),
    (_company_id,'1200','Inventory','asset',true),
    (_company_id,'1300','GST Input Credit','asset',true),
    (_company_id,'2000','Accounts Payable','liability',true),
    (_company_id,'2100','GST Output Payable','liability',true),
    (_company_id,'2200','Salaries Payable','liability',true),
    (_company_id,'2210','PF Payable','liability',true),
    (_company_id,'2220','ESI Payable','liability',true),
    (_company_id,'2230','TDS Payable','liability',true),
    (_company_id,'3000','Owner Equity','equity',true),
    (_company_id,'3100','Retained Earnings','equity',true),
    (_company_id,'4000','Sales Revenue','revenue',true),
    (_company_id,'5000','Cost of Goods Sold','expense',true),
    (_company_id,'5100','Operating Expenses','expense',true),
    (_company_id,'5200','Freight & Duty','expense',true),
    (_company_id,'5300','Salaries & Wages','expense',true);
END $function$;

-- Backfill HR accounts for all existing companies
SELECT public.seed_chart_of_accounts(id) FROM public.companies;

-- Trigger to post payroll run to ledger when status -> posted
CREATE OR REPLACE FUNCTION public.tg_post_payroll()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sal uuid; v_pf_exp uuid; v_esi_exp uuid;
  v_sal_pay uuid; v_pf_pay uuid; v_esi_pay uuid; v_tds_pay uuid;
  v_gross numeric; v_pf_e numeric; v_pf_r numeric; v_esi_e numeric; v_esi_r numeric;
  v_pt numeric; v_tds numeric; v_other numeric; v_net numeric; v_emp_total_exp numeric;
BEGIN
  IF NEW.status='posted' AND COALESCE(OLD.status::text,'draft')<>'posted' THEN
    v_sal := public.acct(NEW.company_id,'5300');
    v_pf_exp := public.acct(NEW.company_id,'5100'); -- employer PF as opex
    v_esi_exp := public.acct(NEW.company_id,'5100');
    v_sal_pay := public.acct(NEW.company_id,'2200');
    v_pf_pay := public.acct(NEW.company_id,'2210');
    v_esi_pay := public.acct(NEW.company_id,'2220');
    v_tds_pay := public.acct(NEW.company_id,'2230');

    SELECT
      COALESCE(SUM(gross),0), COALESCE(SUM(pf_employee),0), COALESCE(SUM(pf_employer),0),
      COALESCE(SUM(esi_employee),0), COALESCE(SUM(esi_employer),0),
      COALESCE(SUM(professional_tax),0), COALESCE(SUM(tds),0),
      COALESCE(SUM(other_deductions),0), COALESCE(SUM(net_pay),0)
    INTO v_gross,v_pf_e,v_pf_r,v_esi_e,v_esi_r,v_pt,v_tds,v_other,v_net
    FROM public.payroll_items WHERE run_id=NEW.id;

    IF v_gross<=0 THEN RETURN NEW; END IF;
    v_emp_total_exp := v_pf_r + v_esi_r;

    PERFORM public.post_journal(NEW.company_id, NEW.pay_date, 'hr','payroll', NEW.id,
      'Payroll '||NEW.run_number,
      jsonb_build_array(
        jsonb_build_object('account_id', v_sal,    'debit', v_gross, 'credit', 0, 'description','Gross salary'),
        jsonb_build_object('account_id', v_pf_exp, 'debit', v_emp_total_exp, 'credit', 0, 'description','Employer PF+ESI'),
        jsonb_build_object('account_id', v_pf_pay, 'debit', 0, 'credit', v_pf_e + v_pf_r, 'description','PF payable'),
        jsonb_build_object('account_id', v_esi_pay,'debit', 0, 'credit', v_esi_e + v_esi_r, 'description','ESI payable'),
        jsonb_build_object('account_id', v_tds_pay,'debit', 0, 'credit', v_tds + v_pt, 'description','TDS/PT payable'),
        jsonb_build_object('account_id', v_sal_pay,'debit', 0, 'credit', v_net + v_other, 'description','Net salary payable')
      ));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_post_payroll_run AFTER UPDATE ON public.payroll_runs
FOR EACH ROW EXECUTE FUNCTION public.tg_post_payroll();
