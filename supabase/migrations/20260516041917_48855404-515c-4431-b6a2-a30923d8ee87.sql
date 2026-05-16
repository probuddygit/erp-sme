
-- ============== MODULE 4: ALERTS ==============
DO $$ BEGIN
  CREATE TYPE public.alert_severity AS ENUM ('info','warning','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_category AS ENUM (
    'maintenance_due','runtime_threshold','breakdown','excess_downtime','delayed_maintenance','low_stock','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_status AS ENUM ('active','acknowledged','resolved','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  severity public.alert_severity NOT NULL DEFAULT 'info',
  category public.alert_category NOT NULL DEFAULT 'other',
  status public.alert_status NOT NULL DEFAULT 'active',
  title text NOT NULL,
  message text,
  machine_id uuid REFERENCES public.machines(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES public.maintenance_tickets(id) ON DELETE SET NULL,
  item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
  channels_sent jsonb NOT NULL DEFAULT '[]'::jsonb,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_company_status ON public.alerts(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_machine ON public.alerts(machine_id);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_read" ON public.alerts;
CREATE POLICY "alerts_read" ON public.alerts FOR SELECT TO authenticated
USING (company_id = get_user_company(auth.uid()) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "alerts_write" ON public.alerts;
CREATE POLICY "alerts_write" ON public.alerts FOR ALL TO authenticated
USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','production']::app_role[]))
WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','production']::app_role[]));

CREATE TRIGGER trg_alerts_touch BEFORE UPDATE ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Notification preferences (per user)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY,
  company_id uuid NOT NULL,
  email_enabled boolean NOT NULL DEFAULT true,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  whatsapp_number text,
  min_severity public.alert_severity NOT NULL DEFAULT 'warning',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "np_self" ON public.notification_preferences;
CREATE POLICY "np_self" ON public.notification_preferences FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_np_touch BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== ALERT TRIGGERS ==============

-- Machine status -> breakdown
CREATE OR REPLACE FUNCTION public.tg_machine_status_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
BEGIN
  IF NEW.status='breakdown' AND (OLD.status IS NULL OR OLD.status<>'breakdown') THEN
    INSERT INTO public.alerts(company_id, severity, category, title, message, machine_id)
    VALUES(NEW.company_id, 'critical','breakdown',
      'Machine breakdown: '||NEW.name,
      'Machine '||NEW.machine_code||' has been marked as breakdown.', NEW.id);
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_machine_status_alert ON public.machines;
CREATE TRIGGER trg_machine_status_alert AFTER UPDATE OF status ON public.machines
FOR EACH ROW EXECUTE FUNCTION public.tg_machine_status_alert();

-- Runtime threshold alert (in addition to auto-ticket)
CREATE OR REPLACE FUNCTION public.tg_machine_runtime_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
BEGIN
  IF NEW.runtime_threshold_hours IS NOT NULL
     AND NEW.runtime_hours >= NEW.runtime_threshold_hours
     AND (OLD.runtime_hours IS NULL OR OLD.runtime_hours < NEW.runtime_threshold_hours)
  THEN
    INSERT INTO public.alerts(company_id, severity, category, title, message, machine_id)
    VALUES(NEW.company_id, 'warning','runtime_threshold',
      'Runtime threshold exceeded: '||NEW.name,
      'Runtime '||round(NEW.runtime_hours,1)||'h reached threshold '||NEW.runtime_threshold_hours||'h.', NEW.id);
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_machine_runtime_alert ON public.machines;
CREATE TRIGGER trg_machine_runtime_alert AFTER UPDATE OF runtime_hours ON public.machines
FOR EACH ROW EXECUTE FUNCTION public.tg_machine_runtime_alert();

-- Ticket delay alert (when status moves to delayed)
CREATE OR REPLACE FUNCTION public.tg_ticket_delayed_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_machine record;
BEGIN
  IF NEW.status='delayed' AND (OLD.status IS NULL OR OLD.status<>'delayed') THEN
    SELECT name, machine_code INTO v_machine FROM public.machines WHERE id=NEW.machine_id;
    INSERT INTO public.alerts(company_id, severity, category, title, message, machine_id, ticket_id)
    VALUES(NEW.company_id, 'warning','delayed_maintenance',
      'Maintenance delayed: '||NEW.ticket_number,
      'Ticket for machine '||COALESCE(v_machine.name,'?')||' is now delayed.', NEW.machine_id, NEW.id);
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_ticket_delayed_alert ON public.maintenance_tickets;
CREATE TRIGGER trg_ticket_delayed_alert AFTER UPDATE OF status ON public.maintenance_tickets
FOR EACH ROW EXECUTE FUNCTION public.tg_ticket_delayed_alert();

-- Excess downtime alert: when downtime log closes with > 4h
CREATE OR REPLACE FUNCTION public.tg_excess_downtime_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE v_machine record;
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.downtime_hours > 4
     AND (OLD.ended_at IS NULL) THEN
    SELECT name, machine_code INTO v_machine FROM public.machines WHERE id=NEW.machine_id;
    INSERT INTO public.alerts(company_id, severity, category, title, message, machine_id, ticket_id)
    VALUES(NEW.company_id,
      CASE WHEN NEW.downtime_hours > 12 THEN 'critical'::alert_severity ELSE 'warning'::alert_severity END,
      'excess_downtime',
      'Excess downtime: '||COALESCE(v_machine.name,'machine'),
      'Downtime of '||round(NEW.downtime_hours,1)||'h logged ('||NEW.reason::text||').',
      NEW.machine_id, NEW.ticket_id);
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_excess_downtime_alert ON public.machine_downtime_logs;
CREATE TRIGGER trg_excess_downtime_alert AFTER UPDATE OF ended_at ON public.machine_downtime_logs
FOR EACH ROW EXECUTE FUNCTION public.tg_excess_downtime_alert();

-- ============== MODULE 5: SPARE PARTS ==============

-- Link items as spare parts compatible with machines
CREATE TABLE IF NOT EXISTS public.machine_spare_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  reorder_level numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, machine_id)
);

CREATE INDEX IF NOT EXISTS idx_msp_company ON public.machine_spare_parts(company_id);
CREATE INDEX IF NOT EXISTS idx_msp_item ON public.machine_spare_parts(item_id);
CREATE INDEX IF NOT EXISTS idx_msp_machine ON public.machine_spare_parts(machine_id);

ALTER TABLE public.machine_spare_parts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msp_read" ON public.machine_spare_parts;
CREATE POLICY "msp_read" ON public.machine_spare_parts FOR SELECT TO authenticated
USING (company_id = get_user_company(auth.uid()) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "msp_write" ON public.machine_spare_parts;
CREATE POLICY "msp_write" ON public.machine_spare_parts FOR ALL TO authenticated
USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','procurement']::app_role[]))
WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','procurement']::app_role[]));

-- Spare usage log
CREATE TABLE IF NOT EXISTS public.maintenance_spare_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  ticket_id uuid REFERENCES public.maintenance_tickets(id) ON DELETE SET NULL,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  warehouse_id uuid,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_cost numeric NOT NULL DEFAULT 0,
  used_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msu_company_date ON public.maintenance_spare_usage(company_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_msu_item ON public.maintenance_spare_usage(item_id);
CREATE INDEX IF NOT EXISTS idx_msu_machine ON public.maintenance_spare_usage(machine_id);

ALTER TABLE public.maintenance_spare_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msu_read" ON public.maintenance_spare_usage;
CREATE POLICY "msu_read" ON public.maintenance_spare_usage FOR SELECT TO authenticated
USING (company_id = get_user_company(auth.uid()) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "msu_write" ON public.maintenance_spare_usage;
CREATE POLICY "msu_write" ON public.maintenance_spare_usage FOR ALL TO authenticated
USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','production']::app_role[]))
WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','production']::app_role[]));

-- Trigger: when spare usage inserted, issue stock and update machine last-used; alert if low stock
CREATE OR REPLACE FUNCTION public.tg_spare_usage_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE
  v_wh uuid;
  v_on_hand numeric := 0;
  v_min numeric := 0;
  v_item record;
BEGIN
  -- Resolve warehouse: prefer specified, else any warehouse with stock for this item
  v_wh := NEW.warehouse_id;
  IF v_wh IS NULL THEN
    SELECT warehouse_id INTO v_wh FROM public.stock_batches
      WHERE company_id=NEW.company_id AND item_id=NEW.item_id AND qty_remaining > 0
      ORDER BY received_at ASC LIMIT 1;
  END IF;

  IF v_wh IS NOT NULL THEN
    PERFORM public.post_stock_issue(NEW.company_id, NEW.item_id, v_wh, NEW.quantity,
      'maintenance_ticket', NEW.ticket_id, 'Spare used in maintenance', 'issue'::stock_txn_type);
    NEW.warehouse_id := v_wh;
  END IF;

  -- Check low stock: aggregate item on-hand, compare to min_stock or spare reorder_level
  SELECT name, sku, min_stock INTO v_item FROM public.items WHERE id=NEW.item_id;
  SELECT COALESCE(SUM(on_hand),0) INTO v_on_hand
    FROM public.item_stock_levels(NEW.company_id) WHERE item_id=NEW.item_id;
  v_min := COALESCE(
    (SELECT MAX(COALESCE(reorder_level, v_item.min_stock)) FROM public.machine_spare_parts WHERE item_id=NEW.item_id AND company_id=NEW.company_id),
    v_item.min_stock
  );

  IF v_min IS NOT NULL AND v_min > 0 AND v_on_hand < v_min THEN
    -- Avoid spamming: only create if no active low_stock alert for this item
    IF NOT EXISTS (SELECT 1 FROM public.alerts
      WHERE company_id=NEW.company_id AND category='low_stock' AND item_id=NEW.item_id AND status='active') THEN
      INSERT INTO public.alerts(company_id, severity, category, title, message, item_id, machine_id)
      VALUES(NEW.company_id, 'warning','low_stock',
        'Low spare stock: '||COALESCE(v_item.name,'item'),
        'On hand '||round(v_on_hand,2)||' below reorder level '||round(v_min,2)||'. Consider raising a purchase indent.',
        NEW.item_id, NEW.machine_id);
    END IF;
  END IF;

  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_spare_usage_insert ON public.maintenance_spare_usage;
CREATE TRIGGER trg_spare_usage_insert BEFORE INSERT ON public.maintenance_spare_usage
FOR EACH ROW EXECUTE FUNCTION public.tg_spare_usage_insert();
