import { createServerFn } from "@tanstack/react-start";
import { passwordProblem } from "@/lib/session";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "./workflow";

// Server-side validation (the browser form validates too, but never trust the browser)
const role = z.enum(["admin", "receptionist", "clinician", "lab_tech"]);
const password = z.string().superRefine((v, ctx) => {
  const problem = passwordProblem(v);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});
const email = z.string().trim().toLowerCase().email("Valid email required").max(254);
const fullName = z.string().trim().min(1, "Full name required").max(120);
const phone = z.string().trim().max(20).regex(/^[+0-9 -]*$/, "Phone number is not valid").optional();

function parse<T>(schema: z.ZodType<T>, d: unknown): T {
  const r = schema.safeParse(d);
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Invalid input");
  return r.data;
}

/** Records staff-account events that happen outside the database (auth accounts, passwords). Never stores the password. */
async function auditAccountEvent(byUserId: string | null, targetUserId: string, action: string, details: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("audit_log").insert({ user_id: byUserId, table_name: "staff_accounts", record_id: targetUserId, action, diff: details as never });
}

/** One-time setup: create the first administrator while no admin exists. */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; fullName: string }) =>
    parse(z.object({ email, password, fullName }), d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An administrator already exists. Ask them to create your account.");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create user");
    await supabaseAdmin.from("profiles").upsert({ id: created.user.id, full_name: data.fullName });
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
    await auditAccountEvent(created.user.id, created.user.id, "FIRST_ADMIN_CREATED", { email: data.email });
    return { ok: true };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Only administrators can manage staff");
}

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; fullName: string; phone?: string; roles: AppRole[] }) =>
    parse(z.object({ email, password, fullName, phone, roles: z.array(role).min(1, "Choose at least one role").max(4) }), d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create user");
    const uid = created.user.id;
    // Profile row may already exist from the sign-up trigger; write it as the admin so the audit log names them
    await supabaseAdmin.from("profiles").upsert({ id: uid, full_name: data.fullName, phone: data.phone || null });
    // Admin-created accounts are approved immediately with their first role (same RPC as registration approval)
    const [first, ...rest] = [...new Set(data.roles)];
    const { error: ae } = await context.supabase.rpc("approve_staff_registration", { _user_id: uid, _role: first });
    if (ae) throw new Error(ae.message);
    if (rest.length) {
      const { error: re } = await context.supabase.from("user_roles").insert(rest.map((r) => ({ user_id: uid, role: r })));
      if (re) throw new Error(re.message);
    }
    await auditAccountEvent(context.userId, uid, "STAFF_CREATED", { email: data.email, roles: data.roles });
    return { ok: true };
  });

export const listStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: users }, { data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 500 }),
      supabaseAdmin.from("profiles").select("*"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    return (users?.users ?? []).map((u) => {
      const p = profiles?.find((x) => x.id === u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        fullName: p?.full_name ?? "",
        phone: p?.phone ?? "",
        active: p?.active ?? true,
        canSelfVerify: p?.can_self_verify ?? false,
        canVerifyLab: p?.can_verify_lab ?? false,
        roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as AppRole),
        lastSignIn: u.last_sign_in_at ?? null,
        approvalStatus: (p?.approval_status ?? "pending_approval") as "pending_approval" | "approved" | "rejected",
        staffNumber: p?.staff_number ?? "",
        rejectionReason: p?.rejection_reason ?? "",
        createdAt: p?.created_at ?? u.created_at,
      };
    });
  });

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; roles: AppRole[]; active: boolean; canSelfVerify: boolean; canVerifyLab?: boolean; newPassword?: string }) =>
    parse(z.object({
      userId: z.string().uuid(),
      roles: z.array(role).max(4),
      active: z.boolean(),
      canSelfVerify: z.boolean(),
      canVerifyLab: z.boolean().optional(),
      newPassword: password.optional(),
    }), d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && (!data.roles.includes("admin") || !data.active)) {
      throw new Error("You cannot remove your own administrator access");
    }
    // Profile flags and roles are written with the administrator's own session, so RLS applies
    // and the audit log records which administrator changed which permission.
    const db = context.supabase;
    const { error: pe } = await db.from("profiles")
      .update({ active: data.active, can_self_verify: data.canSelfVerify, can_verify_lab: !!data.canVerifyLab })
      .eq("id", data.userId);
    if (pe) throw new Error(pe.message);
    const { data: current, error: ce } = await db.from("user_roles").select("role").eq("user_id", data.userId);
    if (ce) throw new Error(ce.message);
    type Role = "admin" | "receptionist" | "clinician" | "lab_tech";
    const have = new Set<Role>((current ?? []).map((r) => r.role as Role));
    const want = new Set<Role>(data.roles as Role[]);
    const remove = [...have].filter((r) => !want.has(r));
    const add = [...want].filter((r) => !have.has(r));
    if (remove.length) {
      const { error } = await db.from("user_roles").delete().eq("user_id", data.userId).in("role", remove);
      if (error) throw new Error(error.message);
    }
    if (add.length) {
      const { error } = await db.from("user_roles").insert(add.map((r) => ({ user_id: data.userId, role: r })));
      if (error) throw new Error(error.message);
    }
    if (data.newPassword) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.newPassword });
      if (error) throw new Error(error.message);
      await auditAccountEvent(context.userId, data.userId, "PASSWORD_RESET_BY_ADMIN", {});
    }
    return { ok: true };
  });

