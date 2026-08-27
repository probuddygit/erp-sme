CREATE TABLE public.stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  so_item_id uuid REFERENCES public.sales_order_items(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  qty numeric(14,3) NOT NULL DEFAULT 0,
  qty_consumed numeric(14,3) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_reservations TO authenticated;
GRANT ALL ON public.stock_reservations TO service_role;
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservations_read" ON public.stock_reservations FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.get_user_company(auth.uid()));
CREATE POLICY "reservations_write" ON public.stock_reservations FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','sales','production']::app_role[]))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','sales','production']::app_role[]));

CREATE TABLE public.pick_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pick_no text NOT NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  workflow_status text NOT NULL DEFAULT 'none',
  approval_status text NOT NULL DEFAULT 'not_required',
  notes text,
  picked_by uuid,
  picked_at timestamptz,
  source_doc_kind doc_kind,
  source_doc_id uuid,
  version integer NOT NULL DEFAULT 1,
  created_by uuid,
  modified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pick_lists TO authenticated;
GRANT ALL ON public.pick_lists TO service_role;
ALTER TABLE public.pick_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pick_lists_read" ON public.pick_lists FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.get_user_company(auth.uid()));
CREATE POLICY "pick_lists_write" ON public.pick_lists FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','sales','production']::app_role[]))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','sales','production']::app_role[]));

CREATE TABLE public.pick_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pick_list_id uuid NOT NULL REFERENCES public.pick_lists(id) ON DELETE CASCADE,
  so_item_id uuid REFERENCES public.sales_order_items(id) ON DELETE SET NULL,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  bin_id uuid REFERENCES public.inventory_bins(id) ON DELETE SET NULL,
  qty_requested numeric(14,3) NOT NULL DEFAULT 0,
  qty_picked numeric(14,3) NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pick_list_items TO authenticated;
GRANT ALL ON public.pick_list_items TO service_role;
ALTER TABLE public.pick_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pick_list_items_read" ON public.pick_list_items FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.get_user_company(auth.uid()));
CREATE POLICY "pick_list_items_write" ON public.pick_list_items FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','sales','production']::app_role[]))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','sales','production']::app_role[]));

CREATE TABLE public.packing_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pack_no text NOT NULL,
  pick_list_id uuid REFERENCES public.pick_lists(id) ON DELETE SET NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  packages integer NOT NULL DEFAULT 1,
  gross_weight numeric(12,3),
  status text NOT NULL DEFAULT 'draft',
  notes text,
  packed_by uuid,
  packed_at timestamptz,
  created_by uuid,
  modified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packing_slips TO authenticated;
GRANT ALL ON public.packing_slips TO service_role;
ALTER TABLE public.packing_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packing_slips_read" ON public.packing_slips FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.get_user_company(auth.uid()));
CREATE POLICY "packing_slips_write" ON public.packing_slips FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','sales','production']::app_role[]))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','sales','production']::app_role[]));

CREATE TABLE public.dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  dispatch_no text NOT NULL,
  packing_slip_id uuid REFERENCES public.packing_slips(id) ON DELETE SET NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  delivery_note_id uuid REFERENCES public.delivery_notes(id) ON DELETE SET NULL,
  vehicle_no text,
  transporter_name text,
  driver_name text,
  driver_phone text,
  dispatched_at timestamptz,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_by uuid,
  modified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatches TO authenticated;
GRANT ALL ON public.dispatches TO service_role;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dispatches_read" ON public.dispatches FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.get_user_company(auth.uid()));
CREATE POLICY "dispatches_write" ON public.dispatches FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','sales','production']::app_role[]))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','sales','production']::app_role[]));

CREATE INDEX idx_reservations_so ON public.stock_reservations(sales_order_id);
CREATE INDEX idx_reservations_item ON public.stock_reservations(company_id, item_id, warehouse_id, status);
CREATE INDEX idx_pick_items_list ON public.pick_list_items(pick_list_id);

