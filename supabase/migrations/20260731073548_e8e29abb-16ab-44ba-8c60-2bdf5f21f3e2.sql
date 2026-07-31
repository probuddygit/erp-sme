
-- ============ BINS ============
CREATE TABLE public.inventory_bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  code text NOT NULL,
  zone text,
  rack text,
  shelf text,
  capacity numeric NOT NULL DEFAULT 0,
  used numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_bins TO authenticated;
GRANT ALL ON public.inventory_bins TO service_role;
ALTER TABLE public.inventory_bins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bins_company_read" ON public.inventory_bins FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "bins_company_write" ON public.inventory_bins FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- ============ CYCLE COUNTS ============
CREATE TABLE public.cycle_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  count_number text NOT NULL,
  zone text,
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  completed_at timestamptz,
  counted_by uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, count_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycle_counts TO authenticated;
GRANT ALL ON public.cycle_counts TO service_role;
ALTER TABLE public.cycle_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_company_read" ON public.cycle_counts FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "cc_company_write" ON public.cycle_counts FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE TABLE public.cycle_count_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  count_id uuid NOT NULL REFERENCES public.cycle_counts(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  system_qty numeric NOT NULL DEFAULT 0,
  counted_qty numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycle_count_lines TO authenticated;
GRANT ALL ON public.cycle_count_lines TO service_role;
ALTER TABLE public.cycle_count_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ccl_company_read" ON public.cycle_count_lines FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "ccl_company_write" ON public.cycle_count_lines FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- ============ BARCODES ============
CREATE TABLE public.item_barcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  format text NOT NULL DEFAULT 'Code128',
  printed_count integer NOT NULL DEFAULT 0,
  last_printed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, barcode)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_barcodes TO authenticated;
GRANT ALL ON public.item_barcodes TO service_role;
ALTER TABLE public.item_barcodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bc_company_read" ON public.item_barcodes FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "bc_company_write" ON public.item_barcodes FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- ============ SERIALS ============
CREATE TABLE public.item_serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  serial_no text NOT NULL,
  batch_no text,
  status text NOT NULL DEFAULT 'in_stock',
  received_on date DEFAULT CURRENT_DATE,
  warranty_end date,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, serial_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_serials TO authenticated;
GRANT ALL ON public.item_serials TO service_role;
ALTER TABLE public.item_serials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srl_company_read" ON public.item_serials FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "srl_company_write" ON public.item_serials FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- ============ updated_at triggers ============
CREATE TRIGGER trg_bins_touch BEFORE UPDATE ON public.inventory_bins FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_cc_touch BEFORE UPDATE ON public.cycle_counts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ccl_touch BEFORE UPDATE ON public.cycle_count_lines FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_bc_touch BEFORE UPDATE ON public.item_barcodes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_srl_touch BEFORE UPDATE ON public.item_serials FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ AUTOMATION: post cycle count -> stock adjustments ============
CREATE OR REPLACE FUNCTION public.post_cycle_count(_count_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.cycle_counts%ROWTYPE;
  l RECORD;
  v_diff numeric;
  v_posted int := 0;
BEGIN
  SELECT * INTO c FROM public.cycle_counts WHERE id = _count_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cycle count not found'; END IF;
  IF c.company_id <> public.get_user_company(auth.uid()) AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF c.status = 'completed' THEN RAISE EXCEPTION 'Cycle count already posted'; END IF;

  FOR l IN SELECT * FROM public.cycle_count_lines WHERE count_id = _count_id LOOP
    v_diff := COALESCE(l.counted_qty,0) - COALESCE(l.system_qty,0);
    CONTINUE WHEN v_diff = 0;
    IF v_diff > 0 THEN
      PERFORM public.post_stock_receipt(
        c.company_id, l.item_id, c.warehouse_id, v_diff, COALESCE(l.unit_cost,0),
        'CC-' || c.count_number, 0, 0, 0, NULL, 'cycle_count', _count_id,
        'Cycle count variance ' || c.count_number);
    ELSE
      PERFORM public.post_stock_issue(
        c.company_id, l.item_id, c.warehouse_id, abs(v_diff),
        'cycle_count', _count_id, 'Cycle count variance ' || c.count_number, 'adjustment'::stock_txn_type);
    END IF;
    v_posted := v_posted + 1;
  END LOOP;

  UPDATE public.cycle_counts
     SET status = 'completed', completed_at = now(), counted_by = COALESCE(counted_by, auth.uid())
   WHERE id = _count_id;

  RETURN jsonb_build_object('posted_lines', v_posted);
END;
$$;
REVOKE ALL ON FUNCTION public.post_cycle_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_cycle_count(uuid) TO authenticated;

-- ============ AUTOMATION: reorder -> draft purchase indent ============
CREATE OR REPLACE FUNCTION public.create_indent_from_reorder(_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_indent_id uuid;
  v_number text;
  r RECORD;
  v_count int := 0;
BEGIN
  IF _company_id <> public.get_user_company(auth.uid()) AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  v_number := public.next_proc_number(_company_id, 'PI');
  INSERT INTO public.purchase_indents (company_id, indent_number, status, source, notes, created_by, required_by)
  VALUES (_company_id, v_number, 'draft', 'reorder_automation',
          'Auto-generated from items below reorder level', auth.uid(), CURRENT_DATE + 7)
  RETURNING id INTO v_indent_id;

  FOR r IN
    SELECT i.id, i.sku, i.name, i.unit,
           GREATEST(COALESCE(i.reorder_qty,0), COALESCE(i.reorder_level,0) - COALESCE(s.on_hand,0)) AS need
      FROM public.items i
      LEFT JOIN (
        SELECT item_id, SUM(qty_remaining) AS on_hand
          FROM public.stock_batches WHERE company_id = _company_id GROUP BY item_id
      ) s ON s.item_id = i.id
     WHERE i.company_id = _company_id
       AND i.is_active
       AND i.item_type <> 'service'
       AND COALESCE(i.reorder_level, 0) > 0
       AND COALESCE(s.on_hand, 0) < COALESCE(i.reorder_level, 0)
  LOOP
    INSERT INTO public.purchase_indent_items (company_id, indent_id, item_id, item_name, item_code, unit, quantity, position)
    VALUES (_company_id, v_indent_id, r.id, r.name, r.sku, COALESCE(r.unit,'pcs'), GREATEST(r.need, 1), v_count);
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    DELETE FROM public.purchase_indents WHERE id = v_indent_id;
    RETURN jsonb_build_object('created', false, 'lines', 0);
  END IF;

  RETURN jsonb_build_object('created', true, 'lines', v_count, 'indent_id', v_indent_id, 'indent_number', v_number);
END;
$$;
REVOKE ALL ON FUNCTION public.create_indent_from_reorder(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_indent_from_reorder(uuid) TO authenticated;
