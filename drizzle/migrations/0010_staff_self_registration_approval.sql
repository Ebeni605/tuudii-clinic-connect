-- Staff self-registration with administrator approval.
-- New sign-ups get a profile in 'pending_approval' with no roles and no access.
-- Only an administrator can approve/reject and assign a role; approval stamps are server-set.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS staff_number text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Existing accounts were all created by an administrator, so they stay approved (approved_at unknown = NULL).
UPDATE public.profiles p SET email = lower(u.email) FROM auth.users u WHERE u.id = p.id AND p.email IS NULL;

ALTER TABLE public.profiles ALTER COLUMN approval_status SET DEFAULT 'pending_approval';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_approval_status_check
  CHECK (approval_status IN ('pending_approval', 'approved', 'rejected'));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_staff_number_len CHECK (staff_number IS NULL OR length(staff_number) <= 30);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_staff_number_approved
  ON public.profiles (lower(staff_number)) WHERE approval_status = 'approved' AND staff_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_pending_idx ON public.profiles (created_at) WHERE approval_status = 'pending_approval';

-- Roles only count for active AND approved accounts
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r JOIN public.profiles p ON p.id = r.user_id
    WHERE r.user_id = _user_id AND r.role = _role AND p.active AND p.approval_status = 'approved'
  )
$$;
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r JOIN public.profiles p ON p.id = r.user_id
    WHERE r.user_id = _user_id AND r.role = ANY(_roles) AND p.active AND p.approval_status = 'approved'
  )
$$;

-- New auth account -> pending profile. Any role in sign-up metadata is ignored.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _name text := left(btrim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), 120);
  _phone text := left(btrim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), 20);
  _staff text := left(btrim(COALESCE(NEW.raw_user_meta_data->>'staff_number', '')), 30);
BEGIN
  IF _name = '' THEN _name := split_part(COALESCE(NEW.email, ''), '@', 1); END IF;
  IF _phone !~ '^[+0-9 -]*$' THEN _phone := ''; END IF;
  INSERT INTO public.profiles (id, full_name, phone, staff_number, email, approval_status, active)
  VALUES (NEW.id, _name, NULLIF(_phone, ''), NULLIF(_staff, ''), lower(NEW.email), 'pending_approval', false)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.audit_log (user_id, table_name, record_id, action, diff)
  VALUES (NEW.id, 'staff_accounts', NEW.id::text, 'ACCOUNT_REGISTERED', jsonb_build_object('email', lower(NEW.email)));
  RETURN NEW;
END $$;

-- Guards approval status and stamps on every profile write
CREATE OR REPLACE FUNCTION public.profile_before()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
    IF _uid IS NOT NULL THEN
      -- Signed-in users (even admins) never write stamps or email directly
      NEW.email := OLD.email;
      NEW.approved_by := OLD.approved_by; NEW.approved_at := OLD.approved_at;
      NEW.rejected_by := OLD.rejected_by; NEW.rejected_at := OLD.rejected_at;
      IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
        IF NOT public.has_role(_uid, 'admin') THEN
          RAISE EXCEPTION 'Only an administrator can approve or reject staff registrations';
        END IF;
        IF OLD.id = _uid THEN
          RAISE EXCEPTION 'You cannot change the approval status of your own account';
        END IF;
      END IF;
    END IF;
    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
      IF OLD.approval_status = 'approved' THEN
        RAISE EXCEPTION 'Approved accounts are deactivated, not rejected';
      ELSIF NEW.approval_status = 'approved' THEN
        NEW.approved_by := COALESCE(_uid, NEW.approved_by);
        NEW.approved_at := now();
        NEW.rejection_reason := NULL; NEW.rejected_by := NULL; NEW.rejected_at := NULL;
      ELSIF NEW.approval_status = 'rejected' THEN
        IF NEW.rejection_reason IS NULL OR length(btrim(NEW.rejection_reason)) < 3 THEN
          RAISE EXCEPTION 'A reason is required to reject a registration';
        END IF;
        NEW.rejected_by := _uid; NEW.rejected_at := now(); NEW.active := false;
      ELSE
        RAISE EXCEPTION 'An account cannot be returned to pending approval';
      END IF;
    END IF;
  ELSE
    IF NEW.approval_status = 'approved' THEN
      NEW.approved_by := COALESCE(_uid, NEW.approved_by);
      NEW.approved_at := COALESCE(NEW.approved_at, now());
    END IF;
  END IF;
  IF NEW.approval_status <> 'approved' THEN
    IF NEW.active THEN RAISE EXCEPTION 'Only approved accounts can be activated'; END IF;
    NEW.can_verify_lab := false;
    NEW.can_self_verify := false;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_before ON public.profiles;