CREATE TRIGGER trg_reservations_touch BEFORE UPDATE ON public.stock_reservations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_pick_lists_touch BEFORE UPDATE ON public.pick_lists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_pick_items_touch BEFORE UPDATE ON public.pick_list_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_packing_touch BEFORE UPDATE ON public.packing_slips FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_dispatch_touch BEFORE UPDATE ON public.dispatches FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.item_availability(_company_id uuid)
RETURNS TABLE(item_id uuid, warehouse_id uuid, on_hand numeric, reserved numeric, available numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF _company_id IS DISTINCT FROM public.get_user_company(auth.uid())
     AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  WITH oh AS (
    SELECT b.item_id AS i, b.warehouse_id AS w, COALESCE(SUM(b.qty_remaining),0) AS on_hand
    FROM public.stock_batches b WHERE b.company_id=_company_id GROUP BY 1,2
  ), rs AS (
    SELECT r.item_id AS i, r.warehouse_id AS w, COALESCE(SUM(r.qty - r.qty_consumed),0) AS reserved
    FROM public.stock_reservations r
    WHERE r.company_id=_company_id AND r.status='active' GROUP BY 1,2
  )
  SELECT COALESCE(oh.i, rs.i), COALESCE(oh.w, rs.w),
         COALESCE(oh.on_hand,0)::numeric, COALESCE(rs.reserved,0)::numeric,
         (COALESCE(oh.on_hand,0) - COALESCE(rs.reserved,0))::numeric
  FROM oh FULL OUTER JOIN rs ON rs.i=oh.i AND rs.w=oh.w;
END $$;
GRANT EXECUTE ON FUNCTION public.item_availability(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.default_warehouse(_company_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT id FROM public.warehouses WHERE company_id=_company_id AND COALESCE(is_active,true) ORDER BY code LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.reserve_stock_for_order(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_so RECORD; r RECORD; v_wh uuid; v_onhand numeric; v_reserved numeric; v_avail numeric;
        v_lines int := 0; v_short jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_so FROM public.sales_orders WHERE id=_order_id;
  IF v_so.id IS NULL THEN RAISE EXCEPTION 'sales order not found'; END IF;
  IF v_so.company_id IS DISTINCT FROM public.get_user_company(auth.uid())
     AND NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  v_wh := COALESCE(v_so.warehouse_id, public.default_warehouse(v_so.company_id));
  IF v_wh IS NULL THEN RAISE EXCEPTION 'no warehouse configured'; END IF;

  FOR r IN SELECT * FROM public.sales_order_items WHERE sales_order_id=_order_id AND item_id IS NOT NULL LOOP
    IF EXISTS (SELECT 1 FROM public.stock_reservations WHERE so_item_id=r.id AND status='active') THEN CONTINUE; END IF;
    SELECT COALESCE(SUM(qty_remaining),0) INTO v_onhand FROM public.stock_batches
      WHERE company_id=v_so.company_id AND item_id=r.item_id AND warehouse_id=v_wh;
    SELECT COALESCE(SUM(qty-qty_consumed),0) INTO v_reserved FROM public.stock_reservations
      WHERE company_id=v_so.company_id AND item_id=r.item_id AND warehouse_id=v_wh AND status='active';
    v_avail := v_onhand - v_reserved;
    INSERT INTO public.stock_reservations(company_id, sales_order_id, so_item_id, item_id, warehouse_id, qty, created_by, notes)
    VALUES(v_so.company_id, _order_id, r.id, r.item_id, v_wh, LEAST(r.quantity, GREATEST(v_avail,0)), auth.uid(),
           'Reserved for ' || v_so.order_number);
    v_lines := v_lines + 1;
    IF v_avail < r.quantity THEN
      v_short := v_short || jsonb_build_object('item', r.product_name, 'required', r.quantity, 'available', GREATEST(v_avail,0));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('reserved_lines', v_lines, 'shortages', v_short, 'warehouse_id', v_wh);
END $$;
GRANT EXECUTE ON FUNCTION public.reserve_stock_for_order(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_pick_list(_order_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_so RECORD; v_wh uuid; v_pl uuid; v_no text; r RECORD; v_pos int := 0; v_count int;
BEGIN
  SELECT * INTO v_so FROM public.sales_orders WHERE id=_order_id;
  IF v_so.id IS NULL THEN RAISE EXCEPTION 'sales order not found'; END IF;
  IF v_so.company_id IS DISTINCT FROM public.get_user_company(auth.uid())
     AND NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT id INTO v_pl FROM public.pick_lists WHERE sales_order_id=_order_id AND status <> 'cancelled' LIMIT 1;
  IF v_pl IS NOT NULL THEN RETURN v_pl; END IF;

  v_wh := COALESCE(v_so.warehouse_id, public.default_warehouse(v_so.company_id));
  SELECT COUNT(*)+1 INTO v_count FROM public.pick_lists WHERE company_id=v_so.company_id;
  v_no := 'PICK-' || to_char(now(),'YY') || '-' || LPAD(v_count::text,5,'0');

  INSERT INTO public.pick_lists(company_id, pick_no, sales_order_id, warehouse_id, created_by, source_doc_kind, source_doc_id)
  VALUES(v_so.company_id, v_no, _order_id, v_wh, auth.uid(), 'sales_order'::doc_kind, _order_id)
  RETURNING id INTO v_pl;

  FOR r IN SELECT * FROM public.sales_order_items WHERE sales_order_id=_order_id AND item_id IS NOT NULL ORDER BY position LOOP
    INSERT INTO public.pick_list_items(company_id, pick_list_id, so_item_id, item_id, warehouse_id, qty_requested, position)
    VALUES(v_so.company_id, v_pl, r.id, r.item_id, v_wh, GREATEST(r.quantity - COALESCE(r.qty_dispatched,0),0), v_pos);
    v_pos := v_pos + 1;
  END LOOP;

  PERFORM public.record_document_event(v_so.company_id, 'sales_order'::doc_kind, _order_id, 'pick_list_generated',
    jsonb_build_object('pick_list_id', v_pl, 'pick_no', v_no));
  RETURN v_pl;
END $$;
GRANT EXECUTE ON FUNCTION public.generate_pick_list(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_sales_order(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_so RECORD; v_check jsonb; v_res jsonb; v_pl uuid;
BEGIN
  SELECT * INTO v_so FROM public.sales_orders WHERE id=_order_id;
  IF v_so.id IS NULL THEN RAISE EXCEPTION 'sales order not found'; END IF;
  IF v_so.company_id IS DISTINCT FROM public.get_user_company(auth.uid())
     AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_check := public.check_customer_credit(v_so.company_id, v_so.customer_id, v_so.grand_total);

  IF NOT (v_check->>'ok')::boolean THEN
    UPDATE public.sales_orders
      SET status='credit_hold'::sales_order_status, credit_hold=true,
          credit_hold_reason='Order '||v_so.grand_total||' exceeds available credit '||(v_check->>'available')
      WHERE id=_order_id;
    PERFORM public.record_document_event(v_so.company_id,'sales_order'::doc_kind,_order_id,'credit_hold',v_check);
    RETURN v_check || jsonb_build_object('confirmed', false);
  END IF;

  UPDATE public.sales_orders
    SET status='approved'::sales_order_status, credit_hold=false, credit_hold_reason=NULL,
        approved_by=auth.uid(), approved_at=now(), workflow_status='approved'
    WHERE id=_order_id;

  v_res := public.reserve_stock_for_order(_order_id);
  v_pl := public.generate_pick_list(_order_id);

  INSERT INTO public.notifications(company_id, user_id, channel, status, subject, body, doc_kind, doc_id, metadata)
  VALUES(v_so.company_id, NULL, 'in_app'::notif_channel, 'pending'::notif_status,
         'Pick list ready for ' || v_so.order_number,
         'Sales order ' || v_so.order_number || ' is confirmed. Stock reserved and a pick list has been generated.',
         'sales_order'::doc_kind, _order_id,
         jsonb_build_object('kind','pick_list','pick_list_id', v_pl, 'shortages', v_res->'shortages'));

  PERFORM public.record_document_event(v_so.company_id,'sales_order'::doc_kind,_order_id,'confirmed',
    jsonb_build_object('credit', v_check, 'reservation', v_res, 'pick_list_id', v_pl));

  RETURN v_check || jsonb_build_object('confirmed', true, 'reservation', v_res, 'pick_list_id', v_pl);
END $$;

CREATE OR REPLACE FUNCTION public.consume_reservation(_company_id uuid, _item_id uuid, _warehouse_id uuid, _so_id uuid, _qty numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r RECORD; v_left numeric := _qty; v_take numeric;
BEGIN
  IF _so_id IS NULL OR _qty <= 0 THEN RETURN; END IF;
  FOR r IN SELECT * FROM public.stock_reservations
            WHERE company_id=_company_id AND sales_order_id=_so_id AND item_id=_item_id
              AND warehouse_id=_warehouse_id AND status='active' ORDER BY created_at LOOP
    EXIT WHEN v_left <= 0;
    v_take := LEAST(v_left, r.qty - r.qty_consumed);
    IF v_take <= 0 THEN CONTINUE; END IF;
    UPDATE public.stock_reservations
       SET qty_consumed = qty_consumed + v_take,
           status = CASE WHEN qty_consumed + v_take >= qty THEN 'consumed' ELSE 'active' END
     WHERE id = r.id;
    v_left := v_left - v_take;
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.consume_reservation(uuid,uuid,uuid,uuid,numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tg_delivery_note_issue_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_wh uuid; r RECORD; v_cost numeric; v_total_cost numeric := 0;
        v_cogs uuid; v_inv uuid;
BEGIN
  IF NEW.status NOT IN ('dispatched','delivered') THEN RETURN NEW; END IF;
  IF COALESCE(NEW.inventory_posting_status::text,'pending') = 'posted' THEN RETURN NEW; END IF;

  SELECT COALESCE(so.warehouse_id, public.default_warehouse(NEW.company_id)) INTO v_wh
    FROM public.sales_orders so WHERE so.id = NEW.sales_order_id;
  IF v_wh IS NULL THEN v_wh := public.default_warehouse(NEW.company_id); END IF;
  IF v_wh IS NULL THEN RETURN NEW; END IF;

  FOR r IN SELECT * FROM public.delivery_note_items WHERE dn_id = NEW.id LOOP
    CONTINUE WHEN r.item_id IS NULL OR COALESCE(r.qty,0) <= 0;
    v_cost := public.post_stock_issue(NEW.company_id, r.item_id, v_wh, r.qty,
                'delivery_note', NEW.id, 'Dispatch ' || NEW.dn_no, 'issue'::stock_txn_type);
    v_total_cost := v_total_cost + COALESCE(v_cost,0);
    PERFORM public.consume_reservation(NEW.company_id, r.item_id, v_wh, NEW.sales_order_id, r.qty);
    IF r.sales_order_item_id IS NOT NULL THEN
      UPDATE public.sales_order_items
         SET qty_dispatched = COALESCE(qty_dispatched,0) + r.qty
       WHERE id = r.sales_order_item_id;
    END IF;
  END LOOP;

  IF v_total_cost > 0 THEN
    v_cogs := public.acct(NEW.company_id,'5000');
    v_inv  := public.acct(NEW.company_id,'1200');
    PERFORM public.post_journal(NEW.company_id, COALESCE(NEW.delivery_date, CURRENT_DATE), 'sales', 'delivery_note', NEW.id,
      'Cost of goods sold ' || NEW.dn_no,
      jsonb_build_array(
        jsonb_build_object('account_id', v_cogs, 'debit', v_total_cost, 'credit', 0, 'description', 'COGS ' || NEW.dn_no),
        jsonb_build_object('account_id', v_inv, 'debit', 0, 'credit', v_total_cost, 'description', 'Inventory issue')
      ));
  END IF;

  UPDATE public.delivery_notes
     SET inventory_posting_status = 'posted'::posting_status,
         financial_posting_status = CASE WHEN v_total_cost > 0 THEN 'posted'::posting_status ELSE financial_posting_status END
   WHERE id = NEW.id;

  UPDATE public.sales_orders so
     SET status = CASE
           WHEN NOT EXISTS (
             SELECT 1 FROM public.sales_order_items i
              WHERE i.sales_order_id = so.id AND COALESCE(i.qty_dispatched,0) < i.quantity
           ) THEN 'dispatched'::sales_order_status
           ELSE 'partially_dispatched'::sales_order_status END
   WHERE so.id = NEW.sales_order_id
     AND so.status NOT IN ('invoiced','closed','cancelled');

  RETURN NEW;
END $$;

CREATE TRIGGER tg_dn_issue_stock
AFTER INSERT OR UPDATE ON public.delivery_notes
FOR EACH ROW EXECUTE FUNCTION public.tg_delivery_note_issue_stock();

CREATE OR REPLACE FUNCTION public.tg_invoice_issue_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_wh uuid; r RECORD; v_item uuid; v_cost numeric; v_total_cost numeric := 0;
        v_cogs uuid; v_inv uuid;
BEGIN
  IF NEW.status NOT IN ('sent','partially_paid','paid','overdue') THEN RETURN NEW; END IF;
  IF COALESCE(NEW.inventory_posting_status::text,'pending') IN ('posted','not_applicable','skipped') THEN RETURN NEW; END IF;
  IF NEW.sales_order_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.delivery_notes d
        WHERE d.sales_order_id = NEW.sales_order_id AND d.status IN ('dispatched','delivered')) THEN
    UPDATE public.invoices SET inventory_posting_status='not_applicable'::posting_status WHERE id=NEW.id;
    RETURN NEW;
  END IF;

  SELECT COALESCE(so.warehouse_id, public.default_warehouse(NEW.company_id)) INTO v_wh
    FROM public.sales_orders so WHERE so.id = NEW.sales_order_id;
  IF v_wh IS NULL THEN v_wh := public.default_warehouse(NEW.company_id); END IF;
  IF v_wh IS NULL THEN RETURN NEW; END IF;

  FOR r IN SELECT ii.*, soi.item_id AS so_item_ref
             FROM public.invoice_items ii
             LEFT JOIN public.sales_order_items soi ON soi.id = ii.sales_order_item_id
            WHERE ii.invoice_id = NEW.id LOOP
    v_item := r.so_item_ref;
    IF v_item IS NULL THEN
      SELECT id INTO v_item FROM public.items
       WHERE company_id = NEW.company_id AND item_type <> 'service'
         AND (name = r.product_name OR sku = r.product_name) LIMIT 1;
    END IF;
    CONTINUE WHEN v_item IS NULL OR COALESCE(r.quantity,0) <= 0;
    v_cost := public.post_stock_issue(NEW.company_id, v_item, v_wh, r.quantity,
                'invoice', NEW.id, 'Invoice issue ' || NEW.invoice_number, 'issue'::stock_txn_type);
    v_total_cost := v_total_cost + COALESCE(v_cost,0);
    PERFORM public.consume_reservation(NEW.company_id, v_item, v_wh, NEW.sales_order_id, r.quantity);
  END LOOP;

  IF v_total_cost > 0 THEN
    v_cogs := public.acct(NEW.company_id,'5000');
    v_inv  := public.acct(NEW.company_id,'1200');
    PERFORM public.post_journal(NEW.company_id, NEW.invoice_date, 'sales', 'invoice_cogs', NEW.id,
      'Cost of goods sold ' || NEW.invoice_number,
      jsonb_build_array(
        jsonb_build_object('account_id', v_cogs, 'debit', v_total_cost, 'credit', 0, 'description', 'COGS ' || NEW.invoice_number),
        jsonb_build_object('account_id', v_inv, 'debit', 0, 'credit', v_total_cost, 'description', 'Inventory issue')
      ));
  END IF;

  UPDATE public.invoices
     SET inventory_posting_status = CASE WHEN v_total_cost > 0 THEN 'posted'::posting_status ELSE 'skipped'::posting_status END
   WHERE id = NEW.id;

  RETURN NEW;
END $$;

CREATE TRIGGER tg_inv_issue_stock
AFTER INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.tg_invoice_issue_stock();