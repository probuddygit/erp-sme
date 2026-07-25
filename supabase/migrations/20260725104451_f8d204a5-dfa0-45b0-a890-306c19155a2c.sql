
-- Grant execute on stock levels RPC (was revoked earlier)
GRANT EXECUTE ON FUNCTION public.item_stock_levels(uuid) TO authenticated;

-- Helper: add FK only if not present
DO $$
DECLARE
  r record;
  fks text[][] := ARRAY[
    ['purchase_orders','supplier_id','suppliers','RESTRICT'],
    ['purchase_orders','rfq_id','rfqs','SET NULL'],
    ['purchase_orders','indent_id','purchase_indents','SET NULL'],
    ['purchase_order_items','po_id','purchase_orders','CASCADE'],
    ['purchase_order_items','item_id','items','RESTRICT'],
    ['purchase_indent_items','indent_id','purchase_indents','CASCADE'],
    ['purchase_indent_items','item_id','items','SET NULL'],
    ['rfqs','indent_id','purchase_indents','SET NULL'],
    ['rfq_items','rfq_id','rfqs','CASCADE'],
    ['rfq_items','item_id','items','SET NULL'],
    ['rfq_supplier_quotes','rfq_id','rfqs','CASCADE'],
    ['rfq_supplier_quotes','supplier_id','suppliers','RESTRICT'],
    ['rfq_supplier_quotes','rfq_item_id','rfq_items','CASCADE'],
    ['grns','po_id','purchase_orders','SET NULL'],
    ['grns','supplier_id','suppliers','RESTRICT'],
    ['grns','warehouse_id','warehouses','SET NULL'],
    ['grn_items','grn_id','grns','CASCADE'],
    ['grn_items','item_id','items','RESTRICT'],
    ['grn_items','warehouse_id','warehouses','SET NULL'],
    ['grn_items','po_item_id','purchase_order_items','SET NULL'],
    ['vendor_invoices','supplier_id','suppliers','RESTRICT'],
    ['vendor_invoices','po_id','purchase_orders','SET NULL'],
    ['vendor_invoices','grn_id','grns','SET NULL'],
    ['vendor_invoice_items','vinv_id','vendor_invoices','CASCADE'],
    ['vendor_invoice_items','po_item_id','purchase_order_items','SET NULL'],
    ['supplier_payments','supplier_id','suppliers','RESTRICT'],
    ['supplier_payments','vinv_id','vendor_invoices','SET NULL']
  ];
BEGIN
  FOR i IN 1..array_length(fks,1) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
      WHERE c.contype='f'
        AND t.relname = fks[i][1]
        AND a.attname = fks[i][2]
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE %s',
        fks[i][1],
        fks[i][1] || '_' || fks[i][2] || '_fkey',
        fks[i][2],
        fks[i][3],
        fks[i][4]
      );
    END IF;
  END LOOP;
END$$;

-- Refresh PostgREST schema cache so new FKs are pickable in embeds
NOTIFY pgrst, 'reload schema';
