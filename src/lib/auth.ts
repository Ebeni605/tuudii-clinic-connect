import { queryOptions, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { accountState, canAccess, type AccountState, type AppRole, type ApprovalStatus, type Area } from "./workflow";

export type Staff = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  staffNumber: string;
  approvalStatus: ApprovalStatus;
  /** Why this account can or cannot use the system. */
  state: AccountState;
  /** Roles stored for the account (effective only when approved and active). */
  assignedRoles: AppRole[];
  active: boolean;
  canSelfVerify: boolean;
  /** Explicit permission to verify lab results (admin-set, enforced by the database). */
  canVerifyLab: boolean;
  roles: AppRole[];
};

async function fetchStaff(): Promise<Staff | null> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const [{ data: profile, error: pe }, { data: roles, error: re }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  if (pe || re) throw new Error("Could not load your staff profile");
  const approvalStatus = (profile?.approval_status ?? "pending_approval") as ApprovalStatus;
  // Pending, rejected or disabled accounts keep no effective roles (the database enforces the same rule)
  const active = (profile?.active ?? false) && approvalStatus === "approved";
  const assignedRoles = (roles ?? []).map((r) => r.role as AppRole);
  const effective = active ? assignedRoles : [];
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name || user.email || "",
    phone: profile?.phone ?? "",
    staffNumber: profile?.staff_number ?? "",
    approvalStatus,
    state: accountState({ approvalStatus, active: profile?.active ?? false, roles: assignedRoles }),
    assignedRoles,
    active,
    canSelfVerify: profile?.can_self_verify ?? false,
    canVerifyLab: active && effective.includes("lab_tech") && (profile?.can_verify_lab ?? false),
    roles: effective,
  };
}

export const staffQuery = queryOptions({ queryKey: ["me"], queryFn: fetchStaff, staleTime: 60_000 });

export function useStaff() {
  return useQuery(staffQuery);
}

/** Route guard: send staff without the right role to the no-access page before the page loads. */
export function requireArea(area: Area) {
  return async ({ context, location }: { context: { queryClient: QueryClient }; location: { href: string } }) => {
    const me = await context.queryClient.ensureQueryData(staffQuery);
    if (!me) throw redirect({ to: "/auth", search: { redirect: location.href } });
    if (!canAccess(me.roles, area)) throw redirect({ to: "/no-access" });
  };
}

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}
