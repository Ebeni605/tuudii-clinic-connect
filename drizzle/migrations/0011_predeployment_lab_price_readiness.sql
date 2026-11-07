-- =============================================================
-- REQUIREMENT 1: configurable, approved laboratory test definitions
-- =============================================================
ALTER TABLE public.lab_tests
  ADD COLUMN method text,
  ADD COLUMN analyzer text,
  ADD COLUMN critical_low numeric,
  ADD COLUMN critical_high numeric,
  ADD COLUMN approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN approved_by uuid,
  ADD COLUMN approved_at timestamp with time zone;

ALTER TABLE public.lab_tests
  ADD CONSTRAINT lab_tests_approval_status_check
  CHECK (approval_status IN ('draft','approved','needs_confirmation'));

-- B/F and BF stay exactly as printed on the paper form, but cannot be
-- ordered until an authorized laboratory professional confirms their meaning.
UPDATE public.lab_tests
SET active = false, approval_status = 'needs_confirmation'
WHERE btrim(name) IN ('B/F','BF');

-- Age-, sex- and pregnancy-specific reference intervals per test
CREATE TABLE public.lab_test_reference_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_test_id uuid NOT NULL REFERENCES public.lab_tests(id) ON DELETE CASCADE,
  sex text,
  age_min_years numeric,
  age_max_years numeric,
  pregnancy boolean NOT NULL DEFAULT false,
  unit text,
  ref_low numeric,
  ref_high numeric,
  ref_text text,
  note text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lab_test_ref_ranges_sex_check CHECK (sex IS NULL OR sex IN ('male','female')),
  CONSTRAINT lab_test_ref_ranges_age_check CHECK (age_min_years IS NULL OR age_max_years IS NULL OR age_min_years <= age_max_years),
  CONSTRAINT lab_test_ref_ranges_ref_check CHECK (ref_low IS NULL OR ref_high IS NULL OR ref_low <= ref_high)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_test_reference_ranges TO authenticated;
GRANT ALL ON public.lab_test_reference_ranges TO service_role;
ALTER TABLE public.lab_test_reference_ranges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read reference ranges" ON public.lab_test_reference_ranges
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage reference ranges" ON public.lab_test_reference_ranges
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER lab_test_reference_ranges_audit AFTER INSERT OR UPDATE OR DELETE
  ON public.lab_test_reference_ranges FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Test configuration changes send the test back to draft for re-approval
CREATE OR REPLACE FUNCTION public.lab_test_before()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  NEW.code := upper(btrim(COALESCE(NEW.code,'')));
  NEW.name := btrim(COALESCE(NEW.name,''));
  NEW.section := btrim(COALESCE(NEW.section,''));
  IF NEW.code = '' OR NEW.name = '' OR NEW.section = '' THEN RAISE EXCEPTION 'Code, test name and category are required'; END IF;
  IF NEW.result_type <> 'numeric' THEN NEW.ref_low := NULL; NEW.ref_high := NULL; END IF;
  IF NEW.ref_low IS NOT NULL AND NEW.ref_high IS NOT NULL AND NEW.ref_low > NEW.ref_high THEN
    RAISE EXCEPTION 'The low reference limit must not be above the high limit';
  END IF;
  IF NEW.critical_low IS NOT NULL AND NEW.critical_high IS NOT NULL AND NEW.critical_low > NEW.critical_high THEN
    RAISE EXCEPTION 'The low critical limit must not be above the high limit';
  END IF;
  IF NEW.result_type = 'qualitative' THEN
    IF COALESCE(cardinality(NEW.result_options),0) = 0 THEN RAISE EXCEPTION 'List the allowed answers for a qualitative test'; END IF;
    IF NEW.abnormal_options IS NOT NULL AND NOT (NEW.abnormal_options <@ NEW.result_options) THEN
      RAISE EXCEPTION 'Abnormal answers must be among the allowed answers';
    END IF;
  ELSE
    NEW.result_options := NULL; NEW.abnormal_options := NULL;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.unit IS DISTINCT FROM OLD.unit OR NEW.ref_low IS DISTINCT FROM OLD.ref_low
     OR NEW.ref_high IS DISTINCT FROM OLD.ref_high OR NEW.ref_text IS DISTINCT FROM OLD.ref_text
     OR NEW.reference_source IS DISTINCT FROM OLD.reference_source OR NEW.abnormal_options IS DISTINCT FROM OLD.abnormal_options THEN
    NEW.reference_updated_by := auth.uid(); NEW.reference_updated_at := now();
  ELSE
    NEW.reference_updated_by := OLD.reference_updated_by; NEW.reference_updated_at := OLD.reference_updated_at;
  END IF;
  -- Any change to the approved configuration returns the test to draft
  IF TG_OP = 'UPDATE' AND OLD.approval_status = 'approved' AND NEW.approval_status = 'approved' AND (
       NEW.unit IS DISTINCT FROM OLD.unit OR NEW.ref_low IS DISTINCT FROM OLD.ref_low
       OR NEW.ref_high IS DISTINCT FROM OLD.ref_high OR NEW.ref_text IS DISTINCT FROM OLD.ref_text
       OR NEW.result_type IS DISTINCT FROM OLD.result_type OR NEW.result_options IS DISTINCT FROM OLD.result_options
       OR NEW.abnormal_options IS DISTINCT FROM OLD.abnormal_options OR NEW.reference_source IS DISTINCT FROM OLD.reference_source
       OR NEW.method IS DISTINCT FROM OLD.method OR NEW.analyzer IS DISTINCT FROM OLD.analyzer
       OR NEW.critical_low IS DISTINCT FROM OLD.critical_low OR NEW.critical_high IS DISTINCT FROM OLD.critical_high) THEN
    NEW.approval_status := 'draft'; NEW.approved_by := NULL; NEW.approved_at := NULL;
  END IF;
  RETURN NEW;
