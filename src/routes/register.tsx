import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClinicLogo } from "@/components/ClinicBrand";
import { supabase } from "@/integrations/supabase/client";
import { registrationErrors, signUpErrorMessage, type RegistrationInput } from "@/lib/registration";
import { PASSWORD_HINT } from "@/lib/session";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Staff Registration — Two D Medium Clinic" },
      { name: "description", content: "Register a staff account. The administrator approves it and assigns your role." },
      { property: "og:title", content: "Staff Registration — Two D Medium Clinic" },
      { property: "og:description", content: "New staff registration with administrator approval." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Register,
});

const FIELDS: { k: keyof RegistrationInput; label: string; type?: string; ac?: string }[] = [
  { k: "fullName", label: "Full name *", ac: "name" },
  { k: "email", label: "Work email address *", type: "email", ac: "email" },
  { k: "password", label: "Password *", type: "password", ac: "new-password" },
  { k: "confirmPassword", label: "Confirm password *", type: "password", ac: "new-password" },
  { k: "phone", label: "Phone (optional)", ac: "tel" },
  { k: "staffNumber", label: "Staff ID number (optional)" },
];

function Register() {
  const [f, setF] = useState<RegistrationInput>({ fullName: "", email: "", password: "", confirmPassword: "", phone: "", staffNumber: "" });
  const [errs, setErrs] = useState<Partial<Record<keyof RegistrationInput, string>>>({});
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const er = registrationErrors(f); setErrs(er); setMsg("");
    if (Object.keys(er).length) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim().toLowerCase(), password: f.password,
      options: { emailRedirectTo: `${window.location.origin}/auth`, data: { full_name: f.fullName.trim(), phone: f.phone.trim(), staff_number: f.staffNumber.trim() } },
    });
    setBusy(false);
    if (error) { setMsg(signUpErrorMessage(error.code, error.message)); return; }
    if (data.user && data.user.identities?.length === 0) { setMsg(signUpErrorMessage("user_already_exists", "")); return; }
    if (data.session) await supabase.auth.signOut();
    setDone(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-secondary to-background px-4 py-10">
      <Card className="w-full max-w-md border-t-4 border-t-primary shadow-xl">
        <CardHeader className="items-center text-center">
          <ClinicLogo className="h-20 w-20" />
          <CardTitle className="pt-2 text-xl">Staff registration</CardTitle>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-3 text-sm" role="status">
              <p className="rounded-md bg-secondary p-3">Registration received. Open the confirmation link sent to your email, then wait for the administrator to approve your account and assign your role.</p>
              <Link to="/auth" className="font-medium text-primary hover:underline">Go to log in</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3" noValidate>
              {FIELDS.map((x) => (
                <div key={x.k} className="space-y-1">
                  <Label htmlFor={x.k}>{x.label}</Label>
                  {x.type === "password" ? <PasswordInput id={x.k} autoComplete={x.ac} value={f[x.k]} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} aria-invalid={!!errs[x.k]} /> : <Input id={x.k} type={x.type ?? "text"} autoComplete={x.ac} value={f[x.k]} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} aria-invalid={!!errs[x.k]} />}
                  {x.k === "password" && <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>}
                  {errs[x.k] && <p className="text-xs text-destructive">{errs[x.k]}</p>}
                </div>
              ))}
              {msg && <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive" role="alert">{msg}</p>}
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Registering…" : "Register"}</Button>
              <p className="text-center text-xs text-muted-foreground">Already registered? <Link to="/auth" className="text-primary hover:underline">Log in</Link></p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
