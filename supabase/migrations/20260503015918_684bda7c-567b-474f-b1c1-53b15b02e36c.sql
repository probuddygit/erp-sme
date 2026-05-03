
-- Enums
CREATE TYPE public.item_type AS ENUM ('raw_material','wip','finished_good','consumable','service');
CREATE TYPE public.stock_txn_type AS ENUM ('receipt','issue','transfer_in','transfer_out','adjustment','production_in','production_out','opening');
CREATE TYPE public.valuation_method AS ENUM ('fifo','weighted_average');

-- Warehouses
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_warehouses_touch BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "members view wh" ON public.warehouses FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "inv insert wh" ON public.warehouses FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'procurement'::app_role,'production'::app_role]));
CREATE POLICY "inv update wh" ON public.warehouses FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'procurement'::app_role,'production'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "inv delete wh" ON public.warehouses FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role]));
CREATE POLICY "super admin wh" ON public.warehouses FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Items
CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  item_type item_type NOT NULL DEFAULT 'raw_material',
  unit text NOT NULL DEFAULT 'pcs',
  hsn_code text,
  min_stock numeric NOT NULL DEFAULT 0,
  reorder_qty numeric NOT NULL DEFAULT 0,
  standard_cost numeric NOT NULL DEFAULT 0,
  valuation_method valuation_method NOT NULL DEFAULT 'weighted_average',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, sku)
);
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_items_touch BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "members view items" ON public.items FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "inv insert items" ON public.items FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'procurement'::app_role,'production'::app_role]));
CREATE POLICY "inv update items" ON public.items FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'procurement'::app_role,'production'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "inv delete items" ON public.items FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role]));
CREATE POLICY "super admin items" ON public.items FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Stock batches (lots)
CREATE TABLE public.stock_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  item_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  batch_no text NOT NULL,
  qty_received numeric NOT NULL DEFAULT 0,
  qty_remaining numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  landed_cost_per_unit numeric NOT NULL DEFAULT 0,
  expiry_date date,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_batches_item ON public.stock_batches(company_id, item_id, warehouse_id, received_at);

CREATE POLICY "members view batches" ON public.stock_batches FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "inv manage batches" ON public.stock_batches FOR ALL TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'procurement'::app_role,'production'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'procurement'::app_role,'production'::app_role]));
CREATE POLICY "super admin batches" ON public.stock_batches FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Stock transactions (ledger)
CREATE TABLE public.stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  item_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  txn_type stock_txn_type NOT NULL,
  quantity numeric NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  freight numeric NOT NULL DEFAULT 0,
  duty numeric NOT NULL DEFAULT 0,
  other_landed numeric NOT NULL DEFAULT 0,
  batch_id uuid,
  reference_type text,
  reference_id uuid,
  notes text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_txn_item ON public.stock_transactions(company_id, item_id, occurred_at DESC);