END $function$;

-- Approval by an administrator or an authorized laboratory verifier, with audit record
CREATE OR REPLACE FUNCTION public.approve_lab_test(_test_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE t public.lab_tests%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.can_verify_lab(auth.uid())) THEN
    RAISE EXCEPTION 'Only an administrator or an authorized laboratory verifier can approve a test';
  END IF;
  SELECT * INTO t FROM public.lab_tests WHERE id = _test_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Test not found'; END IF;
  IF t.approval_status = 'needs_confirmation' AND btrim(t.name) IN ('B/F','BF') THEN
    RAISE EXCEPTION 'Enter the confirmed full name of this abbreviation before approving it';
  END IF;
  IF btrim(COALESCE(t.reference_source,'')) = '' THEN
    RAISE EXCEPTION 'Record the source of the reference values (procedure, kit insert or analyser) before approving';
  END IF;
  IF t.result_type = 'numeric' THEN
    IF btrim(COALESCE(t.unit,'')) = '' THEN RAISE EXCEPTION 'A numeric test needs a measurement unit before approval'; END IF;
    IF t.ref_low IS NULL AND t.ref_high IS NULL AND btrim(COALESCE(t.ref_text,'')) = ''
       AND NOT EXISTS (SELECT 1 FROM public.lab_test_reference_ranges r WHERE r.lab_test_id = t.id) THEN
      RAISE EXCEPTION 'A numeric test needs a reference interval (general or age/sex-specific) before approval';
    END IF;
  ELSIF t.result_type = 'qualitative' THEN
    IF COALESCE(cardinality(t.result_options),0) = 0 THEN RAISE EXCEPTION 'A qualitative test needs allowed answers before approval'; END IF;
  END IF;
  UPDATE public.lab_tests
    SET approval_status = 'approved', approved_by = auth.uid(), approved_at = now(), active = true
    WHERE id = _test_id;
  INSERT INTO public.audit_log (user_id, table_name, record_id, action, diff)
    VALUES (auth.uid(), 'lab_tests', _test_id::text, 'LAB_TEST_APPROVED',
            jsonb_build_object('name', t.name, 'code', t.code, 'previous_status', t.approval_status));
