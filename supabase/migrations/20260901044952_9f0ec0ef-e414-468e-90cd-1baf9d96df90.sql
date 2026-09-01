
-- ============ PHASE 3: BANKING ============
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  bank_name text,
  account_number text,
  ifsc text,
  branch text,
  account_type text NOT NULL DEFAULT 'current',
  gl_account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  opening_balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_statement_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  txn_date date NOT NULL,
  description text,
  reference text,
  deposit numeric NOT NULL DEFAULT 0,
  withdrawal numeric NOT NULL DEFAULT 0,
  running_balance numeric,
  import_batch text,
  match_status text NOT NULL DEFAULT 'unmatched',
  matched_doc_kind text,
  matched_doc_id uuid,
  reconciled_at timestamptz,
  reconciled_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bsl_company_acct ON public.bank_statement_lines(company_id, bank_account_id, txn_date);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON public.bank_accounts(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statement_lines TO authenticated;
GRANT ALL ON public.bank_statement_lines TO service_role;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_accounts_read ON public.bank_accounts;
CREATE POLICY bank_accounts_read ON public.bank_accounts FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.get_user_company(auth.uid()));
DROP POLICY IF EXISTS bank_accounts_write ON public.bank_accounts;
CREATE POLICY bank_accounts_write ON public.bank_accounts FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','finance','owner']::app_role[]))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','finance','owner']::app_role[]));

DROP POLICY IF EXISTS bsl_read ON public.bank_statement_lines;
CREATE POLICY bsl_read ON public.bank_statement_lines FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.get_user_company(auth.uid()));
DROP POLICY IF EXISTS bsl_write ON public.bank_statement_lines;
CREATE POLICY bsl_write ON public.bank_statement_lines FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','finance','owner']::app_role[]))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_company_role(auth.uid(), company_id, ARRAY['admin','manager','finance','owner']::app_role[]));

DROP TRIGGER IF EXISTS touch_bank_accounts ON public.bank_accounts;
CREATE TRIGGER touch_bank_accounts BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reconciled_at timestamptz;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS reconciled_at timestamptz;
ALTER TABLE public.delivery_notes ADD COLUMN IF NOT EXISTS eway_payload jsonb;

