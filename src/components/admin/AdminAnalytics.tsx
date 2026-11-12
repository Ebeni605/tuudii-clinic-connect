import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  Users, UserPlus, Stethoscope, FlaskConical, Hourglass, BadgeCheck, Clock, CheckCircle2, ArrowUpRight, ArrowDownRight, Minus, Lock, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { LoadError } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useLiveTable } from "@/lib/data";
import { addDays, bottleneck, defaultRange, pct, periodChange, rangeProblem } from "@/lib/reports";
import { clinicToday } from "@/lib/patient-schema";

type Counted = { label: string; count: number };
type Dash = {
  from: string; to: string; prev_from: string; prev_to: string;
  cards: Record<string, number>;
  trend: { period: string; visits: number }[];
  services: { key: string; name: string; visits: number }[];
  lab_status: { status: string; count: number }[];
  top_tests: { name: string; section: string; count: number }[];
  sections: string[];
  by_sex: Counted[]; by_age: Counted[];
  flow: {
    reception: { total: number; waiting: number }; opd: { total: number; in_progress: number };
    lab: { total: number; in_progress: number }; review: { total: number; waiting: number };
    payment: { enabled: boolean; total: number | null }; completed: { total: number };
  };
};
type Group = "day" | "week" | "month" | "year";

const LAB_GROUPS: { key: string; label: string; statuses: string[]; color: string }[] = [
  { key: "requested", label: "Requested", statuses: ["requested"], color: "var(--chart-3)" },
  { key: "collected", label: "Sample collection", statuses: ["collected"], color: "var(--chart-2)" },
  { key: "received", label: "Sample received", statuses: ["received"], color: "var(--chart-5)" },
  { key: "processing", label: "Processing", statuses: ["processing", "entered"], color: "var(--chart-4)" },
  { key: "awaiting", label: "Awaiting verification", statuses: ["awaiting_verification"], color: "oklch(0.6 0.15 300)" },
  { key: "verified", label: "Verified", statuses: ["verified"], color: "var(--chart-1)" },
  { key: "rejected", label: "Rejected", statuses: ["rejected"], color: "var(--destructive)" },
];
const SVC_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "oklch(0.55 0.15 280)", "oklch(0.62 0.1 200)", "oklch(0.7 0.12 160)", "oklch(0.5 0.12 240)", "oklch(0.8 0.08 230)", "oklch(0.6 0.08 260)"];
const AGE_ORDER = ["Under 1", "1–4", "5–14", "15–24", "25–44", "45–64", "65+", "Unknown"];
const n = (v: unknown) => Number(v ?? 0);

function periodLabel(p: string, g: Group) {
  if (g === "year") return p.slice(0, 4);
  if (g === "month") return p.slice(0, 7);
  return p.slice(5);
}

