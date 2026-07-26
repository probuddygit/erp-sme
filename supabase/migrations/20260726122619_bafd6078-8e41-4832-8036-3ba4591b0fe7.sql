
-- Foundation layer for SAP-style ERP integration
-- Universal document metadata, event bus, comments, notifications, company settings

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.posting_status AS ENUM ('pending','posted','failed','skipped','not_applicable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notif_channel AS ENUM ('in_app','email','whatsapp','push');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notif_status AS ENUM ('pending','sent','failed','read');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- doc_kind covers every transactional document type in the app
DO $$ BEGIN
  CREATE TYPE public.doc_kind AS ENUM (
    'quotation','sales_order','delivery_note','invoice','payment','sales_return',
    'purchase_indent','rfq','purchase_order','grn','vendor_invoice','supplier_payment','vendor_return',
    'journal_entry','stock_transaction','work_order','maintenance_ticket'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add universal columns to every transactional doc table
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'quotations','sales_orders','delivery_notes','invoices','payments','sales_returns',
    'purchase_indents','rfqs','purchase_orders','grns','vendor_invoices','supplier_payments','vendor_returns'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I
      ADD COLUMN IF NOT EXISTS workflow_status text,
      ADD COLUMN IF NOT EXISTS approval_status text DEFAULT ''not_required'',
      ADD COLUMN IF NOT EXISTS financial_posting_status public.posting_status DEFAULT ''pending'',
      ADD COLUMN IF NOT EXISTS inventory_posting_status public.posting_status DEFAULT ''pending'',
      ADD COLUMN IF NOT EXISTS gst_status public.posting_status DEFAULT ''pending'',
      ADD COLUMN IF NOT EXISTS notification_status public.posting_status DEFAULT ''pending'',
      ADD COLUMN IF NOT EXISTS source_doc_kind public.doc_kind,
      ADD COLUMN IF NOT EXISTS source_doc_id uuid,
      ADD COLUMN IF NOT EXISTS version int DEFAULT 1,
      ADD COLUMN IF NOT EXISTS modified_by uuid', t);
  END LOOP;
END $$;

-- Invoices also need GST payload columns for e-Invoice / e-Way Bill
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS einvoice_payload jsonb,
  ADD COLUMN IF NOT EXISTS eway_payload jsonb,
  ADD COLUMN IF NOT EXISTS einvoice_irn text,
  ADD COLUMN IF NOT EXISTS eway_bill_no text;

-- 3. Document comments (universal, per doc_kind + doc_id)
CREATE TABLE IF NOT EXISTS public.document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_kind public.doc_kind NOT NULL,
  doc_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_document_comments_doc ON public.document_comments(doc_kind, doc_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_comments TO authenticated;
GRANT ALL ON public.document_comments TO service_role;
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members read comments" ON public.document_comments FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "co members write comments" ON public.document_comments FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND author_id = auth.uid());
CREATE POLICY "authors edit own comments" ON public.document_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "authors delete own comments" ON public.document_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- 4. Document event bus — every automatic downstream action reads/writes here
CREATE TABLE IF NOT EXISTS public.document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_kind public.doc_kind NOT NULL,
  doc_id uuid NOT NULL,
  event text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_document_events_doc ON public.document_events(doc_kind, doc_id);
CREATE INDEX IF NOT EXISTS idx_document_events_co_created ON public.document_events(company_id, created_at DESC);
GRANT SELECT ON public.document_events TO authenticated;
GRANT ALL ON public.document_events TO service_role;
ALTER TABLE public.document_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members read events" ON public.document_events FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));

-- 5. Document links (many-to-many traceability e.g. SO->DN->INV)
CREATE TABLE IF NOT EXISTS public.document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_kind public.doc_kind NOT NULL,
  source_id uuid NOT NULL,
  destination_kind public.doc_kind NOT NULL,
  destination_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_kind, source_id, destination_kind, destination_id)
);
CREATE INDEX IF NOT EXISTS idx_document_links_src ON public.document_links(source_kind, source_id);
CREATE INDEX IF NOT EXISTS idx_document_links_dst ON public.document_links(destination_kind, destination_id);
GRANT SELECT ON public.document_links TO authenticated;
GRANT ALL ON public.document_links TO service_role;
ALTER TABLE public.document_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members read links" ON public.document_links FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));

-- 6. Notifications (in-app + queued email; other channels stub)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  channel public.notif_channel NOT NULL DEFAULT 'in_app',
  status public.notif_status NOT NULL DEFAULT 'pending',
  subject text NOT NULL,
  body text,
  doc_kind public.doc_kind,
  doc_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON public.notifications(channel, status) WHERE status='pending';
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (user_id IS NULL AND company_id = public.get_user_company(auth.uid())));
CREATE POLICY "users mark own read" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7. Company settings — approval toggles, credit-check enforcement, etc.
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (company_id, key)
);
GRANT SELECT ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members read settings" ON public.company_settings FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "co admins write settings" ON public.company_settings FOR ALL TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

-- 8. Customer credit tracker (for O2C credit check in Turn 2)
CREATE TABLE IF NOT EXISTS public.customer_credit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  credit_limit numeric(14,2) NOT NULL DEFAULT 0,
  current_outstanding numeric(14,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id)
);
GRANT SELECT ON public.customer_credit TO authenticated;
GRANT ALL ON public.customer_credit TO service_role;
ALTER TABLE public.customer_credit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co members read credit" ON public.customer_credit FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "co admins write credit" ON public.customer_credit FOR ALL TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

-- 9. Helpers
CREATE OR REPLACE FUNCTION public.record_document_event(
  _company_id uuid, _kind public.doc_kind, _id uuid, _event text, _payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.document_events(company_id, doc_kind, doc_id, event, payload, actor_id)
  VALUES (_company_id, _kind, _id, _event, COALESCE(_payload,'{}'::jsonb), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.link_documents(
  _company_id uuid, _src_kind public.doc_kind, _src_id uuid, _dst_kind public.doc_kind, _dst_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.document_links(company_id, source_kind, source_id, destination_kind, destination_id)
  VALUES (_company_id, _src_kind, _src_id, _dst_kind, _dst_id)
  ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.get_company_setting(_company_id uuid, _key text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT value FROM public.company_settings WHERE company_id = _company_id AND key = _key;
$$;

GRANT EXECUTE ON FUNCTION public.record_document_event(uuid, public.doc_kind, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_documents(uuid, public.doc_kind, uuid, public.doc_kind, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_setting(uuid, text) TO authenticated;

-- 10. Universal touch trigger (bump version, set modified_by)
CREATE OR REPLACE FUNCTION public.tg_universal_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  NEW.modified_by := auth.uid();
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'quotations','sales_orders','delivery_notes','invoices','payments','sales_returns',
    'purchase_indents','rfqs','purchase_orders','grns','vendor_invoices','supplier_payments','vendor_returns'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_universal_touch ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_universal_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_universal_touch()', t);
  END LOOP;
END $$;

-- 11. Seed default company_settings for all companies
INSERT INTO public.company_settings (company_id, key, value)
SELECT c.id, s.key, s.value FROM public.companies c
CROSS JOIN (VALUES
  ('approvals.enabled', 'false'::jsonb),
  ('approvals.threshold', '100000'::jsonb),
  ('credit_check.enabled', 'false'::jsonb),
  ('auto_reorder_indent', 'true'::jsonb),
  ('email.enabled', 'true'::jsonb),
  ('einvoice.enabled', 'true'::jsonb),
  ('eway_bill.min_value', '50000'::jsonb)
) AS s(key, value)
ON CONFLICT (company_id, key) DO NOTHING;
