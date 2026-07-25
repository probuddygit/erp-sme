
-- CRM Contacts
CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  owner_id UUID,
  last_contacted_at TIMESTAMPTZ,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_contacts_company ON public.crm_contacts(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view crm_contacts" ON public.crm_contacts FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "sales manage crm_contacts insert" ON public.crm_contacts FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE POLICY "sales manage crm_contacts update" ON public.crm_contacts FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "sales delete crm_contacts" ON public.crm_contacts FOR DELETE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE TRIGGER trg_crm_contacts_updated BEFORE UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- CRM Follow-ups
CREATE TABLE public.crm_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  owner_id UUID,
  due_date DATE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  done BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_follow_ups_company ON public.crm_follow_ups(company_id, due_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_follow_ups TO authenticated;
GRANT ALL ON public.crm_follow_ups TO service_role;
ALTER TABLE public.crm_follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view follow_ups" ON public.crm_follow_ups FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "sales insert follow_ups" ON public.crm_follow_ups FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE POLICY "sales update follow_ups" ON public.crm_follow_ups FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "sales delete follow_ups" ON public.crm_follow_ups FOR DELETE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE TRIGGER trg_crm_follow_ups_updated BEFORE UPDATE ON public.crm_follow_ups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- CRM Activities
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL DEFAULT 'task',
  subject TEXT NOT NULL,
  related_type TEXT,
  related_id UUID,
  owner_id UUID,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_activities_company ON public.crm_activities(company_id, scheduled_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view activities" ON public.crm_activities FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "sales insert activities" ON public.crm_activities FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE POLICY "sales update activities" ON public.crm_activities FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "sales delete activities" ON public.crm_activities FOR DELETE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE TRIGGER trg_crm_activities_updated BEFORE UPDATE ON public.crm_activities FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- CRM Email history
CREATE TABLE public.crm_email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'outbound',
  subject TEXT NOT NULL,
  from_addr TEXT NOT NULL,
  to_addr TEXT NOT NULL,
  preview TEXT,
  body TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened BOOLEAN NOT NULL DEFAULT false,
  related_type TEXT,
  related_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_email_company ON public.crm_email_history(company_id, sent_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_email_history TO authenticated;
GRANT ALL ON public.crm_email_history TO service_role;
ALTER TABLE public.crm_email_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view email_history" ON public.crm_email_history FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "sales insert email_history" ON public.crm_email_history FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE POLICY "sales update email_history" ON public.crm_email_history FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "sales delete email_history" ON public.crm_email_history FOR DELETE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) AND public.has_company_role(auth.uid(), company_id, ARRAY['admin','sales']::app_role[]));
CREATE TRIGGER trg_crm_email_history_updated BEFORE UPDATE ON public.crm_email_history FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