CREATE TRIGGER profiles_before BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profile_before();

-- Roles can only be granted to approved accounts
CREATE OR REPLACE FUNCTION public.user_role_before()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND approval_status = 'approved') THEN
    RAISE EXCEPTION 'Approve the staff registration before assigning a role';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS user_roles_before ON public.user_roles;
CREATE TRIGGER user_roles_before BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.user_role_before();

-- Admin: approve a pending/rejected registration and assign exactly one role (atomic)
CREATE OR REPLACE FUNCTION public.approve_staff_registration(_user_id uuid, _role app_role, _can_verify_lab boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _status text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can approve staff registrations';
  END IF;
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot approve your own account'; END IF;
  IF _role IS NULL THEN RAISE EXCEPTION 'Choose a role for this staff member'; END IF;
  SELECT approval_status INTO _status FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found'; END IF;
  IF _status = 'approved' THEN RAISE EXCEPTION 'This account is already approved'; END IF;
  UPDATE public.profiles
     SET approval_status = 'approved', active = true,
         can_verify_lab = (_role = 'lab_tech' AND COALESCE(_can_verify_lab, false))
   WHERE id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role) ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.audit_log (user_id, table_name, record_id, action, diff)
  VALUES (auth.uid(), 'staff_accounts', _user_id::text, 'STAFF_APPROVED', jsonb_build_object('role', _role, 'can_verify_lab', COALESCE(_can_verify_lab, false)));
END $$;

CREATE OR REPLACE FUNCTION public.reject_staff_registration(_user_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _status text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can reject staff registrations';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 3 OR length(_reason) > 300 THEN
    RAISE EXCEPTION 'Give a reason (3–300 characters)';
  END IF;
  SELECT approval_status INTO _status FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found'; END IF;
  IF _status <> 'pending_approval' THEN RAISE EXCEPTION 'Only pending registrations can be rejected'; END IF;
  UPDATE public.profiles SET approval_status = 'rejected', rejection_reason = btrim(_reason), active = false WHERE id = _user_id;
  INSERT INTO public.audit_log (user_id, table_name, record_id, action, diff)
  VALUES (auth.uid(), 'staff_accounts', _user_id::text, 'STAFF_REJECTED', jsonb_build_object('reason', btrim(_reason)));
END $$;

-- One-time first administrator, called only by the server (service role) after creating the auth user.
-- The advisory lock makes two simultaneous setup attempts unable to create two administrators.
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('bootstrap_first_admin'));
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'An administrator already exists';
  END IF;
  UPDATE public.profiles SET approval_status = 'approved', active = true, approved_by = _user_id WHERE id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin');
  INSERT INTO public.audit_log (user_id, table_name, record_id, action, diff)
  VALUES (_user_id, 'staff_accounts', _user_id::text, 'FIRST_ADMIN_CREATED', '{}'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.profile_before() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_role_before() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_staff_registration(uuid, app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_staff_registration(uuid, app_role, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.reject_staff_registration(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_staff_registration(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_first_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_any_role(uuid, app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated, service_role;
