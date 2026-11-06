import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, RequireArea } from "@/components/AppShell";
import { requireArea } from "@/lib/auth";
import { createStaff, listStaff, updateStaff } from "@/lib/admin.functions";
import { ROLE_LABELS, APPROVAL_LABELS, type AppRole } from "@/lib/workflow";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  beforeLoad: requireArea("admin"),
  head: () => ({ meta: [{ title: "Staff & Roles — Two D Medium Clinic" }] }),
  component: () => <RequireArea area="admin"><Staff /></RequireArea>,
});

const ALL: AppRole[] = ["admin", "receptionist", "clinician", "lab_tech"];

function RolePicker({ value, onChange }: { value: AppRole[]; onChange: (r: AppRole[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ALL.map((r) => (
        <label key={r} className="flex items-center gap-2 text-sm">
          <Checkbox checked={value.includes(r)} onCheckedChange={(c) => onChange(c ? [...value, r] : value.filter((x) => x !== r))} />
          {ROLE_LABELS[r]}
        </label>
      ))}
    </div>
  );
}

function Staff() {
  const list = useServerFn(listStaff);
  const create = useServerFn(createStaff);
  const update = useServerFn(updateStaff);
  const { data, refetch } = useQuery({ queryKey: ["staff"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ fullName: "", email: "", phone: "", password: "", roles: [] as AppRole[] });
  const [edit, setEdit] = useState<null | { userId: string; name: string; roles: AppRole[]; active: boolean; canSelfVerify: boolean; canVerifyLab: boolean; newPassword: string }>(null);

  async function add() {
    try {
      await create({ data: f });
      toast.success("Staff account created");
      setOpen(false); setF({ fullName: "", email: "", phone: "", password: "", roles: [] }); refetch();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function save() {
    if (!edit) return;
    try {
      await update({ data: { userId: edit.userId, roles: edit.roles, active: edit.active, canSelfVerify: edit.canSelfVerify, canVerifyLab: edit.canVerifyLab, ...(edit.newPassword ? { newPassword: edit.newPassword } : {}) } });
      toast.success("Saved"); setEdit(null); refetch();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <PageHeader title="Staff & roles" subtitle="Only the administrator creates staff accounts. There is no public sign-up."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>Add staff</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New staff account</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Full name</Label><Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Email (used to sign in)</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Temporary password (min. 10 characters, letters and numbers)</Label><Input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Roles</Label><RolePicker value={f.roles} onChange={(roles) => setF({ ...f, roles })} /></div>
                <Button className="w-full" onClick={add}>Create account</Button>
              </div>
            </DialogContent>
          </Dialog>
        } />
      <PendingRequests rows={(data ?? []).filter((s) => s.approvalStatus === "pending_approval")} onDone={() => refetch()} />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Roles</TableHead><TableHead>Status</TableHead><TableHead>Last sign in</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {data?.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.fullName}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell className="text-sm">{s.roles.map((r) => ROLE_LABELS[r]).join(", ") || "—"}{s.canVerifyLab && <div className="text-xs text-muted-foreground">May verify lab results</div>}{s.canSelfVerify && <div className="text-xs text-muted-foreground">May self-verify lab results</div>}</TableCell>
                <TableCell>{s.approvalStatus !== "approved" ? APPROVAL_LABELS[s.approvalStatus] : s.active ? "Active" : <span className="text-destructive">Disabled</span>}</TableCell>
                <TableCell className="text-sm">{s.lastSignIn ? new Date(s.lastSignIn).toLocaleString() : "Never"}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => setEdit({ userId: s.id, name: s.fullName, roles: s.roles, active: s.active, canSelfVerify: s.canSelfVerify, canVerifyLab: s.canVerifyLab, newPassword: "" })}>Edit</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {edit?.name}</DialogTitle></DialogHeader>
          {edit && <div className="space-y-4">
            <RolePicker value={edit.roles} onChange={(roles) => setEdit({ ...edit, roles })} />
            <label className="flex items-center gap-2 text-sm"><Switch checked={edit.active} onCheckedChange={(active) => setEdit({ ...edit, active })} />Account active</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={edit.canVerifyLab} onCheckedChange={(canVerifyLab) => setEdit({ ...edit, canVerifyLab })} />May verify laboratory results (laboratory technicians only)</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={edit.canSelfVerify} onCheckedChange={(canSelfVerify) => setEdit({ ...edit, canSelfVerify })} />Senior technician — may verify own results</label>
            <div className="space-y-1.5"><Label>Reset password (optional)</Label><Input value={edit.newPassword} onChange={(e) => setEdit({ ...edit, newPassword: e.target.value })} placeholder="Min. 10 characters, letters and numbers" /></div>
            <Button className="w-full" onClick={save}>Save</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type Pending = { id: string; fullName: string; email: string; phone: string; staffNumber: string; createdAt: string };

function PendingRequests({ rows, onDone }: { rows: Pending[]; onDone: () => void }) {
  const [act, setAct] = useState<{ row: Pending; mode: "approve" | "reject" } | null>(null);
  const [role, setRole] = useState<AppRole>("receptionist");
  const [verify, setVerify] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!act) return;
    setBusy(true);
    const { error } = act.mode === "approve"
      ? await supabase.rpc("approve_staff_registration", { _user_id: act.row.id, _role: role, _can_verify_lab: role === "lab_tech" && verify })
      : await supabase.rpc("reject_staff_registration", { _user_id: act.row.id, _reason: reason.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(act.mode === "approve" ? "Registration approved" : "Registration rejected");
    setAct(null); setReason(""); setVerify(false); onDone();
  }
  return (
    <Card className="mb-4 p-4">
      <h2 className="font-semibold">Registration requests ({rows.length})</h2>
      {rows.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No staff are waiting for approval.</p> : (
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone / Staff ID</TableHead><TableHead>Registered</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.fullName || "—"}</TableCell>
              <TableCell>{r.email}</TableCell>
              <TableCell className="text-sm">{r.phone || "—"}{r.staffNumber && <div className="text-xs text-muted-foreground">{r.staffNumber}</div>}</TableCell>
              <TableCell className="text-sm">{new Date(r.createdAt).toLocaleString()}</TableCell>
              <TableCell className="space-x-2 whitespace-nowrap">
                <Button size="sm" onClick={() => setAct({ row: r, mode: "approve" })}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => setAct({ row: r, mode: "reject" })}>Reject</Button>
              </TableCell>
            </TableRow>))}
          </TableBody>
        </Table>)}
      <Dialog open={!!act} onOpenChange={(o) => !o && setAct(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{act?.mode === "approve" ? "Approve" : "Reject"} {act?.row.fullName}</DialogTitle></DialogHeader>
          {act?.mode === "approve" ? (
            <div className="space-y-3">
              <Label>Department role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger aria-label="Department role"><SelectValue /></SelectTrigger>
                <SelectContent>{ALL.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
              </Select>
              {role === "lab_tech" && <label className="flex items-center gap-2 text-sm"><Switch checked={verify} onCheckedChange={setVerify} />May verify laboratory results</label>}
            </div>
          ) : (
            <div className="space-y-1.5"><Label htmlFor="rej">Reason (required)</Label><Textarea id="rej" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          )}
          <Button className="w-full" disabled={busy || (act?.mode === "reject" && reason.trim().length < 3)} onClick={submit}>{busy ? "Saving…" : "Confirm"}</Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
