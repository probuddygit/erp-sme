
-- Enums
CREATE TYPE public.maintenance_type AS ENUM ('preventive','breakdown','corrective','inspection');
CREATE TYPE public.maintenance_priority AS ENUM ('low','medium','high','critical');
CREATE TYPE public.maintenance_status AS ENUM ('open','in_progress','completed','delayed');
CREATE TYPE public.downtime_reason AS ENUM (
  'mechanical_failure','electrical_failure','power_failure',
  'material_shortage','operator_error','scheduled_maintenance','qc_hold','other'
);

-- Maintenance tickets
CREATE TABLE public.maintenance_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  ticket_number text NOT NULL,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  maintenance_type public.maintenance_type NOT NULL DEFAULT 'preventive',
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  assigned_to uuid,           -- employee id (nullable)
  priority public.maintenance_priority NOT NULL DEFAULT 'medium',
  status public.maintenance_status NOT NULL DEFAULT 'open',
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,        -- [{label, done}]
  spare_parts jsonb NOT NULL DEFAULT '[]'::jsonb,      -- [{name, item_id?, quantity, unit_cost?}]
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,      -- [{name, url}]
  labour_hours numeric NOT NULL DEFAULT 0,
  downtime_hours numeric NOT NULL DEFAULT 0,
  notes text,
  plan_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, ticket_number)
);
CREATE INDEX idx_mt_company_status ON public.maintenance_tickets(company_id, status);
CREATE INDEX idx_mt_machine ON public.maintenance_tickets(machine_id);
CREATE INDEX idx_mt_scheduled ON public.maintenance_tickets(company_id, scheduled_date);

-- Maintenance plans
CREATE TABLE public.maintenance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  name text NOT NULL,
  maintenance_type public.maintenance_type NOT NULL DEFAULT 'preventive',
  frequency_days integer NOT NULL DEFAULT 30 CHECK (frequency_days > 0),
  default_priority public.maintenance_priority NOT NULL DEFAULT 'medium',
  default_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_due_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mp_company ON public.maintenance_plans(company_id);
CREATE INDEX idx_mp_due ON public.maintenance_plans(company_id, next_due_date) WHERE is_active;

ALTER TABLE public.maintenance_tickets
  ADD CONSTRAINT mt_plan_fk FOREIGN KEY (plan_id) REFERENCES public.maintenance_plans(id) ON DELETE SET NULL;

-- Runtime / downtime logs
CREATE TABLE public.machine_runtime_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  runtime_hours numeric NOT NULL DEFAULT 0,
  operator text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mrl_machine ON public.machine_runtime_logs(machine_id, started_at DESC);

