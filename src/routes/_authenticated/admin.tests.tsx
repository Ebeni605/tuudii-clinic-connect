import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { LoadError, PageHeader, PageLoading, RequireArea } from "@/components/AppShell";
import { requireArea } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LAB_SECTIONS, RESULT_TYPE_LABEL, useLabTests, useStaffNames } from "@/lib/data";
import { fmtDateTime } from "@/lib/opd-queries";
import { referenceText } from "@/lib/workflow";

export const Route = createFileRoute("/_authenticated/admin/tests")({
  beforeLoad: requireArea("admin"),
  head: () => ({ meta: [{ title: "Laboratory Test Catalogue — Two D Medium Clinic" }, { name: "description", content: "Configure laboratory tests, units, reference intervals and result types." }] }),
  component: () => <RequireArea area="admin"><Tests /></RequireArea>,
});

type Form = {
  id?: string; code: string; name: string; section: string; panel: string; specimen_type: string; result_type: string;
  unit: string; ref_low: string; ref_high: string; ref_text: string; result_options: string; abnormal_options: string;
  reference_source: string; catalogue_note: string; display_order: string; active: boolean;
  method: string; analyzer: string; critical_low: string; critical_high: string;
};
const EMPTY: Form = { code: "", name: "", section: "Hematology", panel: "", specimen_type: "", result_type: "numeric", unit: "", ref_low: "", ref_high: "", ref_text: "", result_options: "", abnormal_options: "", reference_source: "", catalogue_note: "", display_order: "0", active: true, method: "", analyzer: "", critical_low: "", critical_high: "" };
const APPROVAL_LABEL: Record<string, string> = { draft: "Needs approval", approved: "Approved", needs_confirmation: "Needs lab confirmation" };
const list = (s: string) => { const a = s.split(",").map((x) => x.trim()).filter(Boolean); return a.length ? a : null; };
const num = (s: string) => (s.trim() === "" ? null : Number(s));
const str = (s: string) => s.trim() || null;

