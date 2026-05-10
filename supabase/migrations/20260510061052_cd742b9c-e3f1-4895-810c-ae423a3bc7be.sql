
-- Recreate SELECT/INSERT policies with TO authenticated
DROP POLICY IF EXISTS "hr view employees" ON public.employees;
CREATE POLICY "hr view employees" ON public.employees
  FOR SELECT TO authenticated
  USING ((company_id = get_user_company(auth.uid())) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'hr'::app_role]));

DROP POLICY IF EXISTS "hr view salary_structures" ON public.salary_structures;
CREATE POLICY "hr view salary_structures" ON public.salary_structures
  FOR SELECT TO authenticated
  USING ((company_id = get_user_company(auth.uid())) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'hr'::app_role]));

DROP POLICY IF EXISTS "hr view payroll_runs" ON public.payroll_runs;
CREATE POLICY "hr view payroll_runs" ON public.payroll_runs
  FOR SELECT TO authenticated
  USING ((company_id = get_user_company(auth.uid())) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'hr'::app_role]));

DROP POLICY IF EXISTS "hr view payroll_items" ON public.payroll_items;
CREATE POLICY "hr view payroll_items" ON public.payroll_items
  FOR SELECT TO authenticated
  USING ((company_id = get_user_company(auth.uid())) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'hr'::app_role]));

DROP POLICY IF EXISTS "users insert own profile" ON public.profiles;
CREATE POLICY "users insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((id = auth.uid()) AND ((company_id IS NULL) OR is_super_admin(auth.uid())));

-- user_roles INSERT policy: find current name and recreate
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.user_roles'::regclass
      AND polcmd = 'a'
      AND 0 = ANY(polroles)  -- public role
  LOOP
    EXECUTE format('DROP POLICY %I ON public.user_roles', r.polname);
  END LOOP;
END $$;

CREATE POLICY "company admin manage company roles insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_company_admin(auth.uid(), company_id)
    AND role <> 'super_admin'::app_role
    AND company_id = get_user_company(auth.uid())
    AND user_id IN (SELECT id FROM public.profiles WHERE company_id = user_roles.company_id)
  );

-- Revoke EXECUTE from anon/authenticated/PUBLIC on internal trigger + helper functions
REVOKE EXECUTE ON FUNCTION public.recalc_invoice_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_grn_item_to_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_grn_posted_backfill() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_material_consumption_to_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_post_consumption() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_post_grn() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_post_invoice() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_post_payment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_post_payroll() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_post_sup_payment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_post_vinv() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_production_output_to_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_seed_company_coa() FROM PUBLIC, anon, authenticated;
-- handle_new_user is a SECURITY DEFINER trigger on auth.users; revoke too
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