CREATE TABLE public.machine_downtime_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  downtime_hours numeric NOT NULL DEFAULT 0,
  reason public.downtime_reason NOT NULL DEFAULT 'other',
  notes text,
  ticket_id uuid REFERENCES public.maintenance_tickets(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mdl_machine ON public.machine_downtime_logs(machine_id, started_at DESC);

-- updated_at triggers
CREATE TRIGGER trg_mt_touch BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_mp_touch BEFORE UPDATE ON public.maintenance_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_mrl_touch BEFORE UPDATE ON public.machine_runtime_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_mdl_touch BEFORE UPDATE ON public.machine_downtime_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Ticket numbering
CREATE OR REPLACE FUNCTION public.next_maintenance_ticket_number(_company_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_count int; v_year text;
BEGIN
  v_year := to_char(now(),'YY');
  SELECT COUNT(*)+1 INTO v_count FROM public.maintenance_tickets WHERE company_id=_company_id;
  RETURN 'MT-'||v_year||'-'||LPAD(v_count::text,5,'0');
END $$;

CREATE OR REPLACE FUNCTION public.tg_set_ticket_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.next_maintenance_ticket_number(NEW.company_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_mt_number BEFORE INSERT ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_ticket_number();

-- Auto-create preventive ticket when runtime crosses threshold
CREATE OR REPLACE FUNCTION public.tg_machine_runtime_threshold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.runtime_threshold_hours IS NOT NULL
     AND NEW.runtime_hours >= NEW.runtime_threshold_hours
     AND (OLD.runtime_hours IS NULL OR OLD.runtime_hours < NEW.runtime_threshold_hours)
     AND NOT EXISTS (
       SELECT 1 FROM public.maintenance_tickets
       WHERE machine_id = NEW.id
         AND maintenance_type='preventive'
         AND status IN ('open','in_progress','delayed')
     )
  THEN
    INSERT INTO public.maintenance_tickets(company_id, machine_id, maintenance_type, scheduled_date, priority, notes)
    VALUES (NEW.company_id, NEW.id, 'preventive', CURRENT_DATE, 'high',
            'Auto-created: runtime '||NEW.runtime_hours||'h reached threshold '||NEW.runtime_threshold_hours||'h');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_machine_runtime_threshold AFTER UPDATE OF runtime_hours, runtime_threshold_hours
  ON public.machines FOR EACH ROW EXECUTE FUNCTION public.tg_machine_runtime_threshold();

-- On ticket completion: update machine maintenance dates + advance plan
CREATE OR REPLACE FUNCTION public.tg_ticket_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_freq integer; v_plan_freq integer;
BEGIN
  IF NEW.status='completed' AND (OLD.status IS NULL OR OLD.status<>'completed') THEN
    IF NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
    SELECT maintenance_frequency_days INTO v_freq FROM public.machines WHERE id=NEW.machine_id;
    UPDATE public.machines
       SET last_maintenance_date = CURRENT_DATE,
           next_maintenance_date = CASE WHEN v_freq IS NOT NULL THEN CURRENT_DATE + v_freq ELSE next_maintenance_date END,
           status = CASE WHEN status IN ('under_maintenance','breakdown') THEN 'idle' ELSE status END
     WHERE id = NEW.machine_id;
    IF NEW.plan_id IS NOT NULL THEN
      SELECT frequency_days INTO v_plan_freq FROM public.maintenance_plans WHERE id=NEW.plan_id;
      UPDATE public.maintenance_plans
         SET next_due_date = CURRENT_DATE + COALESCE(v_plan_freq,30)
       WHERE id=NEW.plan_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ticket_completed BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION public.tg_ticket_completed();

-- Closing a runtime log adds to machine runtime_hours
CREATE OR REPLACE FUNCTION public.tg_runtime_log_close()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_delta numeric;
BEGIN
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR OLD.ended_at <> NEW.ended_at) THEN
    NEW.runtime_hours := GREATEST(0, EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))/3600.0);
    v_delta := NEW.runtime_hours - COALESCE(OLD.runtime_hours,0);
    IF v_delta <> 0 THEN
      UPDATE public.machines SET runtime_hours = COALESCE(runtime_hours,0) + v_delta WHERE id = NEW.machine_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_runtime_log_close BEFORE UPDATE ON public.machine_runtime_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_runtime_log_close();

CREATE OR REPLACE FUNCTION public.tg_downtime_log_compute()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL THEN
    NEW.downtime_hours := GREATEST(0, EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))/3600.0);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_downtime_log_compute BEFORE INSERT OR UPDATE ON public.machine_downtime_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_downtime_log_compute();

-- RLS
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_runtime_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_downtime_logs ENABLE ROW LEVEL SECURITY;

-- Read: any user belonging to that company
CREATE POLICY mt_read ON public.maintenance_tickets FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY mp_read ON public.maintenance_plans FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY mrl_read ON public.machine_runtime_logs FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY mdl_read ON public.machine_downtime_logs FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));

-- Write: admin / maintenance / production roles within company (or super admin)
CREATE POLICY mt_write ON public.maintenance_tickets FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    public.has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','production']::app_role[])
  ) WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    public.has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','production']::app_role[])
  );
CREATE POLICY mp_write ON public.maintenance_plans FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    public.has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','production']::app_role[])
  ) WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    public.has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','production']::app_role[])
  );
CREATE POLICY mrl_write ON public.machine_runtime_logs FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    public.has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','production']::app_role[])
  ) WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    public.has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','production']::app_role[])
  );
CREATE POLICY mdl_write ON public.machine_downtime_logs FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    public.has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','production']::app_role[])
  ) WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    public.has_company_role(auth.uid(), company_id, ARRAY['admin','maintenance','production']::app_role[])
  );
