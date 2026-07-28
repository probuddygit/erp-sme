
-- =============================================================================
-- 1) SALES RETURN POSTING (stock receipt + reverse journal + reverse GST)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.tg_post_sales_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ar uuid; v_rev uuid; v_gst uuid; v_je uuid;
  v_wh uuid; r RECORD; v_tax_type tax_type;
BEGIN
  IF NEW.status = 'received' AND COALESCE(OLD.status::text,'draft') <> 'received' THEN
    IF EXISTS (SELECT 1 FROM public.journal_entries
               WHERE source_module='sales' AND source_type='sales_return' AND source_id=NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Determine tax type from source invoice (fallback intra_state)
    SELECT tax_type INTO v_tax_type FROM public.invoices WHERE id = NEW.invoice_id;
    v_tax_type := COALESCE(v_tax_type, 'intra_state'::tax_type);

    v_ar  := public.acct(NEW.company_id,'1100');
    v_rev := public.acct(NEW.company_id,'4000');
    v_gst := public.acct(NEW.company_id,'2100');

    -- Reverse journal: DR Revenue + GST Output, CR AR
    v_je := public.post_journal(
      NEW.company_id, NEW.return_date, 'sales', 'sales_return', NEW.id,
      'Sales return ' || NEW.return_no,
      jsonb_build_array(
        jsonb_build_object('account_id', v_rev, 'debit', GREATEST(NEW.subtotal,0),      'credit', 0, 'description', 'Revenue reversal'),
        jsonb_build_object('account_id', v_gst, 'debit', GREATEST(NEW.tax_amount,0),    'credit', 0, 'description', 'GST output reversal'),
        jsonb_build_object('account_id', v_ar,  'debit', 0, 'credit', GREATEST(NEW.total,0), 'description', 'AR reversal ' || NEW.return_no)
      )
    );

    -- Reverse GST ledger (negative values)
    IF NEW.tax_amount > 0 THEN
      INSERT INTO public.gst_ledger(company_id, entry_id, txn_date, kind, taxable_value, cgst, sgst, igst, source_module, source_id)
      VALUES(NEW.company_id, v_je, NEW.return_date, 'output',
             -NEW.subtotal,
             CASE WHEN v_tax_type='intra_state' THEN -NEW.tax_amount/2 ELSE 0 END,
             CASE WHEN v_tax_type='intra_state' THEN -NEW.tax_amount/2 ELSE 0 END,
             CASE WHEN v_tax_type='inter_state' THEN -NEW.tax_amount     ELSE 0 END,
             'sales', NEW.id);
    END IF;

    -- Stock receipt back into the default warehouse for the company
    SELECT id INTO v_wh FROM public.warehouses WHERE company_id = NEW.company_id ORDER BY created_at LIMIT 1;
    IF v_wh IS NOT NULL THEN
      FOR r IN SELECT * FROM public.sales_return_items WHERE return_id = NEW.id LOOP
        IF r.item_id IS NOT NULL AND r.qty > 0 THEN
          PERFORM public.post_stock_receipt(
            NEW.company_id, r.item_id, v_wh, r.qty, r.rate,
            'SRET-' || NEW.return_no, 0, 0, 0, NULL,
            'sales_return', NEW.id, 'Sales return receipt'
          );
        END IF;
      END LOOP;
    END IF;

    UPDATE public.sales_returns
       SET financial_posting_status = 'posted'::posting_status,
           inventory_posting_status = CASE WHEN v_wh IS NULL THEN 'skipped' ELSE 'posted' END,
           gst_status = CASE WHEN NEW.tax_amount > 0 THEN 'posted' ELSE 'not_applicable' END
     WHERE id = NEW.id;

    PERFORM public.link_documents(NEW.company_id, 'invoice'::doc_kind, NEW.invoice_id, 'sales_return'::doc_kind, NEW.id)
      WHERE NEW.invoice_id IS NOT NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_sales_return_post ON public.sales_returns;
CREATE TRIGGER tg_sales_return_post
  AFTER UPDATE ON public.sales_returns
  FOR EACH ROW EXECUTE FUNCTION public.tg_post_sales_return();

-- =============================================================================
-- 2) VENDOR RETURN POSTING (stock issue + reverse journal)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.tg_post_vendor_return()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv uuid; v_ap uuid; v_gst_in uuid; v_je uuid;
  v_wh uuid; r RECORD; v_grn record;
