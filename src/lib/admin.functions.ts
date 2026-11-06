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
    const { error: re } = await context.supabase.from("user_roles").insert([...new Set(data.roles)].map((r) => ({ user_id: uid, role: r })));
    if (re) throw new Error(re.message);
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
