CREATE TYPE public.subscription_status AS ENUM ('active', 'trial', 'cancelled', 'past_due', 'suspended');
CREATE TYPE public.platform_invoice_status AS ENUM ('draft', 'open', 'paid', 'void');

CREATE TABLE public.platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL DEFAULT 'trial',
  status public.subscription_status NOT NULL DEFAULT 'trial',
  billing_email TEXT,
  seats INTEGER NOT NULL DEFAULT 1,
  monthly_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.platform_subscriptions(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.platform_invoice_status NOT NULL DEFAULT 'draft',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  target TEXT NOT NULL DEFAULT 'global',
  target_value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.email_templates (
  key TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.platform_subscriptions TO service_role;
GRANT ALL ON public.platform_invoices TO service_role;
GRANT ALL ON public.platform_settings TO service_role;
GRANT ALL ON public.platform_audit_logs TO service_role;
GRANT ALL ON public.email_templates TO service_role;
GRANT ALL ON public.feature_flags TO service_role;
GRANT SELECT ON public.feature_flags TO authenticated;

ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role manages platform_subscriptions" ON public.platform_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role manages platform_invoices" ON public.platform_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role manages platform_settings" ON public.platform_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role manages email_templates" ON public.email_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role manages platform_audit_logs" ON public.platform_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated users can read feature_flags" ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_role manages feature_flags" ON public.feature_flags FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_platform_audit(
  _actor_id UUID,
  _action TEXT,
  _entity TEXT,
  _entity_id TEXT,
  _metadata JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_audit_logs (actor_id, action, entity, entity_id, metadata)
  VALUES (_actor_id, _action, _entity, _entity_id, COALESCE(_metadata, '{}'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_platform_audit(UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('default_modules', '["sales","procurement","inventory","finance","reports"]', 'Default modules enabled for new companies'),
  ('signup_mode', '"open"', 'Signup mode: open, invite_only, disabled'),
  ('email_from', '"noreply@indguruerp.com"', 'Default sender email address'),
  ('support_email', '"support@indguruerp.com"', 'Support email address'),
  ('maintenance_banner', 'null', 'Global maintenance banner message')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.feature_flags (key, enabled, target, target_value, description) VALUES
  ('new_reports', false, 'global', NULL, 'New reporting engine'),
  ('ai_copilot', false, 'plan', 'enterprise', 'AI copilot assistant'),
  ('maintenance_module', true, 'global', NULL, 'Maintenance module availability'),
  ('multi_currency', false, 'plan', 'pro', 'Multi-currency support')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.platform_subscriptions (company_id, plan, status, billing_email, seats, monthly_price, starts_at, trial_ends_at)
SELECT c.id, c.plan, 'active', c.name || '@billing.local', 5, 299, now(), now() + interval '14 days'
FROM public.companies c
LEFT JOIN public.platform_subscriptions s ON s.company_id = c.id
WHERE s.id IS NULL;

INSERT INTO public.platform_invoices (company_id, subscription_id, invoice_number, amount, tax, status, due_date)
SELECT s.company_id, s.id, 'INV-' || to_char(now(), 'YYYYMM') || '-' || substr(s.company_id::text, 1, 8), 299, 18, 'open', now() + interval '7 days'
FROM public.platform_subscriptions s
LEFT JOIN public.platform_invoices i ON i.subscription_id = s.id
WHERE i.id IS NULL;

INSERT INTO public.email_templates (key, subject, body_html, body_text, description) VALUES
  ('welcome_tenant', 'Welcome to Ind Guru ERP', '<p>Welcome to Ind Guru ERP.</p>', 'Welcome to Ind Guru ERP.', 'Welcome email sent to new tenant admins'),
  ('password_reset', 'Password reset request', '<p>Your password has been reset.</p>', 'Your password has been reset.', 'Password reset notification')
ON CONFLICT (key) DO NOTHING;