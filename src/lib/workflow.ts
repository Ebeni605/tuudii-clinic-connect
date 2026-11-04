// Shared clinical workflow rules. The database triggers enforce the same rules;
// this module drives which buttons the UI shows.

export type AppRole = "admin" | "receptionist" | "clinician" | "lab_tech";

export type VisitStatus =
  | "waiting"
  | "in_consultation"
  | "awaiting_lab"
  | "ready_for_review"
  | "completed"
  | "cancelled"
  | "no_show";

export type LabItemStatus =
  | "requested"
  | "collected"
  | "received"
  | "processing"
  | "entered"
  | "awaiting_verification"
  | "verified"
  | "rejected" // specimen rejected — waiting for recollection
  | "cancelled";

export const VISIT_TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  waiting: ["in_consultation", "cancelled", "no_show"],
  in_consultation: ["awaiting_lab", "completed", "waiting"],
  // ready_for_review is set by the database when every test of the visit is verified or rejected
  awaiting_lab: ["in_consultation", "ready_for_review", "completed"],
  ready_for_review: ["in_consultation", "awaiting_lab", "completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

/** Visits still in today's queue (one per patient per day). */
export const ACTIVE_VISIT_STATUSES: VisitStatus[] = ["waiting", "in_consultation", "awaiting_lab", "ready_for_review"];
/** Visits where the consultation note can be written. */
export const OPEN_ENCOUNTER_STATUSES: VisitStatus[] = ["in_consultation", "awaiting_lab", "ready_for_review"];

/** Per-test laboratory workflow. Mirrors DB trigger lab_item_before. */
export const LAB_TRANSITIONS: Record<LabItemStatus, LabItemStatus[]> = {
  requested: ["collected", "cancelled"],
  collected: ["received", "rejected", "cancelled"],
  received: ["processing", "rejected", "cancelled"],
  processing: ["entered", "rejected", "cancelled"],
  entered: ["awaiting_verification", "cancelled"],
  awaiting_verification: ["verified", "entered"],
  rejected: ["collected", "cancelled"], // recollection with a new specimen
  verified: ["entered"], // only through a documented correction (lab_result_amendments)
  cancelled: [],
};

/** A test is finished for OPD once verified or cancelled (rejected specimens wait for recollection). */
export const LAB_FINAL_STATUSES: LabItemStatus[] = ["verified", "cancelled"];
export const isLabFinal = (s: string) => (LAB_FINAL_STATUSES as string[]).includes(s);

export function canVisitMove(from: VisitStatus, to: VisitStatus) {
  return VISIT_TRANSITIONS[from].includes(to);
}

export function canLabMove(from: LabItemStatus, to: LabItemStatus) {
  return LAB_TRANSITIONS[from].includes(to);
}

/** A visit can be completed only once its consultation note is signed (DB trigger visit_before). */
export function canCompleteVisit(status: VisitStatus, consultStatus: "draft" | "signed" | null | undefined) {
  return canVisitMove(status, "completed") && consultStatus === "signed";
}

// ---------- Vital signs ----------

export type VitalsInput = Partial<Record<
  "bp_systolic" | "bp_diastolic" | "pulse" | "temperature" | "resp_rate" | "spo2" | "weight_kg" | "height_cm" | "blood_glucose",
  number | null
>>;

/** Plausible entry ranges (typing-error checks, not clinical judgement). Mirrors DB trigger vitals_before. */
export const VITAL_RANGES = {
  bp_systolic: [50, 260], bp_diastolic: [30, 160], pulse: [20, 250], resp_rate: [4, 80],
  temperature: [30, 45], spo2: [50, 100], weight_kg: [0.5, 300], height_cm: [30, 250], blood_glucose: [20, 800],
} as const;

export const VITAL_LABELS: Record<keyof typeof VITAL_RANGES, string> = {
  bp_systolic: "Systolic BP", bp_diastolic: "Diastolic BP", pulse: "Pulse rate", resp_rate: "Respiratory rate",
  temperature: "Temperature", spo2: "SpO₂", weight_kg: "Weight", height_cm: "Height", blood_glucose: "Blood glucose",
};

export function validateVitals(v: VitalsInput): string[] {
  const errors: string[] = [];
  const has = (k: keyof VitalsInput) => v[k] != null && !Number.isNaN(v[k]);
  if (!(Object.keys(VITAL_RANGES) as (keyof VitalsInput)[]).some(has)) errors.push("Enter at least one measurement");
  if (has("bp_systolic") !== has("bp_diastolic")) errors.push("Enter both systolic and diastolic blood pressure");
  for (const k of Object.keys(VITAL_RANGES) as (keyof typeof VITAL_RANGES)[]) {
    const val = v[k];
    if (val == null || Number.isNaN(val)) continue;
    const [lo, hi] = VITAL_RANGES[k];
    if (val < lo || val > hi) errors.push(`${VITAL_LABELS[k]} must be between ${lo} and ${hi}`);
  }
  if (has("bp_systolic") && has("bp_diastolic") && v.bp_diastolic! >= v.bp_systolic!) errors.push("Diastolic BP must be lower than systolic BP");
  return errors;
}

/** BMI (kg/m²) rounded to 1 decimal, only from valid height and weight. Mirrors the generated column vital_signs.bmi. */
export function bmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (weightKg == null || heightCm == null || !(weightKg > 0) || !(heightCm >= 30)) return null;
  return Math.round((weightKg / ((heightCm / 100) ** 2)) * 10) / 10;
}

