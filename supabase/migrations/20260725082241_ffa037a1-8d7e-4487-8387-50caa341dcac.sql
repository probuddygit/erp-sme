
-- Broaden CRM write policies to any company member (matches SELECT scope)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_contacts','crm_follow_ups','crm_activities','crm_email_history']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'sales insert '||replace(t,'crm_',''), t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'sales manage '||t||' insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'sales update '||replace(t,'crm_',''), t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'sales manage '||t||' update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'sales delete '||replace(t,'crm_',''), t);

    EXECUTE format($p$CREATE POLICY "members insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company(auth.uid()))$p$, t);
    EXECUTE format($p$CREATE POLICY "members update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (company_id = public.get_user_company(auth.uid())) WITH CHECK (company_id = public.get_user_company(auth.uid()))$p$, t);
    EXECUTE format($p$CREATE POLICY "members delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (company_id = public.get_user_company(auth.uid()))$p$, t);
  END LOOP;
END $$;
