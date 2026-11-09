import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { requireArea, useStaff } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/workflow";
import { PASSWORD_HINT, passwordProblem } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/profile")({
  beforeLoad: requireArea("dashboard"),
  head: () => ({ meta: [{ title: "My Profile — Two D Medium Clinic" }] }),
  component: Profile,
});

function Profile() {
  const { data: me } = useStaff();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState<"" | "profile" | "pw">("");

  useEffect(() => {
    if (me) { setName(me.fullName); setPhone(me.phone); }
  }, [me]);
  if (!me) return null;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy("profile");
    const { error } = await supabase.rpc("update_my_profile", { _full_name: name, _phone: phone });
    setBusy("");
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(pw, me?.email);
    if (problem) { toast.error(problem); return; }
    if (pw !== pw2) { toast.error("New passwords do not match"); return; }
    setBusy("pw");
    // Re-check the current password before changing it
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: me!.email, password: current });
    if (authErr) { setBusy(""); toast.error("Current password is incorrect"); return; }
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: current } as never);
    setBusy("");
    if (error) { toast.error(error.message); return; }
    toast.success("Password changed");
    setCurrent(""); setPw(""); setPw2("");
  }

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="My profile" subtitle={me.email} />
      <Card>
        <CardHeader><CardTitle className="text-base">Staff details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="pn">Full name</Label><Input id="pn" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} /></div>
            <div className="space-y-1.5"><Label htmlFor="pp">Phone</Label><Input id="pp" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} inputMode="tel" /></div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-2">
                {me.roles.map((r) => <span key={r} className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">{ROLE_LABELS[r]}</span>)}
              </div>
              <p className="text-xs text-muted-foreground">Only the administrator can change roles.</p>
            </div>
            <div><Button type="submit" disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save details"}</Button></div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Change password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="cp">Current password</Label><PasswordInput id="cp" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="np">New password</Label><PasswordInput id="np" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required /><p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p></div>
            <div className="space-y-1.5"><Label htmlFor="np2">Repeat new password</Label><PasswordInput id="np2" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></div>
            <div><Button type="submit" disabled={busy === "pw"}>{busy === "pw" ? "Changing…" : "Change password"}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
