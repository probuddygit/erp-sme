
-- 1) Restrict SELECT on sensitive HR/payroll tables to admin + hr roles
DROP POLICY IF EXISTS "members view employees" ON public.employees;
CREATE POLICY "hr view employees" ON public.employees
  FOR SELECT USING (
    company_id = public.get_user_company(auth.uid())
    AND public.has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'hr'::app_role])
  );

DROP POLICY IF EXISTS "members view salary_structures" ON public.salary_structures;
CREATE POLICY "hr view salary_structures" ON public.salary_structures
  FOR SELECT USING (
    company_id = public.get_user_company(auth.uid())
    AND public.has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'hr'::app_role])
  );

DROP POLICY IF EXISTS "members view payroll_items" ON public.payroll_items;
CREATE POLICY "hr view payroll_items" ON public.payroll_items
  FOR SELECT USING (
    company_id = public.get_user_company(auth.uid())
    AND public.has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'hr'::app_role])
  );

DROP POLICY IF EXISTS "members view payroll_runs" ON public.payroll_runs;
CREATE POLICY "hr view payroll_runs" ON public.payroll_runs
  FOR SELECT USING (
    company_id = public.get_user_company(auth.uid())
    AND public.has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role, 'hr'::app_role])
  );

-- 2) Tighten user_roles INSERT: company_id must match caller's company,
--    target user must belong to the same company, no super_admin grant.
DROP POLICY IF EXISTS "company admin manage company roles" ON public.user_roles;
CREATE POLICY "company admin manage company roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    public.is_company_admin(auth.uid(), company_id)
    AND role <> 'super_admin'::app_role
    AND company_id = public.get_user_company(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id AND p.company_id = user_roles.company_id
    )
  );

-- 3) Profiles INSERT policy: users may only insert their own profile row.
--    The handle_new_user trigger runs as SECURITY DEFINER and bypasses RLS,
--    so signup still works. This blocks arbitrary client-side inserts that
--    could attach the caller to another company.
DROP POLICY IF EXISTS "users insert own profile" ON public.profiles;
CREATE POLICY "users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
    AND (company_id IS NULL OR public.is_super_admin(auth.uid()))
  );

-- 4) Fix mutable search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

-- 5) Revoke EXECUTE on internal SECURITY DEFINER helpers from API roles.
--    Triggers and RLS policies invoke these regardless of grants.
REVOKE EXECUTE ON FUNCTION public.get_user_company(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_company_role(uuid, uuid, app_role[]) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_company_admin(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.acct(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.next_je_number(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.next_doc_number(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.next_proc_number(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.next_wo_number(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.next_payroll_number(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.post_journal(uuid, date, text, text, uuid, text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.post_stock_receipt(uuid, uuid, uuid, numeric, numeric, text, numeric, numeric, numeric, date, text, uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.post_stock_issue(uuid, uuid, uuid, numeric, text, uuid, text, stock_txn_type) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_chart_of_accounts(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.account_balances(uuid, date, date) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.item_stock_levels(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.explode_bom(uuid, numeric) FROM anon, authenticated, public;
