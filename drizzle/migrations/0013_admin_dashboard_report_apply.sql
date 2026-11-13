CREATE OR REPLACE FUNCTION public.report_dashboard(_from date, _to date, _group text DEFAULT 'day') RETURNS jsonb
  LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $$
DECLARE
  res jsonb;
  pf date := _from - (_to - _from) - 1;
  pt date := _from - 1;
  g text := CASE WHEN _group IN ('day','week','month','year') THEN _group ELSE 'day' END;
BEGIN
  PERFORM public.report_guard(_from, _to);
  WITH v AS (SELECT * FROM visits WHERE queue_date BETWEEN _from AND _to AND status NOT IN ('cancelled','no_show')),
       vp AS (SELECT * FROM visits WHERE queue_date BETWEEN pf AND pt AND status NOT IN ('cancelled','no_show')),
       it AS (SELECT i.*, r.visit_id FROM lab_request_items i JOIN lab_requests r ON r.id = i.lab_request_id
               WHERE public.clinic_date(r.created_at) BETWEEN _from AND _to)
  SELECT jsonb_build_object(
    'from', _from, 'to', _to, 'prev_from', pf, 'prev_to', pt, 'group', g,
    'cards', jsonb_build_object(
      'total_patients', (SELECT count(DISTINCT id) FROM patients WHERE NOT archived),
      'registrations_today', (SELECT count(*) FROM patients WHERE public.clinic_date(created_at) = public.clinic_today()),
      'registrations_yesterday', (SELECT count(*) FROM patients WHERE public.clinic_date(created_at) = public.clinic_today() - 1),
      'registrations', (SELECT count(*) FROM patients WHERE public.clinic_date(created_at) BETWEEN _from AND _to),
      'registrations_prev', (SELECT count(*) FROM patients WHERE public.clinic_date(created_at) BETWEEN pf AND pt),
      'opd_visits', (SELECT count(*) FROM v),
      'opd_visits_prev', (SELECT count(*) FROM vp),
      'lab_requests', (SELECT count(*) FROM lab_requests WHERE public.clinic_date(created_at) BETWEEN _from AND _to),
      'lab_requests_prev', (SELECT count(*) FROM lab_requests WHERE public.clinic_date(created_at) BETWEEN pf AND pt),
      'pending_results', (SELECT count(*) FROM lab_request_items WHERE status NOT IN ('verified','cancelled')),
      'verified_results', (SELECT count(*) FROM lab_request_items WHERE status = 'verified' AND public.clinic_date(verified_at) BETWEEN _from AND _to),
      'verified_results_prev', (SELECT count(*) FROM lab_request_items WHERE status = 'verified' AND public.clinic_date(verified_at) BETWEEN pf AND pt),
      'waiting_now', (SELECT count(*) FROM visits WHERE queue_date = public.clinic_today() AND status = 'waiting'),
      'completed', (SELECT count(*) FROM v WHERE status = 'completed'),
      'completed_prev', (SELECT count(*) FROM vp WHERE status = 'completed')
    ),
    'trend', COALESCE((SELECT jsonb_agg(jsonb_build_object('period', p, 'visits', c) ORDER BY p) FROM (
        SELECT date_trunc(g, queue_date)::date AS p, count(*) AS c FROM v GROUP BY 1) t), '[]'),
    'services', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', s.key, 'name', s.name,
        'visits', (SELECT count(*) FROM v WHERE v.service_key = s.key)) ORDER BY s.display_order)
        FROM service_categories s WHERE s.active), '[]'),
    'lab_status', COALESCE((SELECT jsonb_agg(jsonb_build_object('status', status, 'count', c)) FROM (
        SELECT status, count(*) c FROM it GROUP BY status) t), '[]'),
    'top_tests', COALESCE((SELECT jsonb_agg(row_to_json(t) ORDER BY t.count DESC, t.name) FROM (
        SELECT lt.name, lt.section, count(*) AS count FROM it JOIN lab_tests lt ON lt.id = it.lab_test_id
         GROUP BY lt.name, lt.section ORDER BY count(*) DESC, lt.name LIMIT 15) t), '[]'),
    'sections', COALESCE((SELECT jsonb_agg(DISTINCT section) FROM lab_tests), '[]'),
    'by_sex', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', sex, 'count', c)) FROM (
        SELECT p.sex, count(DISTINCT p.id) c FROM v JOIN patients p ON p.id = v.patient_id GROUP BY p.sex) t), '[]'),
    'by_age', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', b, 'count', c)) FROM (
        SELECT public.age_band(p.date_of_birth, v.queue_date) b, count(DISTINCT p.id) c
          FROM v JOIN patients p ON p.id = v.patient_id GROUP BY 1) t), '[]'),
    'flow', jsonb_build_object(
      'reception', jsonb_build_object('total', (SELECT count(*) FROM v), 'waiting', (SELECT count(*) FROM v WHERE status = 'waiting')),
      'opd', jsonb_build_object('total', (SELECT count(*) FROM v WHERE started_at IS NOT NULL),
                                'in_progress', (SELECT count(*) FROM v WHERE status = 'in_consultation')),
      'lab', jsonb_build_object('total', (SELECT count(DISTINCT visit_id) FROM it),
                                'in_progress', (SELECT count(*) FROM v WHERE status = 'awaiting_lab')),
      'review', jsonb_build_object('total', (SELECT count(*) FROM v WHERE status IN ('ready_for_review','completed') AND EXISTS (SELECT 1 FROM lab_requests r WHERE r.visit_id = v.id)),
                                   'waiting', (SELECT count(*) FROM v WHERE status = 'ready_for_review')),
      'payment', jsonb_build_object('enabled', public.billing_enabled(),
                                    'total', CASE WHEN public.billing_enabled() THEN (SELECT count(DISTINCT i.visit_id) FROM invoices i JOIN v ON v.id = i.visit_id WHERE i.status = 'issued' AND public.invoice_balance(i.id) <= 0) ELSE NULL END),
      'completed', jsonb_build_object('total', (SELECT count(*) FROM v WHERE status = 'completed'))
    )
  ) INTO res;
  RETURN res;
END $$;

REVOKE ALL ON FUNCTION public.report_dashboard(date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_dashboard(date, date, text) TO authenticated;