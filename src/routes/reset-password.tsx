import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { ClinicLogo } from "@/components/ClinicBrand";
import { supabase } from "@/integrations/supabase/client";
import { PASSWORD_HINT, passwordProblem } from "@/lib/session";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a New Password — Two D Medium Clinic" },
      { name: "description", content: "Choose a new password for your clinic staff account." },
      { property: "og:title", content: "Set a New Password — Two D Medium Clinic" },
      { property: "og:description", content: "Staff password reset." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery") || new URLSearchParams(window.location.search).has("code");
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) { setEmail(session.user.email ?? ""); setReady("ok"); }
    });
    const t = window.setTimeout(async () => {
      const { data: s } = await supabase.auth.getSession();
      if (s.session && isRecovery) { setEmail(s.session.user.email ?? ""); setReady("ok"); }
      else setReady((r) => (r === "ok" ? r : "invalid"));
    }, 1500);
    return () => { data.subscription.unsubscribe(); window.clearTimeout(t); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = passwordProblem(pw, email);
    if (p) { toast.error(p); return; }
    if (pw !== pw2) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await supabase.auth.signOut();
    toast.success("Password changed. Sign in with your new password.");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-secondary to-background px-4">
      <Card className="w-full max-w-md border-t-4 border-t-primary shadow-xl">
        <CardHeader className="items-center text-center">
          <ClinicLogo className="h-20 w-20" />
          <CardTitle className="pt-2 text-xl">Set a new password</CardTitle>
        </CardHeader>
        <CardContent>
          {ready === "checking" && <p className="text-center text-sm text-muted-foreground" role="status">Checking your reset link…</p>}
          {ready === "invalid" && (
            <div className="space-y-3 text-center text-sm">
              <p>This reset link is invalid or has expired.</p>
              <Link to="/auth" className="font-medium text-primary hover:underline">Back to sign in</Link>
            </div>
          )}
          {ready === "ok" && (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-muted-foreground">{email}</p>
              <div className="space-y-1.5"><Label htmlFor="np">New password</Label><PasswordInput id="np" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required /><p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p></div>
              <div className="space-y-1.5"><Label htmlFor="np2">Repeat new password</Label><PasswordInput id="np2" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save new password"}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