CREATE OR REPLACE FUNCTION public.suggest_bank_matches(_line_id uuid)
RETURNS TABLE(doc_kind text, doc_id uuid, doc_number text, doc_date date, amount numeric, party text, score integer)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$
DECLARE l public.bank_statement_lines%ROWTYPE;
BEGIN
  SELECT * INTO l FROM public.bank_statement_lines WHERE id = _line_id;
  IF l.id IS NULL THEN RETURN; END IF;

  IF COALESCE(l.deposit,0) > 0 THEN
    RETURN QUERY
    SELECT 'customer_payment'::text, p.id, COALESCE(p.reference, 'Payment'), p.payment_date, p.amount,
           COALESCE(c.name,'-'),
           (CASE WHEN abs(p.amount - l.deposit) < 0.01 THEN 60 ELSE 0 END
            + CASE WHEN abs(p.payment_date - l.txn_date) <= 3 THEN 25 ELSE 0 END
            + CASE WHEN l.reference IS NOT NULL AND p.reference IS NOT NULL
                        AND lower(l.reference) LIKE '%' || lower(p.reference) || '%' THEN 15 ELSE 0 END)::int
    FROM public.payments p
    LEFT JOIN public.invoices i ON i.id = p.invoice_id
    LEFT JOIN public.customers c ON c.id = i.customer_id
    WHERE p.company_id = l.company_id AND p.reconciled_at IS NULL
      AND abs(p.payment_date - l.txn_date) <= 15
    ORDER BY 7 DESC LIMIT 10;
  ELSE
    RETURN QUERY
    SELECT 'vendor_payment'::text, sp.id, sp.payment_number, sp.payment_date, sp.amount,
           COALESCE(s.name,'-'),
           (CASE WHEN abs(sp.amount - l.withdrawal) < 0.01 THEN 60 ELSE 0 END
            + CASE WHEN abs(sp.payment_date - l.txn_date) <= 3 THEN 25 ELSE 0 END
            + CASE WHEN l.reference IS NOT NULL AND sp.reference IS NOT NULL
                        AND lower(l.reference) LIKE '%' || lower(sp.reference) || '%' THEN 15 ELSE 0 END)::int
    FROM public.supplier_payments sp
    LEFT JOIN public.suppliers s ON s.id = sp.supplier_id
    WHERE sp.company_id = l.company_id AND sp.reconciled_at IS NULL
      AND abs(sp.payment_date - l.txn_date) <= 15
    ORDER BY 7 DESC LIMIT 10;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.reconcile_bank_line(_line_id uuid, _doc_kind text, _doc_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE l public.bank_statement_lines%ROWTYPE;
BEGIN
  SELECT * INTO l FROM public.bank_statement_lines WHERE id = _line_id;
  IF l.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Statement line not found'); END IF;
  IF NOT (public.is_super_admin(auth.uid())
          OR public.has_company_role(auth.uid(), l.company_id, ARRAY['admin','manager','finance','owner']::app_role[])) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not permitted');
  END IF;

  IF _doc_kind = 'customer_payment' THEN
    UPDATE public.payments SET reconciled_at = now(), bank_account_id = COALESCE(bank_account_id, l.bank_account_id)
    WHERE id = _doc_id AND company_id = l.company_id;
  ELSIF _doc_kind = 'vendor_payment' THEN
    UPDATE public.supplier_payments SET reconciled_at = now(), bank_account_id = COALESCE(bank_account_id, l.bank_account_id)
    WHERE id = _doc_id AND company_id = l.company_id;
  END IF;

  UPDATE public.bank_statement_lines
     SET match_status = 'reconciled', matched_doc_kind = _doc_kind, matched_doc_id = _doc_id,
         reconciled_at = now(), reconciled_by = auth.uid()
   WHERE id = _line_id;

  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.unreconcile_bank_line(_line_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE l public.bank_statement_lines%ROWTYPE;
BEGIN
  SELECT * INTO l FROM public.bank_statement_lines WHERE id = _line_id;
  IF l.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not found'); END IF;
  IF NOT (public.is_super_admin(auth.uid())
          OR public.has_company_role(auth.uid(), l.company_id, ARRAY['admin','manager','finance','owner']::app_role[])) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not permitted');
  END IF;
  IF l.matched_doc_kind = 'customer_payment' THEN
    UPDATE public.payments SET reconciled_at = NULL WHERE id = l.matched_doc_id;
  ELSIF l.matched_doc_kind = 'vendor_payment' THEN
    UPDATE public.supplier_payments SET reconciled_at = NULL WHERE id = l.matched_doc_id;
  END IF;
  UPDATE public.bank_statement_lines
     SET match_status = 'unmatched', matched_doc_kind = NULL, matched_doc_id = NULL,
         reconciled_at = NULL, reconciled_by = NULL
   WHERE id = _line_id;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.bank_reconciliation_summary(_company_id uuid)
RETURNS TABLE(bank_account_id uuid, name text, book_balance numeric, statement_balance numeric,
              unreconciled_lines bigint, unreconciled_amount numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$
  SELECT b.id, b.name,
    b.opening_balance
      + COALESCE((SELECT sum(p.amount) FROM public.payments p WHERE p.bank_account_id = b.id), 0)
      - COALESCE((SELECT sum(sp.amount) FROM public.supplier_payments sp WHERE sp.bank_account_id = b.id), 0),
    b.opening_balance
      + COALESCE((SELECT sum(l.deposit - l.withdrawal) FROM public.bank_statement_lines l WHERE l.bank_account_id = b.id), 0),
    COALESCE((SELECT count(*) FROM public.bank_statement_lines l WHERE l.bank_account_id = b.id AND l.match_status <> 'reconciled'), 0),
    COALESCE((SELECT sum(abs(l.deposit - l.withdrawal)) FROM public.bank_statement_lines l WHERE l.bank_account_id = b.id AND l.match_status <> 'reconciled'), 0)
  FROM public.bank_accounts b
  WHERE b.company_id = _company_id
  ORDER BY b.name;
$$;

CREATE OR REPLACE FUNCTION public.post_manual_voucher(
  _company_id uuid, _date date, _narration text, _lines jsonb, _kind text DEFAULT 'journal')
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_dr numeric; v_cr numeric; v_je uuid;
BEGIN
  IF NOT (public.is_super_admin(auth.uid())
          OR public.has_company_role(auth.uid(), _company_id, ARRAY['admin','manager','finance','owner']::app_role[])) THEN
    RAISE EXCEPTION 'Not permitted to post vouchers';
  END IF;
  SELECT COALESCE(sum((x->>'debit')::numeric),0), COALESCE(sum((x->>'credit')::numeric),0)
    INTO v_dr, v_cr FROM jsonb_array_elements(_lines) x;
  IF abs(v_dr - v_cr) > 0.01 THEN
    RAISE EXCEPTION 'Voucher is not balanced: debit % vs credit %', v_dr, v_cr;
  END IF;
  v_je := public.post_journal(_company_id, _date, 'finance', _kind, gen_random_uuid(), _narration, _lines);
  RETURN v_je;
END $$;

REVOKE ALL ON FUNCTION public.reconcile_bank_line(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unreconcile_bank_line(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.post_manual_voucher(uuid, date, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_bank_line(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unreconcile_bank_line(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_manual_voucher(uuid, date, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_bank_matches(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bank_reconciliation_summary(uuid) TO authenticated;

-- ============ PHASE 4: GST AUTOMATION ============
CREATE OR REPLACE FUNCTION public.build_einvoice_payload(_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE inv public.invoices%ROWTYPE; co public.companies%ROWTYPE; cu public.customers%ROWTYPE; v_items jsonb;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id;
  IF inv.id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO co FROM public.companies WHERE id = inv.company_id;
  SELECT * INTO cu FROM public.customers WHERE id = inv.customer_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'SlNo', COALESCE(it.position, 1)::text,
      'PrdDesc', it.product_name,
      'HsnCd', COALESCE(it.hsn_code, ''),
      'Qty', it.quantity,
      'UnitPrice', it.unit_price,
      'TotAmt', it.quantity * it.unit_price,
      'Discount', COALESCE(it.discount_percent,0),
      'AssAmt', it.line_total - COALESCE(it.cgst_amount,0) - COALESCE(it.sgst_amount,0) - COALESCE(it.igst_amount,0),
      'GstRt', COALESCE(it.tax_percent,0),
      'CgstAmt', COALESCE(it.cgst_amount,0),
      'SgstAmt', COALESCE(it.sgst_amount,0),
      'IgstAmt', COALESCE(it.igst_amount,0),
      'TotItemVal', it.line_total
    ) ORDER BY it.position), '[]'::jsonb)
  INTO v_items FROM public.invoice_items it WHERE it.invoice_id = inv.id;

  RETURN jsonb_build_object(
    'Version', '1.1',
    'TranDtls', jsonb_build_object('TaxSch','GST','SupTyp','B2B','RegRev','N','IgstOnIntra','N'),
    'DocDtls', jsonb_build_object('Typ','INV','No', inv.invoice_number, 'Dt', to_char(inv.invoice_date,'DD/MM/YYYY')),
    'SellerDtls', jsonb_build_object('Gstin', COALESCE(co.gstin,''), 'LglNm', COALESCE(co.legal_name, co.name),
                                     'Addr1', COALESCE(co.address,''), 'Stcd', COALESCE(co.state_code,'')),
    'BuyerDtls', jsonb_build_object('Gstin', COALESCE(cu.gst_number,'URP'), 'LglNm', COALESCE(cu.name,''),
                                    'Pos', COALESCE(inv.place_of_supply, cu.state_code, ''),
                                    'Addr1', COALESCE(cu.billing_address,''), 'Stcd', COALESCE(cu.state_code,'')),
    'ItemList', v_items,
    'ValDtls', jsonb_build_object(
      'AssVal', inv.subtotal - COALESCE(inv.discount_total,0),
      'CgstVal', COALESCE(inv.cgst_total,0), 'SgstVal', COALESCE(inv.sgst_total,0),
      'IgstVal', COALESCE(inv.igst_total,0), 'TotInvVal', inv.grand_total)
  );
END $$;

CREATE OR REPLACE FUNCTION public.build_eway_payload(_dn_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE dn public.delivery_notes%ROWTYPE; co public.companies%ROWTYPE; cu public.customers%ROWTYPE;
        v_items jsonb; v_val numeric;
BEGIN
  SELECT * INTO dn FROM public.delivery_notes WHERE id = _dn_id;
  IF dn.id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO co FROM public.companies WHERE id = dn.company_id;
  SELECT * INTO cu FROM public.customers WHERE id = dn.customer_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'productName', i.name, 'hsnCode', COALESCE(i.hsn_code,''),
      'quantity', d.qty, 'qtyUnit', COALESCE(d.uom, i.unit, 'NOS'),
      'taxableAmount', d.qty * COALESCE(i.standard_cost,0))), '[]'::jsonb),
      COALESCE(sum(d.qty * COALESCE(i.standard_cost,0)), 0)
  INTO v_items, v_val
  FROM public.delivery_note_items d LEFT JOIN public.items i ON i.id = d.item_id
  WHERE d.dn_id = dn.id;

  RETURN jsonb_build_object(
    'supplyType','O','subSupplyType','1','docType','DEL',
    'docNo', dn.dn_no, 'docDate', to_char(dn.delivery_date,'DD/MM/YYYY'),
    'fromGstin', COALESCE(co.gstin,''), 'fromTrdName', COALESCE(co.legal_name, co.name),
    'fromStateCode', COALESCE(co.state_code,''),
    'toGstin', COALESCE(cu.gst_number,'URP'), 'toTrdName', COALESCE(cu.name,''),
    'toStateCode', COALESCE(dn.place_of_supply, cu.state_code, ''),
    'totalValue', v_val,
    'transporterName', COALESCE(dn.transporter_name,''),
    'vehicleNo', COALESCE(dn.vehicle_no,''), 'transMode','1',
    'itemList', v_items
  );
END $$;

CREATE OR REPLACE FUNCTION public.tg_gst_payload_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF TG_TABLE_NAME = 'invoices' THEN
    IF NEW.status IN ('sent','partially_paid','paid','overdue') AND NEW.einvoice_payload IS NULL THEN
      UPDATE public.invoices
         SET einvoice_payload = public.build_einvoice_payload(NEW.id), gst_status = 'posted'::posting_status
       WHERE id = NEW.id;
    END IF;
  ELSIF TG_TABLE_NAME = 'delivery_notes' THEN
    IF NEW.status IN ('dispatched','delivered') AND NEW.eway_payload IS NULL THEN
      UPDATE public.delivery_notes
         SET eway_payload = public.build_eway_payload(NEW.id), gst_status = 'posted'::posting_status
       WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS tg_invoice_gst_payload ON public.invoices;
CREATE TRIGGER tg_invoice_gst_payload AFTER INSERT OR UPDATE OF status ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.tg_gst_payload_after();

DROP TRIGGER IF EXISTS tg_dn_gst_payload ON public.delivery_notes;
CREATE TRIGGER tg_dn_gst_payload AFTER INSERT OR UPDATE OF status ON public.delivery_notes
FOR EACH ROW EXECUTE FUNCTION public.tg_gst_payload_after();

REVOKE ALL ON FUNCTION public.build_einvoice_payload(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.build_eway_payload(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.build_einvoice_payload(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.build_eway_payload(uuid) TO authenticated;

UPDATE public.invoices SET einvoice_payload = public.build_einvoice_payload(id), gst_status = 'posted'::posting_status
WHERE einvoice_payload IS NULL AND status IN ('sent','partially_paid','paid','overdue');

UPDATE public.delivery_notes SET eway_payload = public.build_eway_payload(id), gst_status = 'posted'::posting_status
WHERE eway_payload IS NULL AND status IN ('dispatched','delivered');

INSERT INTO public.gst_ledger(company_id, entry_id, txn_date, kind, taxable_value, igst, source_module, source_id)
SELECT vi.company_id,
       (SELECT je.id FROM public.journal_entries je
         WHERE je.source_module='procurement' AND je.source_type='vendor_invoice' AND je.source_id=vi.id LIMIT 1),
       vi.invoice_date, 'input', vi.subtotal, COALESCE(vi.tax_total,0), 'procurement', vi.id
FROM public.vendor_invoices vi
WHERE COALESCE(vi.tax_total,0) > 0
  AND vi.status IN ('matched','approved','paid','partially_paid')
  AND NOT EXISTS (SELECT 1 FROM public.gst_ledger g WHERE g.source_module='procurement' AND g.source_id=vi.id);
