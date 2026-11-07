import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadError, PageHeader, PageLoading, RequireArea } from "@/components/AppShell";
import { requireArea } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cleanupSyntheticData, listSyntheticData } from "@/lib/admin.functions";
import { fmtDateTime } from "@/lib/opd-queries";

export const Route = createFileRoute("/_authenticated/admin/deployment")({
  beforeLoad: requireArea("admin"),
  head: () => ({ meta: [{ title: "Go-live Checklist — Two D Medium Clinic" }, { name: "description", content: "Deployment readiness gates and test-data cleanup before real patient use." }] }),
  component: () => <RequireArea area="admin"><Deployment /></RequireArea>,
});

const GATES = [
  { key: "lab_ranges", label: "Laboratory test units and reference ranges approved" },
  { key: "bf_confirmed", label: "B/F and BF meanings confirmed, or clearly excluded from active testing" },
  { key: "price_list", label: "Official clinic price list approved, or billing remains switched off" },
  { key: "backup_created", label: "Backup successfully created and recorded" },
  { key: "restore_tested", label: "Backup restoration tested in a separate environment" },
  { key: "cleanup_done", label: "Test patients and test accounts reviewed and removed" },
  { key: "roles_verified", label: "Four legitimate staff roles verified" },
  { key: "workflow_tested", label: "Reception → OPD → Laboratory workflow tested" },
  { key: "security_reviewed", label: "Security and database permissions reviewed" },
  { key: "final_approval", label: "Final administrator approval for real patient use" },
] as const;

type GateRow = { gate_key: string; done: boolean; done_by: string | null; done_at: string | null; note: string | null };

function Deployment() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["deployment_checklist"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deployment_checklist").select("*");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.gate_key, r])) as Record<string, GateRow>;
    },
  });
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function toggle(key: string, done: boolean) {
    const { data: u } = await supabase.auth.getUser();
    const row = { gate_key: key, done, done_by: done ? (u.user?.id ?? null) : null, done_at: done ? new Date().toISOString() : null, note: notes[key]?.trim() || null };
    const { error } = await supabase.from("deployment_checklist").upsert(row);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["deployment_checklist"] });
  }

  if (q.isLoading) return <PageLoading />;
  if (q.error) return <LoadError message={(q.error as Error).message} onRetry={() => q.refetch()} />;

  const rows = q.data ?? {};
  const doneCount = GATES.filter((g) => rows[g.key]?.done).length;
  const allButFinal = GATES.slice(0, -1).every((g) => rows[g.key]?.done);
  const ready = doneCount === GATES.length;

  return (
    <div className="space-y-4">
      <PageHeader title="Go-live checklist" subtitle="All ten gates must be completed before the system is used with real patients." />
      <div className={`rounded-md border p-3 text-sm font-semibold ${ready ? "border-success/50 bg-success/10 text-success-foreground" : "border-warning/50 bg-warning/10 text-warning-foreground"}`}>
        {ready ? "ALL GATES COMPLETE — approved for real patient use." : `NOT READY FOR REAL PATIENTS — ${doneCount} of ${GATES.length} gates complete.`}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Required gates</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {GATES.map((g, i) => {
            const r = rows[g.key];
            const isFinal = g.key === "final_approval";
            const blocked = isFinal && !allButFinal;
            return (
              <div key={g.key} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-start gap-3">
                  <Checkbox
                    id={`gate-${g.key}`}
                    checked={!!r?.done}
                    disabled={blocked}
                    onCheckedChange={(v) => toggle(g.key, v === true)}
                    aria-label={g.label}
                  />
                  <div>
                    <Label htmlFor={`gate-${g.key}`} className="font-medium">{i + 1}. {g.label}</Label>
                    {r?.done && r.done_at && <p className="text-xs text-muted-foreground">Confirmed {fmtDateTime(r.done_at)}</p>}
                    {blocked && <p className="text-xs text-warning-foreground">Complete all other gates first.</p>}
                  </div>
                </div>
                <Input
                  className="sm:w-64"
                  placeholder="Note (optional)"
                  aria-label={`Note for gate ${i + 1}`}
                  value={notes[g.key] ?? r?.note ?? ""}
                  onChange={(e) => setNotes({ ...notes, [g.key]: e.target.value })}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Cleanup />
    </div>
  );
}

function Cleanup() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["synthetic_data"], queryFn: () => listSyntheticData() });
  const [patients, setPatients] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState("");

  const run = useMutation({
    mutationFn: () => cleanupSyntheticData({ data: { patientIds: [...patients], userIds: [...users], confirm } }),
    onSuccess: (r) => {
      toast.success(`Removed ${r.patientsRemoved} test patient(s) and ${r.accountsRemoved} test account(s)`);
      setPatients(new Set()); setUsers(new Set()); setConfirm("");
      qc.invalidateQueries({ queryKey: ["synthetic_data"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (q.isLoading) return <PageLoading />;
  if (q.error) return <LoadError message={(q.error as Error).message} onRetry={() => q.refetch()} />;
  const d = q.data;
  const total = patients.size + users.size;
  const canRun = total > 0 && confirm === "DELETE TEST DATA" && !run.isPending;

  const toggleIn = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    apply(next);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Test-data cleanup</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Every record below was created during development with fictional data. Review the lists, tick only what is test data,
          then confirm. Removal is permanent and recorded in the audit log. Your own account and any record you leave unticked are kept.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Patient records ({d?.patients.length ?? 0})</h3>
              <Button size="sm" variant="outline" onClick={() => setPatients(new Set(d?.patients.map((p) => p.id) ?? []))}>Select all</Button>
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {d?.patients.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No patient records.</p>}
              {d?.patients.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-secondary/60">
                  <Checkbox checked={patients.has(p.id)} onCheckedChange={() => toggleIn(patients, p.id, setPatients)} aria-label={`Remove patient ${p.name}`} />
                  <span className="font-mono text-xs text-muted-foreground">{p.mrn}</span>
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Staff accounts ({d?.users.length ?? 0})</h3>
              <Button size="sm" variant="outline" onClick={() => setUsers(new Set((d?.users ?? []).filter((u) => !u.isYou).map((u) => u.id)))}>Select all (except you)</Button>
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {d?.users.map((u) => (
                <label key={u.id} className={`flex items-center gap-2 rounded px-1 py-0.5 text-sm ${u.isYou ? "opacity-60" : "hover:bg-secondary/60"}`}>
                  <Checkbox disabled={u.isYou} checked={users.has(u.id)} onCheckedChange={() => toggleIn(users, u.id, setUsers)} aria-label={`Remove account ${u.email}`} />
                  <span>{u.fullName || u.email}</span>
                  <span className="text-xs text-muted-foreground">{u.email}</span>
                  {u.isYou && <Badge variant="secondary">You</Badge>}
                  {u.roles.map((r) => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <Label htmlFor="cleanup-confirm" className="text-sm">Type <b>DELETE TEST DATA</b> to remove {total} selected record(s)</Label>
          <Input id="cleanup-confirm" className="max-w-xs" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button variant="destructive" disabled={!canRun} onClick={() => run.mutate()}>
            {run.isPending ? "Removing…" : "Remove selected test data"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