/** Reviewable list of every patient record and staff account, for the pre-go-live test-data cleanup. */
export const listSyntheticData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: patients }, { data: users }, { data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("patients").select("id, mrn, first_name, middle_name, last_name, created_at").order("created_at"),
      supabaseAdmin.auth.admin.listUsers({ perPage: 500 }),
      supabaseAdmin.from("profiles").select("id, full_name"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    return {
      patients: (patients ?? []).map((p) => ({
        id: p.id,
        mrn: p.mrn,
        name: [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" "),
        createdAt: p.created_at,
      })),
      users: (users?.users ?? []).map((u) => ({
        id: u.id,
        email: u.email ?? "",
        fullName: profiles?.find((p) => p.id === u.id)?.full_name ?? "",
        roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as AppRole),
        isYou: u.id === context.userId,
        createdAt: u.created_at,
      })),
    };
  });

const cleanupInput = z.object({
  patientIds: z.array(z.string().uuid()).max(1000),
  userIds: z.array(z.string().uuid()).max(200),
  confirm: z.literal("DELETE TEST DATA"),
});

/**
 * Removes the administrator-approved test patients (with every dependent clinical,
 * laboratory and billing record, in safe relational order) and test staff accounts.
 * The calling administrator can never be removed. Every step is recorded in the audit log.
 */
export const cleanupSyntheticData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => parse(cleanupInput, d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userIds.includes(context.userId)) throw new Error("You cannot remove your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const del = async (table: string, column: string, ids: string[]) => {
      if (!ids.length) return;
      // Table names are fixed in the calls below; the generated client types only accept literals
      const { error } = await supabaseAdmin.from(table as "patients").delete().in(column, ids);
      if (error) throw new Error(`Cleanup failed at ${table}: ${error.message}`);
    };

    const pids = data.patientIds;
    if (pids.length) {
      const { data: reqs } = await supabaseAdmin.from("lab_requests").select("id").in("patient_id", pids);
      const reqIds = (reqs ?? []).map((r) => r.id);
      const { data: items } = reqIds.length
        ? await supabaseAdmin.from("lab_request_items").select("id").in("lab_request_id", reqIds)
        : { data: [] };
      const itemIds = (items ?? []).map((i) => i.id);
      const { data: invs } = await supabaseAdmin.from("invoices").select("id").in("patient_id", pids);
      const invIds = (invs ?? []).map((i) => i.id);

      await del("lab_results", "item_id", itemIds);
      await del("lab_result_amendments", "item_id", itemIds);
      await del("lab_specimen_tests", "item_id", itemIds);
      await del("lab_request_items", "lab_request_id", reqIds);
      await del("lab_specimens", "lab_request_id", reqIds);
      await del("lab_requests", "patient_id", pids);
      await del("consultation_amendments", "patient_id", pids);
      await del("medication_instructions", "patient_id", pids);
      await del("diagnoses", "patient_id", pids);
      await del("consultations", "patient_id", pids);
      await del("vital_signs", "patient_id", pids);
      await del("billing_adjustments", "invoice_id", invIds);
      await del("payments", "invoice_id", invIds);
      await del("invoice_items", "invoice_id", invIds);
      await del("invoices", "patient_id", pids);
      await del("visits", "patient_id", pids);
      await del("appointments", "patient_id", pids);
      await del("patients", "id", pids);
    }

    for (const uid of data.userIds) {
      await del("user_roles", "user_id", [uid]);
      await del("profiles", "id", [uid]);
      const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
      if (error) throw new Error(`Could not remove account: ${error.message}`);
      await auditAccountEvent(context.userId, uid, "TEST_ACCOUNT_REMOVED", {});
    }

    await auditAccountEvent(context.userId, context.userId, "TEST_DATA_CLEANUP", {
      patientsRemoved: pids.length,
      accountsRemoved: data.userIds.length,
    });
    return { ok: true, patientsRemoved: pids.length, accountsRemoved: data.userIds.length };
  });
