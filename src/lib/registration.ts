import { z } from "zod";
import { passwordProblem } from "./session";

/** Staff self-registration form. The database ignores any role sent at sign-up; roles are only granted by an administrator. */
export const registrationSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(120, "Full name is too long (max 120 characters)"),
    email: z.string().trim().toLowerCase().email("Enter a valid work email address").max(254, "Email is too long"),
    password: z.string(),
    confirmPassword: z.string(),
    phone: z.string().trim().max(20, "Phone number is too long").regex(/^[+0-9 -]*$/, "Phone number may contain only digits, spaces, + and -"),
    staffNumber: z.string().trim().max(30, "Staff ID is too long (max 30 characters)").regex(/^[A-Za-z0-9/ -]*$/, "Staff ID may contain only letters, digits, spaces, / and -"),
  })
  .superRefine((v, ctx) => {
    const p = passwordProblem(v.password, v.email);
    if (p) ctx.addIssue({ code: "custom", path: ["password"], message: p });
    if (v.password !== v.confirmPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
  });

export type RegistrationInput = z.input<typeof registrationSchema>;

/** First problem per field, for showing under each input. */
export function registrationErrors(input: RegistrationInput): Partial<Record<keyof RegistrationInput, string>> {
  const r = registrationSchema.safeParse(input);
  if (r.success) return {};
  const out: Partial<Record<keyof RegistrationInput, string>> = {};
  for (const i of r.error.issues) {
    const k = i.path[0] as keyof RegistrationInput;
    if (k && !out[k]) out[k] = i.message;
  }
  return out;
}

/** Plain-language message for a sign-up error from the auth service. */
export function signUpErrorMessage(code: string | undefined, message: string): string {
  if (code === "user_already_exists" || /already registered/i.test(message)) return "An account with this email already exists. Sign in, or use “Forgot password” if you cannot remember it.";
  if (code === "weak_password" || /weak|pwned|leaked/i.test(message)) return "This password is too easy to guess or has appeared in a data leak. Choose a different one.";
  if (code === "over_email_send_rate_limit" || /rate limit/i.test(message)) return "Too many emails were sent recently. Wait a while and try again.";
  if (code === "signup_disabled") return "Registration is currently closed. Contact the clinic administrator.";
  return "Registration failed. Check your connection and try again.";
}