BEGIN
  IF NEW.status IN ('approved','dispatched','received')
     AND COALESCE(OLD.status,'draft') NOT IN ('approved','dispatched','received') THEN
    IF EXISTS (SELECT 1 FROM public.journal_entries
               WHERE source_module='procurement' AND source_type='vendor_return' AND source_id=NEW.id) THEN
      RETURN NEW;
    END IF;

    v_inv    := public.acct(NEW.company_id,'1200');
    v_ap     := public.acct(NEW.company_id,'2000');
    v_gst_in := public.acct(NEW.company_id,'1300');

    v_je := public.post_journal(
      NEW.company_id, NEW.return_date, 'procurement', 'vendor_return', NEW.id,
      'Vendor return ' || NEW.vret_number,
      jsonb_build_array(
        jsonb_build_object('account_id', v_ap,     'debit', GREATEST(NEW.grand_total,0), 'credit', 0, 'description', 'AP reversal ' || NEW.vret_number),
        jsonb_build_object('account_id', v_inv,    'debit', 0, 'credit', GREATEST(NEW.subtotal - COALESCE(NEW.discount_total,0),0), 'description', 'Inventory issue'),
        jsonb_build_object('account_id', v_gst_in, 'debit', 0, 'credit', GREATEST(NEW.tax_total,0), 'description', 'GST input reversal')
      )
    );

    -- Reverse GST input ledger
    IF NEW.tax_total > 0 THEN
      INSERT INTO public.gst_ledger(company_id, entry_id, txn_date, kind, taxable_value, cgst, sgst, igst, source_module, source_id)
      VALUES(NEW.company_id, v_je, NEW.return_date, 'input',
             -(NEW.subtotal - COALESCE(NEW.discount_total,0)),
             -COALESCE(NEW.cgst_total,0),
             -COALESCE(NEW.sgst_total,0),
             -COALESCE(NEW.igst_total,0),
             'procurement', NEW.id);
    END IF;

    -- Resolve warehouse from source GRN if available, else default
    SELECT warehouse_id INTO v_wh FROM public.grns WHERE id = NEW.grn_id;
    IF v_wh IS NULL THEN
      SELECT id INTO v_wh FROM public.warehouses WHERE company_id = NEW.company_id ORDER BY created_at LIMIT 1;
    END IF;

    IF v_wh IS NOT NULL THEN
      FOR r IN SELECT * FROM public.vendor_return_items WHERE vret_id = NEW.id LOOP
        IF r.item_id IS NOT NULL AND r.quantity > 0 THEN
          PERFORM public.post_stock_issue(
            NEW.company_id, r.item_id, v_wh, r.quantity,
            'vendor_return', NEW.id, 'Vendor return dispatch', 'issue'::stock_txn_type
          );
        END IF;
      END LOOP;
    END IF;

    UPDATE public.vendor_returns
       SET financial_posting_status = 'posted'::posting_status,
           inventory_posting_status = CASE WHEN v_wh IS NULL THEN 'skipped' ELSE 'posted' END,
           gst_status = CASE WHEN NEW.tax_total > 0 THEN 'posted' ELSE 'not_applicable' END
     WHERE id = NEW.id;

    IF NEW.grn_id IS NOT NULL THEN
      PERFORM public.link_documents(NEW.company_id, 'grn'::doc_kind, NEW.grn_id, 'vendor_return'::doc_kind, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_vendor_return_post ON public.vendor_returns;
CREATE TRIGGER tg_vendor_return_post
  AFTER UPDATE ON public.vendor_returns
  FOR EACH ROW EXECUTE FUNCTION public.tg_post_vendor_return();

-- =============================================================================
-- 3) CRM LEAD → QUOTATION CONVERSION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.convert_lead_to_quotation(_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD; v_cust uuid; v_quo uuid; v_num text;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = _lead_id;
  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'lead not found';
  END IF;
  IF v_lead.company_id IS DISTINCT FROM public.get_user_company(auth.uid())
     AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_cust := v_lead.customer_id;
  IF v_cust IS NULL THEN
    INSERT INTO public.customers(company_id, name, email, phone, contact_person, created_by)
    VALUES(v_lead.company_id,
           COALESCE(v_lead.company_name, v_lead.contact_name, v_lead.title),
           v_lead.email, v_lead.phone, v_lead.contact_name, auth.uid())
    RETURNING id INTO v_cust;
    UPDATE public.leads SET customer_id = v_cust WHERE id = v_lead.id;
  END IF;

  v_num := public.next_doc_number(v_lead.company_id, 'QUO');
  INSERT INTO public.quotations(company_id, quotation_number, customer_id, lead_id, status,
                                 issue_date, valid_until, subtotal, tax_total, grand_total,
                                 source_doc_kind, source_doc_id, notes, created_by)
  VALUES(v_lead.company_id, v_num, v_cust, v_lead.id, 'draft'::quotation_status,
         CURRENT_DATE, CURRENT_DATE + 30,
         v_lead.expected_value, 0, v_lead.expected_value,
         NULL, v_lead.id,
         'Converted from lead: ' || v_lead.title, auth.uid())
  RETURNING id INTO v_quo;

  -- Placeholder line so the quotation is editable immediately
  INSERT INTO public.quotation_items(quotation_id, company_id, product_name, quantity, unit_price, tax_percent, line_total, position)
  VALUES(v_quo, v_lead.company_id, v_lead.title, 1, v_lead.expected_value, 18, v_lead.expected_value, 0);

  PERFORM public.record_document_event(v_lead.company_id, 'quotation'::doc_kind, v_quo, 'converted_from_lead',
    jsonb_build_object('lead_id', v_lead.id, 'lead_title', v_lead.title));

  -- Update lead status
  UPDATE public.leads SET status='proposal'::lead_status WHERE id = v_lead.id;

  RETURN v_quo;
END $$;

REVOKE ALL ON FUNCTION public.convert_lead_to_quotation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_quotation(uuid) TO authenticated;

-- =============================================================================
-- 4) RECURRING INVOICE GENERATOR
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_due_recurring_invoices(_company_id uuid DEFAULT NULL)
RETURNS TABLE(template_id uuid, invoice_id uuid, invoice_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD; v_inv uuid; v_num text;
  v_subtotal numeric; v_tax numeric; v_grand numeric;
  v_line jsonb; v_pos int; v_qty numeric; v_price numeric; v_taxpct numeric;
BEGIN
  FOR t IN
    SELECT * FROM public.recurring_invoice_templates
    WHERE active = true
      AND next_run_date <= CURRENT_DATE
      AND (_company_id IS NULL OR company_id = _company_id)
      AND (_company_id IS NOT NULL
           OR public.is_super_admin(auth.uid())
           OR company_id = public.get_user_company(auth.uid()))
  LOOP
    v_subtotal := 0; v_tax := 0; v_grand := 0;
    v_num := public.next_doc_number(t.company_id, 'INV');

    INSERT INTO public.invoices(company_id, invoice_number, customer_id, status,
                                invoice_date, due_date, subtotal, tax_total, grand_total, amount_due,
                                notes, created_by)
    VALUES(t.company_id, v_num, t.customer_id, 'draft'::invoice_status,
           CURRENT_DATE, CURRENT_DATE + COALESCE((t.template->>'due_days')::int, 15),
           0, 0, 0, 0,
           'Auto-generated from recurring template: ' || t.name, t.created_by)
    RETURNING id INTO v_inv;

    v_pos := 0;
    FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(t.template->'items','[]'::jsonb)) LOOP
      v_qty    := COALESCE((v_line->>'quantity')::numeric, 1);
      v_price  := COALESCE((v_line->>'unit_price')::numeric, 0);
      v_taxpct := COALESCE((v_line->>'tax_percent')::numeric, 18);
      INSERT INTO public.invoice_items(invoice_id, company_id, product_name, description,
                                        quantity, unit_price, tax_percent,
                                        cgst_amount, sgst_amount, igst_amount, line_total, position)
      VALUES(v_inv, t.company_id,
             COALESCE(v_line->>'product_name','Item'),
             v_line->>'description',
             v_qty, v_price, v_taxpct,
             (v_qty*v_price*v_taxpct/200), (v_qty*v_price*v_taxpct/200), 0,
             v_qty*v_price*(1+v_taxpct/100), v_pos);
      v_subtotal := v_subtotal + v_qty*v_price;
      v_tax := v_tax + v_qty*v_price*v_taxpct/100;
      v_pos := v_pos + 1;
    END LOOP;
    v_grand := v_subtotal + v_tax;

    UPDATE public.invoices
       SET subtotal = v_subtotal,
           tax_total = v_tax,
           cgst_total = v_tax/2, sgst_total = v_tax/2,
           grand_total = v_grand,
           amount_due = v_grand
     WHERE id = v_inv;

    UPDATE public.recurring_invoice_templates
       SET last_run_date = CURRENT_DATE,
           next_run_date = CASE t.frequency
             WHEN 'monthly'   THEN CURRENT_DATE + INTERVAL '1 month'
             WHEN 'quarterly' THEN CURRENT_DATE + INTERVAL '3 months'
             WHEN 'yearly'    THEN CURRENT_DATE + INTERVAL '1 year'
           END
     WHERE id = t.id;

    PERFORM public.record_document_event(t.company_id, 'invoice'::doc_kind, v_inv,
      'generated_from_recurring', jsonb_build_object('template_id', t.id, 'template_name', t.name));

    template_id := t.id; invoice_id := v_inv; invoice_number := v_num;
    RETURN NEXT;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.generate_due_recurring_invoices(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_due_recurring_invoices(uuid) TO authenticated, service_role;

-- =============================================================================
-- 5) NOTIFICATION FAN-OUT (in-app)
-- =============================================================================