function Tests() {
  const { data, isLoading, error, refetch } = useLabTests();
  const { data: names } = useStaffNames();
  const qc = useQueryClient();
  const [f, setF] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!f) return;
    const lo = num(f.ref_low), hi = num(f.ref_high);
    if ((lo != null && Number.isNaN(lo)) || (hi != null && Number.isNaN(hi))) { toast.error("Reference limits must be numbers"); return; }
    const row = {
      code: f.code, name: f.name, section: f.section, panel: str(f.panel), specimen_type: str(f.specimen_type), result_type: f.result_type,
      unit: str(f.unit), ref_low: lo, ref_high: hi, ref_text: str(f.ref_text), result_options: list(f.result_options), abnormal_options: list(f.abnormal_options),
      reference_source: str(f.reference_source), catalogue_note: str(f.catalogue_note), display_order: Number(f.display_order) || 0, active: f.active,
      method: str(f.method), analyzer: str(f.analyzer), critical_low: num(f.critical_low), critical_high: num(f.critical_high),
    };
    setBusy(true);
    const { error } = f.id ? await supabase.from("lab_tests").update(row).eq("id", f.id) : await supabase.from("lab_tests").insert(row);
    setBusy(false);
    if (error) { toast.error(error.code === "23505" ? "Another test already uses this code" : error.message); return; }
    toast.success(f.id ? "Test updated" : "Test added");
    setF(null);
    qc.invalidateQueries({ queryKey: ["lab_tests"] });
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("lab_tests").update({ active }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["lab_tests"] });
  }

  async function approve(id: string) {
    const { error } = await supabase.rpc("approve_lab_test", { _test_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Test approved — it can now be ordered");
    qc.invalidateQueries({ queryKey: ["lab_tests"] });
  }

  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF((x) => (x ? { ...x, [k]: e.target.value } : x));
  const unconfigured = (data ?? []).filter((t) => t.active && t.result_type === "numeric" && (t.ref_low == null && t.ref_high == null || !t.unit)).length;

  return (
    <div>
      <PageHeader title="Laboratory test catalogue" subtitle="Tests and categories follow the clinic's paper request form. Units and reference intervals must come from the laboratory's validated procedures and test kits."
        actions={<Button onClick={() => setF({ ...EMPTY })}>Add test</Button>} />
      {unconfigured > 0 && (
        <div className="mb-3 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
          <b>{unconfigured} numeric test(s) have no unit or reference interval yet.</b> Results can still be entered, but no High/Low marks are shown until the laboratory configures them.
        </div>
      )}
      {isLoading ? <PageLoading /> : error ? <LoadError onRetry={() => refetch()} /> : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Category</TableHead><TableHead>Test</TableHead><TableHead>Result type</TableHead><TableHead>Unit</TableHead>
                <TableHead>Reference / answers</TableHead><TableHead>Specimen</TableHead><TableHead>Approval</TableHead><TableHead>Active</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {LAB_SECTIONS.flatMap((s) => (data ?? []).filter((t) => t.section === s))
                  .concat((data ?? []).filter((t) => !LAB_SECTIONS.includes(t.section)))
                  .map((t) => {
                    const ref = referenceText({ ...t, unit: null });
                    return (
                      <TableRow key={t.id} className={t.active ? "" : "opacity-50"}>
                        <TableCell className="text-xs text-muted-foreground">{t.section}{t.panel && <div>Panel: {t.panel}</div>}</TableCell>
                        <TableCell>
                          <div className="font-medium">{t.name}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{t.code}</div>
                          {t.catalogue_note && <div className="text-[11px] text-warning-foreground">{t.catalogue_note}</div>}
                        </TableCell>
                        <TableCell className="text-xs">{RESULT_TYPE_LABEL[t.result_type] ?? t.result_type}</TableCell>
                        <TableCell className="text-xs">{t.unit ?? (t.result_type === "numeric" ? <span className="text-warning-foreground">Not set</span> : "—")}</TableCell>
                        <TableCell className="text-xs">
                          {t.result_type === "qualitative" ? <>{t.result_options?.join(" / ")}{t.abnormal_options?.length ? <div className="text-destructive">Abnormal: {t.abnormal_options.join(", ")}</div> : null}</>
                            : ref || (t.result_type === "numeric" ? <span className="text-warning-foreground">Not configured</span> : "—")}
                          {t.reference_source && <div className="text-muted-foreground">Source: {t.reference_source}</div>}
                          {t.reference_updated_at && <div className="text-muted-foreground">Set by {names?.[t.reference_updated_by ?? ""] ?? "—"}, {fmtDateTime(t.reference_updated_at)}</div>}
                        </TableCell>
                        <TableCell className="text-xs">{t.specimen_type ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          <div className={t.approval_status === "approved" ? "text-success" : "text-warning-foreground"}>{APPROVAL_LABEL[t.approval_status] ?? t.approval_status}</div>
                          {t.approved_at && <div className="text-muted-foreground">{names?.[t.approved_by ?? ""] ?? "—"}, {fmtDateTime(t.approved_at)}</div>}
                          {t.approval_status !== "approved" && <Button size="sm" variant="outline" className="mt-1 h-7" onClick={() => approve(t.id)}>Approve</Button>}
                        </TableCell>
                        <TableCell><Switch aria-label={`${t.name} active`} checked={t.active} onCheckedChange={(a) => toggle(t.id, a)} /></TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => setF({
                          id: t.id, code: t.code, name: t.name, section: t.section, panel: t.panel ?? "", specimen_type: t.specimen_type ?? "", result_type: t.result_type,
                          unit: t.unit ?? "", ref_low: t.ref_low?.toString() ?? "", ref_high: t.ref_high?.toString() ?? "", ref_text: t.ref_text ?? "",
                          result_options: t.result_options?.join(", ") ?? "", abnormal_options: t.abnormal_options?.join(", ") ?? "",
                          reference_source: t.reference_source ?? "", catalogue_note: t.catalogue_note ?? "", display_order: String(t.display_order), active: t.active,
                          method: t.method ?? "", analyzer: t.analyzer ?? "", critical_low: t.critical_low?.toString() ?? "", critical_high: t.critical_high?.toString() ?? "",
                        })}>Edit</Button></TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={!!f} onOpenChange={(o) => !o && setF(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{f?.id ? `Edit ${f.name}` : "Add laboratory test"}</DialogTitle>
            <DialogDescription>Changes apply to new results only; results already entered keep the unit and reference interval used at the time.</DialogDescription>
          </DialogHeader>
          {f && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="t-name">Test name *</Label><Input id="t-name" value={f.name} onChange={set("name")} maxLength={80} /></div>
              <div className="space-y-1.5"><Label htmlFor="t-code">Code *</Label><Input id="t-code" value={f.code} onChange={set("code")} maxLength={20} placeholder="e.g. HGB" /></div>
              <div className="space-y-1.5"><Label htmlFor="t-sec">Category *</Label>
                <Select value={f.section} onValueChange={(v) => setF({ ...f, section: v })}>
                  <SelectTrigger id="t-sec" aria-label="Category"><SelectValue /></SelectTrigger>
                  <SelectContent>{LAB_SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label htmlFor="t-type">Result type *</Label>
                <Select value={f.result_type} onValueChange={(v) => setF({ ...f, result_type: v })}>
                  <SelectTrigger id="t-type" aria-label="Result type"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(RESULT_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label htmlFor="t-panel">Panel (optional)</Label><Input id="t-panel" value={f.panel} onChange={set("panel")} placeholder="e.g. CBC" /></div>
              <div className="space-y-1.5"><Label htmlFor="t-spec">Usual specimen type</Label><Input id="t-spec" value={f.specimen_type} onChange={set("specimen_type")} /></div>
              {f.result_type === "numeric" && <>
                <div className="space-y-1.5"><Label htmlFor="t-unit">Unit</Label><Input id="t-unit" value={f.unit} onChange={set("unit")} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5"><Label htmlFor="t-lo">Reference low</Label><Input id="t-lo" type="number" step="any" value={f.ref_low} onChange={set("ref_low")} /></div>
                  <div className="space-y-1.5"><Label htmlFor="t-hi">Reference high</Label><Input id="t-hi" type="number" step="any" value={f.ref_high} onChange={set("ref_high")} /></div>
                </div>
              </>}
              {f.result_type === "numeric" && <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label htmlFor="t-clo">Critical low</Label><Input id="t-clo" type="number" step="any" value={f.critical_low} onChange={set("critical_low")} /></div>
                <div className="space-y-1.5"><Label htmlFor="t-chi">Critical high</Label><Input id="t-chi" type="number" step="any" value={f.critical_high} onChange={set("critical_high")} /></div>
              </div>}
              <div className="space-y-1.5"><Label htmlFor="t-meth">Method</Label><Input id="t-meth" value={f.method} onChange={set("method")} maxLength={120} /></div>
              <div className="space-y-1.5"><Label htmlFor="t-an">Analyzer / kit</Label><Input id="t-an" value={f.analyzer} onChange={set("analyzer")} maxLength={120} /></div>
              {f.result_type === "qualitative" && <>
                <div className="space-y-1.5"><Label htmlFor="t-opt">Allowed answers * (comma separated)</Label><Input id="t-opt" value={f.result_options} onChange={set("result_options")} placeholder="Negative, Positive" /></div>
                <div className="space-y-1.5"><Label htmlFor="t-abn">Answers shown as abnormal</Label><Input id="t-abn" value={f.abnormal_options} onChange={set("abnormal_options")} placeholder="Positive" /></div>
              </>}
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="t-reft">Reference / expected finding text (printed in the reference column)</Label><Input id="t-reft" value={f.ref_text} onChange={set("ref_text")} maxLength={120} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="t-src">Source of reference interval</Label><Input id="t-src" value={f.reference_source} onChange={set("reference_source")} placeholder="e.g. kit insert / analyser, lot, date validated" maxLength={200} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="t-note">Note for staff</Label><Textarea id="t-note" rows={2} value={f.catalogue_note} onChange={set("catalogue_note")} maxLength={300} /></div>
              <div className="space-y-1.5"><Label htmlFor="t-ord">Order on form</Label><Input id="t-ord" type="number" value={f.display_order} onChange={set("display_order")} /></div>
              <label className="flex items-center gap-2 self-end text-sm"><Switch checked={f.active} onCheckedChange={(active) => setF({ ...f, active })} />Active (can be requested)</label>
            </div>
          )}
          {f?.id && f.result_type === "numeric" && <Ranges testId={f.id} />}
          <p className="text-xs text-muted-foreground">Saving changes to an approved test sends it back for approval before it can be ordered again.</p>
          <DialogFooter><Button variant="outline" onClick={() => setF(null)}>Back</Button><Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Ranges({ testId }: { testId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lab_ranges", testId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lab_test_reference_ranges").select("*").eq("lab_test_id", testId).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [r, setR] = useState({ sex: "any", age_min: "", age_max: "", pregnancy: false, unit: "", lo: "", hi: "", text: "" });
  async function add() {
    const lo = num(r.lo), hi = num(r.hi), a = num(r.age_min), b = num(r.age_max);
    if ([lo, hi, a, b].some((x) => x != null && Number.isNaN(x))) { toast.error("Enter numbers only"); return; }
    if (lo == null && hi == null && !r.text.trim()) { toast.error("Enter a low/high limit or reference text"); return; }
    const { error } = await supabase.from("lab_test_reference_ranges").insert({
      lab_test_id: testId, sex: r.sex === "any" ? null : r.sex, age_min_years: a, age_max_years: b, pregnancy: r.pregnancy,
      unit: str(r.unit), ref_low: lo, ref_high: hi, ref_text: str(r.text),
    });
    if (error) { toast.error(error.message); return; }
    setR({ ...r, age_min: "", age_max: "", lo: "", hi: "", text: "" });
    qc.invalidateQueries({ queryKey: ["lab_ranges", testId] }); qc.invalidateQueries({ queryKey: ["lab_tests"] });
  }
  async function remove(id: string) {
    const { error } = await supabase.from("lab_test_reference_ranges").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["lab_ranges", testId] }); qc.invalidateQueries({ queryKey: ["lab_tests"] });
  }
  return (
    <div className="space-y-2 rounded-md border bg-secondary/40 p-3">
      <div className="text-sm font-semibold">Age / sex / pregnancy-specific reference ranges</div>
      {q.data?.length === 0 && <p className="text-xs text-muted-foreground">None yet — the general interval above is used.</p>}
      {q.data?.map((x) => (
        <div key={x.id} className="flex items-center justify-between gap-2 text-xs">
          <span>{x.sex ?? "Any sex"}, age {x.age_min_years ?? 0}–{x.age_max_years ?? "∞"} y{x.pregnancy ? ", pregnant" : ""}: {x.ref_text ?? `${x.ref_low ?? ""}–${x.ref_high ?? ""}`} {x.unit ?? ""}</span>
          <Button size="sm" variant="ghost" className="h-6" onClick={() => remove(x.id)}>Remove</Button>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select value={r.sex} onValueChange={(v) => setR({ ...r, sex: v })}>
          <SelectTrigger aria-label="Sex"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="any">Any sex</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
        </Select>
        <Input aria-label="Age from (years)" placeholder="Age from" type="number" value={r.age_min} onChange={(e) => setR({ ...r, age_min: e.target.value })} />
        <Input aria-label="Age to (years)" placeholder="Age to" type="number" value={r.age_max} onChange={(e) => setR({ ...r, age_max: e.target.value })} />
        <Input aria-label="Unit" placeholder="Unit" value={r.unit} onChange={(e) => setR({ ...r, unit: e.target.value })} />
        <Input aria-label="Range low" placeholder="Low" type="number" step="any" value={r.lo} onChange={(e) => setR({ ...r, lo: e.target.value })} />
        <Input aria-label="Range high" placeholder="High" type="number" step="any" value={r.hi} onChange={(e) => setR({ ...r, hi: e.target.value })} />
        <Input aria-label="Reference text" placeholder="Or text" value={r.text} onChange={(e) => setR({ ...r, text: e.target.value })} />
        <label className="flex items-center gap-2 text-xs"><Switch checked={r.pregnancy} onCheckedChange={(v) => setR({ ...r, pregnancy: v })} />Pregnancy</label>
      </div>
      <Button size="sm" variant="outline" onClick={add}>Add range</Button>
    </div>
  );
}
