
CREATE OR REPLACE FUNCTION public.tg_grn_item_link_to_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_grn record; v_exists boolean;
BEGIN
  IF NEW.item_id IS NULL OR OLD.item_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT status, warehouse_id INTO v_grn FROM public.grns WHERE id = NEW.grn_id;
  IF v_grn.status <> 'posted' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.warehouse_id, v_grn.warehouse_id) IS NULL OR NEW.quantity <= 0 THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.stock_transactions t
    WHERE t.company_id = NEW.company_id
      AND t.reference_type = 'grn' AND t.reference_id = NEW.grn_id
      AND t.item_id = NEW.item_id
  ) INTO v_exists;
  IF v_exists THEN RETURN NEW; END IF;

  PERFORM public.post_stock_receipt(
    NEW.company_id, NEW.item_id, COALESCE(NEW.warehouse_id, v_grn.warehouse_id),
    NEW.quantity, NEW.unit_cost,
    COALESCE(NEW.batch_no, 'GRN-'||NEW.grn_id::text),
    0, 0, 0, NEW.expiry_date,
    'grn', NEW.grn_id, 'GRN receipt (item linked)'
  );
  IF NEW.po_item_id IS NOT NULL THEN
    UPDATE public.purchase_order_items SET received_quantity = received_quantity + NEW.quantity WHERE id = NEW.po_item_id;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS tg_grn_items_link_to_stock ON public.grn_items;
CREATE TRIGGER tg_grn_items_link_to_stock
AFTER UPDATE OF item_id ON public.grn_items
FOR EACH ROW EXECUTE FUNCTION public.tg_grn_item_link_to_stock();