END $function$;
REVOKE ALL ON FUNCTION public.approve_lab_test(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_lab_test(uuid) TO authenticated;

-- Only approved, active tests can be ordered
CREATE OR REPLACE FUNCTION public.create_lab_order(_visit_id uuid, _test_ids uuid[], _priority text DEFAULT 'routine'::text, _notes text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE v_status text; v_patient uuid; req_id uuid; req_no text; dup text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'clinician') THEN RAISE EXCEPTION 'Only an OPD clinician can request laboratory tests'; END IF;
  IF _test_ids IS NULL OR cardinality(_test_ids) = 0 THEN RAISE EXCEPTION 'Tick at least one test'; END IF;
  IF cardinality(_test_ids) > 60 THEN RAISE EXCEPTION 'Too many tests in one request'; END IF;
  IF _priority NOT IN ('routine','urgent') THEN RAISE EXCEPTION 'Priority must be routine or urgent'; END IF;
  IF length(COALESCE(_notes,'')) > 2000 THEN RAISE EXCEPTION 'Clinical notes are too long (max 2000 characters)'; END IF;
  SELECT status, patient_id INTO v_status, v_patient FROM public.visits WHERE id = _visit_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Visit not found'; END IF;
  IF v_status NOT IN ('in_consultation','awaiting_lab','ready_for_review') THEN RAISE EXCEPTION 'Start the consultation first'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(_test_ids) t(tid) LEFT JOIN public.lab_tests l ON l.id = t.tid
             WHERE l.id IS NULL OR NOT l.active OR l.approval_status <> 'approved') THEN
    RAISE EXCEPTION 'One of the selected tests is not available or not yet approved for ordering';
  END IF;
  SELECT string_agg(DISTINCT lt.name, ', ') INTO dup
    FROM public.lab_request_items i
    JOIN public.lab_requests r ON r.id = i.lab_request_id
    JOIN public.lab_tests lt ON lt.id = i.lab_test_id
   WHERE r.visit_id = _visit_id AND i.lab_test_id = ANY(_test_ids) AND i.status NOT IN ('verified','cancelled');
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'Already requested for this visit and not finished yet: %', dup USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.lab_requests (visit_id, patient_id, priority, clinical_notes)
    VALUES (_visit_id, v_patient, _priority, NULLIF(btrim(COALESCE(_notes,'')), ''))
    RETURNING id, request_number INTO req_id, req_no;
  INSERT INTO public.lab_request_items (lab_request_id, lab_test_id)
    SELECT req_id, tid FROM (SELECT DISTINCT unnest(_test_ids) AS tid) s;
  IF v_status <> 'awaiting_lab' THEN
    UPDATE public.visits SET status = 'awaiting_lab' WHERE id = _visit_id;
  END IF;
  RETURN jsonb_build_object('id', req_id, 'request_number', req_no);
END $function$;

-- =============================================================
-- REQUIREMENT 2: approved clinic price list
-- =============================================================
ALTER TABLE public.service_charges
  ADD COLUMN description text,
  ADD COLUMN currency text NOT NULL DEFAULT 'ETB',
  ADD COLUMN effective_date date,
  ADD COLUMN expiry_date date,
  ADD COLUMN approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN approved_by uuid,
  ADD COLUMN approved_at timestamp with time zone,
  ADD CONSTRAINT service_charges_approval_status_check CHECK (approval_status IN ('draft','approved')),
  ADD CONSTRAINT service_charges_dates_check CHECK (effective_date IS NULL OR expiry_date IS NULL OR effective_date <= expiry_date);

-- Price history: every price change is kept
CREATE TABLE public.price_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  charge_id uuid NOT NULL REFERENCES public.service_charges(id) ON DELETE CASCADE,
  old_price numeric,
  new_price numeric NOT NULL,
  changed_by uuid,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.price_history TO authenticated;
GRANT ALL ON public.price_history TO service_role;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read price history" ON public.price_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.billing_settings
  ADD COLUMN price_list_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN price_list_approved_by uuid,
  ADD COLUMN price_list_approved_at timestamp with time zone;

-- Billing counts as on only when the price list is approved too
CREATE OR REPLACE FUNCTION public.billing_enabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS
$function$ SELECT COALESCE((SELECT enabled AND price_list_approved FROM public.billing_settings WHERE id = 1), false) $function$;