export function AdminAnalytics() {
  const def = defaultRange();
  const [range, setRange] = useState(def);
  const [draft, setDraft] = useState(def);
  const [group, setGroup] = useState<Group>("day");
  const [section, setSection] = useState("all");
  const problem = rangeProblem(draft.from, draft.to);
  const navigate = useNavigate();
  useLiveTable("visits", [["admin_dash"]]);
  useLiveTable("lab_request_items", [["admin_dash"]]);

  const q = useQuery({
    queryKey: ["admin_dash", range.from, range.to, group],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("report_dashboard" as never, { _from: range.from, _to: range.to, _group: group } as never);
      if (error) throw error;
      return data as unknown as Dash;
    },
  });

  function preset(days: number) {
    const t = clinicToday();
    const r = { from: addDays(t, -(days - 1)), to: t };
    setDraft(r); setRange(r);
  }
  const drill = (tab: string) => navigate({ to: "/admin/reports", search: { tab: tab as never, from: range.from, to: range.to } });

  const d = q.data;
  const c = d?.cards ?? {};
  const cards = [
    { label: "Registered patients", desc: "Active patient records (all time)", value: c["total_patients"], icon: Users, tab: "registrations" },
    { label: "Registrations today", desc: "New patients today vs yesterday", value: c["registrations_today"], prev: c["registrations_yesterday"], icon: UserPlus, tab: "registrations" },
    { label: "OPD visits", desc: "Attended visits in period", value: c["opd_visits"], prev: c["opd_visits_prev"], icon: Stethoscope, tab: "attendance" },
    { label: "Lab requests", desc: "Requests created in period", value: c["lab_requests"], prev: c["lab_requests_prev"], icon: FlaskConical, tab: "lab_volume" },
    { label: "Pending lab results", desc: "Tests not yet verified (now)", value: c["pending_results"], icon: Hourglass, tab: "lab_tat", warn: n(c["pending_results"]) > 0 },
    { label: "Verified results", desc: "Tests verified in period", value: c["verified_results"], prev: c["verified_results_prev"], icon: BadgeCheck, tab: "lab_volume" },
    { label: "Waiting now", desc: "Patients waiting in today's queue", value: c["waiting_now"], icon: Clock, tab: "appointments" },
    { label: "Completed visits", desc: "Visits completed in period", value: c["completed"], prev: c["completed_prev"], icon: CheckCircle2, tab: "attendance" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-wrap gap-1.5">
            {[["Today", 1], ["7 days", 7], ["30 days", 30], ["90 days", 90], ["1 year", 365]].map(([l, days]) => (
              <Button key={l} size="sm" variant="outline" onClick={() => preset(days as number)}>{l}</Button>
            ))}
          </div>
          <div className="space-y-1.5"><Label htmlFor="df">From</Label><Input id="df" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="dt">To</Label><Input id="dt" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></div>
          <Button disabled={!!problem} onClick={() => setRange(draft)}>Apply</Button>
          <p className="w-full text-xs text-muted-foreground">
            {problem ? <span className="text-destructive">{problem}</span>
              : d ? <>Showing {d.from} to {d.to} (clinic time). Comparisons use {d.prev_from} to {d.prev_to}.</> : "Clinic time (Addis Ababa)."}
          </p>
        </CardContent>
      </Card>

      {q.error && <LoadError message={(q.error as Error).message} onRetry={() => q.refetch()} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((k) => {
          const ch = k.prev !== undefined && d ? periodChange(n(k.value), k.prev) : null;
          return (
            <button key={k.label} type="button" onClick={() => drill(k.tab)} className="text-left">
              <Card className="h-full shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex gap-3 p-4">
                  <div className={`h-fit rounded-lg p-2.5 ${k.warn ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary"}`}><k.icon className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{k.label}</div>
                    <div className="text-2xl font-bold tabular-nums">{q.isLoading ? "…" : n(k.value).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{k.desc}</div>
                    {ch && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        {ch.dir === "up" ? <ArrowUpRight className="h-3.5 w-3.5 text-primary" /> : ch.dir === "down" ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        {ch.pct}% vs previous period ({n(k.prev)})
                      </div>
                    )}
                    {k.prev !== undefined && d && !ch && <div className="mt-1 text-xs text-muted-foreground">No earlier data to compare</div>}
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {d && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <TrendCard d={d} group={group} setGroup={setGroup} onDrill={() => drill("attendance")} />
            <LabStatusCard d={d} onDrill={() => drill("lab_tat")} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ServicesCard d={d} onDrill={() => drill("services")} />
            <TopTestsCard d={d} section={section} setSection={setSection} onDrill={() => drill("lab_volume")} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <DemographicsCard d={d} onDrill={() => drill("registrations")} />
            <FlowCard d={d} />
          </div>
          <FinanceCard enabled={d.flow.payment.enabled} />
        </>
      )}
    </div>
  );
}

function Empty({ text = "No data in this period." }: { text?: string }) {
  return <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">{text}</div>;
}

function Head({ title, onDrill, children }: { title: string; onDrill?: () => void; children?: React.ReactNode }) {
  return (
    <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
      <CardTitle className="text-base">{title}</CardTitle>
      <div className="flex items-center gap-2">{children}{onDrill && <Button size="sm" variant="ghost" onClick={onDrill}>Details →</Button>}</div>
    </CardHeader>
  );
}

function TrendCard({ d, group, setGroup, onDrill }: { d: Dash; group: Group; setGroup: (g: Group) => void; onDrill: () => void }) {
  const data = d.trend.map((t) => ({ ...t, label: periodLabel(t.period, group), visits: n(t.visits) }));
  const cfg: ChartConfig = { visits: { label: "OPD visits", color: "var(--chart-1)" } };
  return (
    <Card className="shadow-sm lg:col-span-2">
      <Head title="Patient visits trend" onDrill={onDrill}>
        <Select value={group} onValueChange={(v) => setGroup(v as Group)}>
          <SelectTrigger className="h-8 w-28" aria-label="Trend period"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="day">Daily</SelectItem><SelectItem value="week">Weekly</SelectItem><SelectItem value="month">Monthly</SelectItem><SelectItem value="year">Yearly</SelectItem></SelectContent>
        </Select>
      </Head>
      <CardContent>
        {data.length === 0 ? <Empty /> : (
          <ChartContainer config={cfg} className="aspect-auto h-64 w-full">
            <AreaChart data={data} margin={{ left: -16, right: 8 }}>
              <defs><linearGradient id="vfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-visits)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--color-visits)" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_l, p) => (p?.[0]?.payload as { period?: string })?.period ?? ""} />} />
              <Area dataKey="visits" type="monotone" stroke="var(--color-visits)" strokeWidth={2.5} fill="url(#vfill)" dot={data.length < 40} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function LabStatusCard({ d, onDrill }: { d: Dash; onDrill: () => void }) {
  const data = LAB_GROUPS.map((g) => ({ ...g, value: d.lab_status.filter((s) => g.statuses.includes(s.status)).reduce((a, s) => a + n(s.count), 0) })).filter((g) => g.value > 0);
  const total = data.reduce((a, g) => a + g.value, 0);
  const cfg: ChartConfig = Object.fromEntries(LAB_GROUPS.map((g) => [g.key, { label: g.label, color: g.color }]));
  return (
    <Card className="shadow-sm">
      <Head title="Laboratory performance" onDrill={onDrill} />
      <CardContent>
        {total === 0 ? <Empty text="No lab tests requested in this period." /> : (
          <>
            <ChartContainer config={cfg} className="mx-auto aspect-square h-44">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
                <Pie data={data} dataKey="value" nameKey="key" innerRadius={48} outerRadius={78} paddingAngle={2} onClick={onDrill} className="cursor-pointer">
                  {data.map((g) => <Cell key={g.key} fill={g.color} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-2 space-y-1 text-xs">
              {data.map((g) => (
                <li key={g.key} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: g.color }} />
                  <span className="flex-1">{g.label}</span><span className="font-semibold tabular-nums">{g.value}</span><span className="w-9 text-right text-muted-foreground">{pct(g.value, total)}</span></li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{total} tests. Cancelled tests are not shown.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ServicesCard({ d, onDrill }: { d: Dash; onDrill: () => void }) {
  const total = d.services.reduce((a, s) => a + n(s.visits), 0);
  const data = d.services.map((s, i) => ({ ...s, visits: n(s.visits), fill: SVC_COLORS[i % SVC_COLORS.length] }));
  const cfg: ChartConfig = { visits: { label: "Visits", color: "var(--chart-1)" } };
  return (
    <Card className="shadow-sm">
      <Head title="Visits by clinic service" onDrill={onDrill} />
      <CardContent>
        {total === 0 ? <Empty /> : (
          <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
            <ChartContainer config={cfg} className="mx-auto aspect-square h-44">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie data={data.filter((s) => s.visits > 0)} dataKey="visits" nameKey="name" innerRadius={45} outerRadius={78} paddingAngle={2} onClick={onDrill} className="cursor-pointer">
                  {data.filter((s) => s.visits > 0).map((s) => <Cell key={s.key} fill={s.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="space-y-1 text-xs">
              {data.map((s) => (
                <li key={s.key} className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.fill }} />
                  <span className="flex-1 truncate" title={s.name}>{s.name}</span><span className="font-semibold tabular-nums">{s.visits}</span><span className="w-9 text-right text-muted-foreground">{pct(s.visits, total)}</span></li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopTestsCard({ d, section, setSection, onDrill }: { d: Dash; section: string; setSection: (s: string) => void; onDrill: () => void }) {
  const data = d.top_tests.filter((t) => section === "all" || t.section === section).slice(0, 10).map((t) => ({ ...t, count: n(t.count) }));
  const cfg: ChartConfig = { count: { label: "Requests", color: "var(--chart-2)" } };
  return (
    <Card className="shadow-sm">
      <Head title="Most requested lab tests" onDrill={onDrill}>
        <Select value={section} onValueChange={setSection}>
          <SelectTrigger className="h-8 w-40" aria-label="Lab section"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All sections</SelectItem>{(d.sections ?? []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </Head>
      <CardContent>
        {data.length === 0 ? <Empty text="No tests requested in this period." /> : (
          <ChartContainer config={cfg} className="aspect-auto w-full" style={{ height: Math.max(160, data.length * 30) }}>
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} onClick={onDrill} className="cursor-pointer" />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function DemographicsCard({ d, onDrill }: { d: Dash; onDrill: () => void }) {
  const age = AGE_ORDER.map((l) => ({ label: l, count: n(d.by_age.find((a) => a.label === l)?.count) })).filter((a) => a.count > 0 || a.label !== "Unknown");
  const female = n(d.by_sex.find((s) => s.label === "female")?.count);
  const male = n(d.by_sex.find((s) => s.label === "male")?.count);
  const total = female + male;
  const cfg: ChartConfig = { count: { label: "Patients", color: "var(--chart-1)" } };
  return (
    <Card className="shadow-sm">
      <Head title="Patient demographics" onDrill={onDrill} />
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Distinct patients seen in this period. Totals only — no names or phone numbers.</p>
        {total === 0 ? <Empty /> : (
          <>
            <div>
              <div className="mb-1 flex justify-between text-xs"><span>Female {female} ({pct(female, total)})</span><span>Male {male} ({pct(male, total)})</span></div>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                <div className="bg-primary" style={{ width: `${(female / total) * 100}%` }} />
                <div className="bg-chart-3" style={{ width: `${(male / total) * 100}%` }} />
              </div>
            </div>
            <ChartContainer config={cfg} className="aspect-auto h-44 w-full">
              <BarChart data={age} margin={{ left: -20, right: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={0} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FlowCard({ d }: { d: Dash }) {
  const f = d.flow;
  const steps = [
    { key: "reception", label: "Reception (checked in)", total: n(f.reception.total), queued: n(f.reception.waiting), qLabel: "waiting" },
    { key: "opd", label: "OPD consultation", total: n(f.opd.total), queued: n(f.opd.in_progress), qLabel: "in consultation" },
    { key: "lab", label: "Laboratory (when ordered)", total: n(f.lab.total), queued: n(f.lab.in_progress), qLabel: "awaiting results" },
    { key: "review", label: "OPD review of results", total: n(f.review.total), queued: n(f.review.waiting), qLabel: "ready for review" },
    { key: "payment", label: "Reception payment", total: f.payment.enabled ? n(f.payment.total) : null, queued: 0, qLabel: "" },
    { key: "completed", label: "Completed", total: n(f.completed.total), queued: 0, qLabel: "" },
  ];
  const base = Math.max(1, steps[0]!.total);
  const neck = bottleneck(steps);
  return (
    <Card className="shadow-sm lg:col-span-2">
      <Head title="Patient flow" />
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">Each visit is counted once per step. Waiting/in-progress figures are current statuses of visits in this period.</p>
        {steps[0]!.total === 0 ? <Empty /> : steps.map((s, i) => (
          <div key={s.key} className={`rounded-md border p-2.5 ${neck === s.key ? "border-destructive/50 bg-destructive/5" : ""}`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
              <span className="flex-1 font-medium">{s.label}</span>
              {s.total === null ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Billing off</span>
                : <span className="font-bold tabular-nums">{s.total}</span>}
              {s.queued > 0 && <span className="text-xs text-muted-foreground">· {s.queued} {s.qLabel}</span>}
              {neck === s.key && <span className="flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="h-3 w-3" />Bottleneck</span>}
            </div>
            {s.total !== null && <div className="mt-1.5 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(s.total / base) * 100}%` }} /></div>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FinanceCard({ enabled }: { enabled: boolean }) {
  return (
    <Card className="shadow-sm">
      <Head title="Financial summary" />
      <CardContent>
        {enabled ? (
          <p className="text-sm">Billing is active. <Link to="/admin/reports" search={{ tab: "billing" }} className="text-primary hover:underline">Open the billing report →</Link></p>
        ) : (
          <div className="flex items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>Revenue, payments and daily/monthly financial summaries appear here once the administrator approves the official price list and switches billing on. No prices or revenue are shown until then.
              <div className="mt-1"><Link to="/admin/billing" className="text-primary hover:underline">Billing setup →</Link></div></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
