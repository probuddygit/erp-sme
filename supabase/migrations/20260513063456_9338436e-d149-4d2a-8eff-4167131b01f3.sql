CREATE OR REPLACE FUNCTION public.account_balances(_company_id uuid, _from date DEFAULT NULL::date, _to date DEFAULT NULL::date)
RETURNS TABLE(account_id uuid, code text, name text, type account_type, debit numeric, credit numeric, balance numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT a.id, a.code, a.name, a.type,
    COALESCE(SUM(jl.debit),0) AS debit,
    COALESCE(SUM(jl.credit),0) AS credit,
    COALESCE(SUM(jl.debit - jl.credit),0) AS balance
  FROM public.chart_of_accounts a
  LEFT JOIN public.journal_lines jl ON jl.account_id = a.id
  LEFT JOIN public.journal_entries je ON je.id = jl.entry_id AND je.status='posted'
    AND (_from IS NULL OR je.entry_date >= _from)
    AND (_to IS NULL OR je.entry_date <= _to)
  WHERE a.company_id = _company_id
  GROUP BY a.id, a.code, a.name, a.type
  ORDER BY a.code;
$function$;

GRANT EXECUTE ON FUNCTION public.account_balances(uuid, date, date) TO authenticated;