CREATE POLICY "members view txn" ON public.stock_transactions FOR SELECT TO authenticated USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "inv insert txn" ON public.stock_transactions FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role,'procurement'::app_role,'production'::app_role]));
CREATE POLICY "inv update txn" ON public.stock_transactions FOR UPDATE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role])) WITH CHECK (company_id = get_user_company(auth.uid()));
CREATE POLICY "inv delete txn" ON public.stock_transactions FOR DELETE TO authenticated USING (company_id = get_user_company(auth.uid()) AND has_company_role(auth.uid(), company_id, ARRAY['admin'::app_role]));
CREATE POLICY "super admin txn" ON public.stock_transactions FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Function: current stock per item per warehouse (sum of batch qty_remaining)
CREATE OR REPLACE FUNCTION public.item_stock_levels(_company_id uuid)
RETURNS TABLE(item_id uuid, warehouse_id uuid, on_hand numeric, value numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.item_id, b.warehouse_id,
         COALESCE(SUM(b.qty_remaining),0)::numeric AS on_hand,
         COALESCE(SUM(b.qty_remaining * (b.unit_cost + b.landed_cost_per_unit)),0)::numeric AS value
  FROM public.stock_batches b
  WHERE b.company_id = _company_id
  GROUP BY b.item_id, b.warehouse_id;
$$;

-- Function: post a stock receipt (inward) - creates batch + txn
CREATE OR REPLACE FUNCTION public.post_stock_receipt(
  _company_id uuid, _item_id uuid, _warehouse_id uuid,
  _quantity numeric, _unit_cost numeric, _batch_no text,
  _freight numeric DEFAULT 0, _duty numeric DEFAULT 0, _other numeric DEFAULT 0,
  _expiry date DEFAULT NULL, _ref_type text DEFAULT NULL, _ref_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_landed numeric;
  v_batch_id uuid;
BEGIN
  v_landed := CASE WHEN _quantity > 0 THEN (_freight + _duty + _other)/_quantity ELSE 0 END;
  INSERT INTO public.stock_batches(company_id,item_id,warehouse_id,batch_no,qty_received,qty_remaining,unit_cost,landed_cost_per_unit,expiry_date)
  VALUES(_company_id,_item_id,_warehouse_id,_batch_no,_quantity,_quantity,_unit_cost,v_landed,_expiry)
  RETURNING id INTO v_batch_id;

  INSERT INTO public.stock_transactions(company_id,item_id,warehouse_id,txn_type,quantity,unit_cost,total_value,freight,duty,other_landed,batch_id,reference_type,reference_id,notes,created_by)
  VALUES(_company_id,_item_id,_warehouse_id,'receipt',_quantity,_unit_cost,_quantity*(_unit_cost+v_landed),_freight,_duty,_other,v_batch_id,_ref_type,_ref_id,_notes,auth.uid());

  RETURN v_batch_id;
END; $$;

-- Function: issue stock using FIFO across batches
CREATE OR REPLACE FUNCTION public.post_stock_issue(
  _company_id uuid, _item_id uuid, _warehouse_id uuid,
  _quantity numeric, _ref_type text DEFAULT NULL, _ref_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL, _txn_type stock_txn_type DEFAULT 'issue'
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_remaining numeric := _quantity;
  v_total_cost numeric := 0;
  r RECORD;
  v_take numeric;
BEGIN
  IF _quantity <= 0 THEN RETURN 0; END IF;
  FOR r IN
    SELECT id, qty_remaining, unit_cost, landed_cost_per_unit
    FROM public.stock_batches
    WHERE company_id=_company_id AND item_id=_item_id AND warehouse_id=_warehouse_id AND qty_remaining > 0
    ORDER BY received_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(v_remaining, r.qty_remaining);
    UPDATE public.stock_batches SET qty_remaining = qty_remaining - v_take WHERE id = r.id;
    v_total_cost := v_total_cost + v_take * (r.unit_cost + r.landed_cost_per_unit);
    INSERT INTO public.stock_transactions(company_id,item_id,warehouse_id,txn_type,quantity,unit_cost,total_value,batch_id,reference_type,reference_id,notes,created_by)
    VALUES(_company_id,_item_id,_warehouse_id,_txn_type,-v_take,(r.unit_cost + r.landed_cost_per_unit),-v_take*(r.unit_cost+r.landed_cost_per_unit),r.id,_ref_type,_ref_id,_notes,auth.uid());
    v_remaining := v_remaining - v_take;
  END LOOP;
  -- If insufficient stock, still record a pending negative txn for visibility
  IF v_remaining > 0 THEN
    INSERT INTO public.stock_transactions(company_id,item_id,warehouse_id,txn_type,quantity,unit_cost,total_value,reference_type,reference_id,notes,created_by)
    VALUES(_company_id,_item_id,_warehouse_id,_txn_type,-v_remaining,0,0,_ref_type,_ref_id,COALESCE(_notes,'')||' (insufficient stock)',auth.uid());
  END IF;
  RETURN v_total_cost;
END; $$;

-- Trigger: when material_consumption is inserted with item_id, post FIFO issue
ALTER TABLE public.material_consumption
  ADD COLUMN item_id uuid,
  ADD COLUMN warehouse_id uuid;

CREATE OR REPLACE FUNCTION public.tg_material_consumption_to_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.item_id IS NOT NULL AND NEW.warehouse_id IS NOT NULL AND NEW.quantity > 0 THEN
    PERFORM public.post_stock_issue(NEW.company_id, NEW.item_id, NEW.warehouse_id, NEW.quantity,
      'work_order', NEW.work_order_id, 'Production consumption', 'production_out');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER tg_mc_to_stock AFTER INSERT ON public.material_consumption
  FOR EACH ROW EXECUTE FUNCTION public.tg_material_consumption_to_stock();

-- Trigger: when production_output recorded with item_id, create receipt batch
ALTER TABLE public.production_output
  ADD COLUMN item_id uuid,
  ADD COLUMN warehouse_id uuid,
  ADD COLUMN unit_cost numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.tg_production_output_to_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.item_id IS NOT NULL AND NEW.warehouse_id IS NOT NULL AND NEW.quantity > 0 AND NOT NEW.is_scrap THEN
    PERFORM public.post_stock_receipt(NEW.company_id, NEW.item_id, NEW.warehouse_id, NEW.quantity,
      NEW.unit_cost, COALESCE('WO-'||NEW.work_order_id::text, 'PROD'),
      0,0,0,NULL,'work_order',NEW.work_order_id,'Production output');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER tg_po_to_stock AFTER INSERT ON public.production_output
  FOR EACH ROW EXECUTE FUNCTION public.tg_production_output_to_stock();