-- Price changes are recorded and send the charge back to draft for re-approval
CREATE OR REPLACE FUNCTION public.service_charge_before()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  NEW.name := btrim(NEW.name);
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  IF NEW.price < 0 OR NEW.price > 10000000 THEN RAISE EXCEPTION 'Price is not valid'; END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.created_at := OLD.created_at;
    IF NEW.price IS DISTINCT FROM OLD.price THEN
      INSERT INTO public.price_history (charge_id, old_price, new_price, changed_by)
        VALUES (OLD.id, OLD.price, NEW.price, auth.uid());
      NEW.approval_status := 'draft'; NEW.approved_by := NULL; NEW.approved_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.approve_charge(_charge_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE c public.service_charges%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only an administrator can approve a price'; END IF;
  SELECT * INTO c FROM public.service_charges WHERE id = _charge_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Charge not found'; END IF;
  UPDATE public.service_charges
    SET approval_status = 'approved', approved_by = auth.uid(), approved_at = now()
    WHERE id = _charge_id;
  INSERT INTO public.audit_log (user_id, table_name, record_id, action, diff)
    VALUES (auth.uid(), 'service_charges', _charge_id::text, 'PRICE_APPROVED',
            jsonb_build_object('name', c.name, 'price', c.price, 'currency', c.currency));
END $function$;
REVOKE ALL ON FUNCTION public.approve_charge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_charge(uuid) TO authenticated;

-- Administrator confirms the whole price list; required before billing can run
CREATE OR REPLACE FUNCTION public.approve_price_list(_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only an administrator can approve the price list'; END IF;
  IF length(btrim(COALESCE(_note,''))) < 5 THEN RAISE EXCEPTION 'Record who approved the price list (e.g. name and date)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.service_charges WHERE active AND approval_status = 'approved') THEN
    RAISE EXCEPTION 'Approve at least one price before confirming the price list';
  END IF;
  UPDATE public.billing_settings
    SET price_list_approved = true, price_list_approved_by = auth.uid(), price_list_approved_at = now(),
        approval_note = btrim(_note)
    WHERE id = 1;
  INSERT INTO public.audit_log (user_id, table_name, record_id, action, diff)
    VALUES (auth.uid(), 'billing_settings', '1', 'PRICE_LIST_APPROVED', jsonb_build_object('note', btrim(_note)));
END $function$;
REVOKE ALL ON FUNCTION public.approve_price_list(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_price_list(text) TO authenticated;

-- Billing can only be switched on with an approved price list and an approval record
CREATE OR REPLACE FUNCTION public.billing_settings_before()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  NEW.id := 1;
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  IF NEW.currency <> OLD.currency AND EXISTS (SELECT 1 FROM public.invoices) THEN
    RAISE EXCEPTION 'The currency cannot change after invoices exist';
  END IF;
  IF NEW.enabled AND NOT NEW.price_list_approved THEN
    RAISE EXCEPTION 'Confirm the approved price list before switching billing on';
  END IF;
  IF NEW.enabled AND length(btrim(COALESCE(NEW.approval_note,''))) < 5 THEN
    RAISE EXCEPTION 'Record who approved the prices before switching billing on';
  END IF;
  RETURN NEW;
END $function$;

-- Only approved, in-date prices can be billed
CREATE OR REPLACE FUNCTION public.invoice_item_before()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_status text; c record;
BEGIN
  IF NOT public.billing_enabled() THEN RAISE EXCEPTION 'Billing is not switched on'; END IF;
  SELECT status INTO v_status FROM public.invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id) FOR UPDATE;
  IF v_status IS DISTINCT FROM 'draft' THEN RAISE EXCEPTION 'Items can only change while the invoice is a draft'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW.charge_id IS NOT NULL THEN
    SELECT name, price, active, approval_status, effective_date, expiry_date INTO c FROM public.service_charges WHERE id = NEW.charge_id;
    IF c IS NULL OR NOT c.active OR c.approval_status <> 'approved' THEN RAISE EXCEPTION 'This charge is not available or not approved'; END IF;
    IF c.effective_date IS NOT NULL AND c.effective_date > public.clinic_today() THEN RAISE EXCEPTION 'This price is not in effect yet'; END IF;
    IF c.expiry_date IS NOT NULL AND c.expiry_date < public.clinic_today() THEN RAISE EXCEPTION 'This price has expired'; END IF;
    NEW.unit_price := c.price;
    NEW.description := COALESCE(NULLIF(btrim(NEW.description), ''), c.name);
  ELSIF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Choose a charge from the price list (only an administrator can add a custom item)';
  END IF;
  NEW.description := btrim(NEW.description);
  NEW.created_by := auth.uid();
  NEW.created_at := now();
  RETURN NEW;
END $function$;

-- =============================================================
-- REQUIREMENT 3: deployment readiness checklist (cleanup runs via server functions)
-- =============================================================
CREATE TABLE public.deployment_checklist (
  gate_key text PRIMARY KEY,
  done boolean NOT NULL DEFAULT false,
  done_by uuid,
  done_at timestamp with time zone,
  note text
);
GRANT SELECT, INSERT, UPDATE ON public.deployment_checklist TO authenticated;
GRANT ALL ON public.deployment_checklist TO service_role;
ALTER TABLE public.deployment_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read the deployment checklist" ON public.deployment_checklist
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins update the deployment checklist" ON public.deployment_checklist
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER deployment_checklist_audit AFTER INSERT OR UPDATE OR DELETE
  ON public.deployment_checklist FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();