// ---------- Signing the consultation note ----------

/** What is still missing before a note can be signed. Mirrors DB trigger consult_before. */
export function signingProblems(c: {
  serviceKey: string;
  chiefComplaint: string | null | undefined;
  treatmentNotes: string | null | undefined;
  diagnosisCount: number;
  labOrderCount: number;
  templateData: Record<string, unknown>;
}): string[] {
  const blank = (s: unknown) => typeof s !== "string" || s.trim() === "";
  const p: string[] = [];
  if (blank(c.chiefComplaint)) p.push(c.serviceKey === "laboratory" ? "clinical indication / complaint" : "chief complaint");
  if (c.serviceKey === "laboratory") {
    if (c.labOrderCount === 0) p.push("at least one laboratory order");
  } else {
    if (c.diagnosisCount === 0) p.push("at least one diagnosis");
    if (blank(c.treatmentNotes)) p.push("treatment / management plan");
  }
  if (c.serviceKey === "minor_surgery" && c.templateData["consent"] !== true) p.push("documented consent");
  if (c.serviceKey === "infant_circumcision") {
    if (c.templateData["guardian_consent"] !== true) p.push("documented guardian consent");
    if (blank(c.templateData["guardian_name"])) p.push("guardian name");
  }
  return p;
}

// ---------- Antenatal estimates (shown for clinician verification only) ----------

/** EDD by Naegele's rule (LMP + 280 days) and gestational age on `onDate`. Null when LMP is in the future or > 44 weeks ago. */
export function ancEstimates(lmp: string, onDate: string): { edd: string; weeks: number; days: number } | null {
  const l = Date.parse(`${lmp}T00:00:00Z`);
  const t = Date.parse(`${onDate}T00:00:00Z`);
  if (Number.isNaN(l) || Number.isNaN(t)) return null;
  const totalDays = Math.round((t - l) / 86_400_000);
  if (totalDays < 0 || totalDays > 44 * 7) return null;
  const edd = new Date(l + 280 * 86_400_000).toISOString().slice(0, 10);
  return { edd, weeks: Math.floor(totalDays / 7), days: totalDays % 7 };
}

/**
 * Verification needs the explicit permission (profiles.can_verify_lab, set by admin) and a
 * different person from whoever last entered the result, unless allowed to self-verify.
 */
export function canVerify(opts: {
  enteredBy: string | null | undefined;
  userId: string;
  canVerifyLab: boolean;
  canSelfVerify: boolean;
}) {
  if (!opts.canVerifyLab || !opts.enteredBy) return false;
  return opts.enteredBy !== opts.userId || opts.canSelfVerify;
}

/** Clinicians only see lab results once verified. */
export function isResultVisibleToClinician(status: LabItemStatus) {
  return status === "verified";
}

export function abnormalFlag(
  value: string,
  low: number | null,
  high: number | null,
): "L" | "H" | null {
  const v = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(v)) return null; // "<0.5" or text: no automatic flag
  const n = Number(v);
  if (low != null && n < low) return "L";
  if (high != null && n > high) return "H";
  return null;
}

export type LabResultType = "numeric" | "qualitative" | "text" | "microscopy";
export type LabTestConfig = {
  name: string;
  result_type: string;
  ref_low: number | null;
  ref_high: number | null;
  result_options: string[] | null;
  abnormal_options: string[] | null;
};

/** Problem with an entered value, or null when it can be saved. Mirrors DB trigger lab_result_before. */
export function labValueProblem(t: LabTestConfig, value: string): string | null {
  const v = value.trim();
  if (!v) return "Enter a result";
  if (t.result_type === "numeric" && !/^[<>]?-?\d+(\.\d+)?$/.test(v)) return `${t.name} needs a number (e.g. 12.5, or <0.5)`;
  if (t.result_type === "qualitative" && t.result_options?.length && !t.result_options.includes(v)) return `Choose one of: ${t.result_options.join(", ")}`;
  return null;
}