-- Alert → notification (broadcast to company)
CREATE OR REPLACE FUNCTION public.tg_alert_to_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications(company_id, user_id, channel, status, subject, body, metadata)
  VALUES(NEW.company_id, NULL, 'in_app'::notif_channel, 'pending'::notif_status,
         NEW.title, NEW.message,
         jsonb_build_object('alert_id', NEW.id, 'category', NEW.category, 'severity', NEW.severity));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_alert_notify ON public.alerts;
CREATE TRIGGER tg_alert_notify
  AFTER INSERT ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.tg_alert_to_notification();

-- Overdue invoices sweeper (call from cron or manually)
CREATE OR REPLACE FUNCTION public.sweep_overdue_invoices()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int := 0; r RECORD;
BEGIN
  FOR r IN
    SELECT id, company_id, invoice_number, grand_total, amount_due, due_date, customer_id
    FROM public.invoices
    WHERE status IN ('sent','partially_paid')
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE
      AND amount_due > 0
  LOOP
    UPDATE public.invoices SET status='overdue'::invoice_status
      WHERE id = r.id AND status <> 'overdue';
    -- avoid dupes: only one overdue notif per invoice per day
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE doc_kind='invoice'::doc_kind AND doc_id=r.id
        AND created_at::date = CURRENT_DATE
        AND (metadata->>'kind') = 'overdue'
    ) THEN
      INSERT INTO public.notifications(company_id, user_id, channel, status, subject, body,
                                        doc_kind, doc_id, metadata)
      VALUES(r.company_id, NULL, 'in_app'::notif_channel, 'pending'::notif_status,
             'Invoice overdue: ' || r.invoice_number,
             'Amount due ₹' || r.amount_due::text || ' (due ' || r.due_date::text || ')',
             'invoice'::doc_kind, r.id,
             jsonb_build_object('kind','overdue','amount_due', r.amount_due));
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.sweep_overdue_invoices() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sweep_overdue_invoices() TO authenticated, service_role;