/**
 * Abnormal indicator the database will store: numeric → L/H from the configured range,
 * qualitative → A when the answer is configured as abnormal, text/microscopy → technician's own A mark.
 */
export function labResultFlag(t: LabTestConfig, value: string, manualAbnormal = false): "L" | "H" | "A" | null {
  if (t.result_type === "numeric") return abnormalFlag(value, t.ref_low, t.ref_high);
  if (t.result_type === "qualitative") return t.abnormal_options?.includes(value.trim()) ? "A" : null;
  return manualAbnormal ? "A" : null;
}

/** Reference shown next to a result; never invented — "Not configured" when the lab has not set one. */
export function referenceText(r: { ref_low: number | null; ref_high: number | null; ref_text: string | null; unit?: string | null }) {
  if (r.ref_low != null && r.ref_high != null) return `${r.ref_low} – ${r.ref_high}${r.unit ? ` ${r.unit}` : ""}`;
  if (r.ref_low != null) return `≥ ${r.ref_low}${r.unit ? ` ${r.unit}` : ""}`;
  if (r.ref_high != null) return `≤ ${r.ref_high}${r.unit ? ` ${r.unit}` : ""}`;
  return r.ref_text || "";
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  receptionist: "Receptionist",
  clinician: "OPD Clinician",
  lab_tech: "Laboratory Technician",
};

export type Area = "dashboard" | "reception" | "opd" | "lab" | "admin" | "patients" | "results" | "billing";

export const AREA_ROLES: Record<Area, AppRole[]> = {
  dashboard: ["admin", "receptionist", "clinician", "lab_tech"],
  patients: ["admin", "receptionist", "clinician", "lab_tech"],
  reception: ["admin", "receptionist"],
  opd: ["admin", "clinician"],
  lab: ["admin", "lab_tech"],
  results: ["admin", "clinician", "lab_tech"],
  admin: ["admin"],
  // Optional billing is an administrative feature used by reception, not a department
  billing: ["admin", "receptionist"],
};

export function canAccess(roles: AppRole[], area: Area) {
  return roles.some((r) => AREA_ROLES[area].includes(r));
}

/** Staff registration approval (mirrors profiles.approval_status and the profile_before trigger). */
export type ApprovalStatus = "pending_approval" | "approved" | "rejected";
export const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  pending_approval: "Awaiting approval",
  approved: "Approved",
  rejected: "Not approved",
};

/** Why a signed-in account may or may not use the system. */
export type AccountState = "ok" | "pending" | "rejected" | "disabled" | "no_role";
export function accountState(a: { approvalStatus: ApprovalStatus; active: boolean; roles: AppRole[] }): AccountState {
  if (a.approvalStatus === "pending_approval") return "pending";
  if (a.approvalStatus === "rejected") return "rejected";
  if (!a.active) return "disabled";
  if (a.roles.length === 0) return "no_role";
  return "ok";
}

export const ACCOUNT_STATE_MESSAGES: Record<Exclude<AccountState, "ok">, { title: string; text: string }> = {
  pending: { title: "Account awaiting approval", text: "Your registration was received. The clinic administrator must approve it and assign your role before you can use the system." },
  rejected: { title: "Registration not approved", text: "The administrator did not approve this registration. Contact the clinic administrator if you think this is a mistake." },
  disabled: { title: "Account deactivated", text: "Your account has been deactivated. Contact the clinic administrator." },
  no_role: { title: "No role assigned yet", text: "Your account is approved but has no role. Ask the administrator to assign one." },
};

/** Department home a staff member lands on after signing in: one department role → that department; admin or several roles → main dashboard. */
export function homeFor(roles: AppRole[]): "/dashboard" | "/reception" | "/opd" | "/lab" {
  if (roles.includes("admin") || roles.length !== 1) return "/dashboard";
  const only = roles[0];
  if (only === "receptionist") return "/reception";
  if (only === "clinician") return "/opd";
  if (only === "lab_tech") return "/lab";
  return "/dashboard";
}

export function ageFromDob(dob: string | null, now = new Date(), estimated = false): string | null {
  if (!dob) return null;
  if (estimated) return `~${ageFromDob(dob, now)}`;
  const d = new Date(dob);
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  if (age < 1) {
    const months =
      (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
    return `${Math.max(months, 0)} mo`;
  }
  return `${age} yr`;
}
