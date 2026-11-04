import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ClipboardList, FlaskConical, Stethoscope, UserPlus, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClinicLogo, CLINIC } from "@/components/ClinicBrand";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Two D Medium Clinic — Staff Portal" },
      { name: "description", content: "Staff portal for Reception, OPD and Laboratory at Kilinika G/Galeessa Tuudii – Two D Medium Clinic. Register or sign in." },
      { property: "og:title", content: "Two D Medium Clinic — Staff Portal" },
      { property: "og:description", content: "Reception, OPD and Laboratory in one shared patient system. Staff registration and sign in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Welcome,
});

const DEPARTMENTS = [
  { name: "Reception", icon: ClipboardList, text: "Registration, appointments and the patient queue" },
  { name: "OPD", icon: Stethoscope, text: "Consultation, vital signs, diagnosis and lab requests" },
  { name: "Laboratory", icon: FlaskConical, text: "Specimens, results, verification and reports" },
];

function Welcome() {
  const navigate = useNavigate();
  useEffect(() => {
    // Signed-in staff go straight to the sign-in page, which routes them to their department
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/auth", replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-secondary to-background">
      <div className="h-1 bg-destructive" />
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <ClinicLogo className="h-11 w-11 ring-2 ring-sidebar-border" />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-extrabold tracking-wide">{CLINIC.name}</div>
            <div className="truncate text-xs opacity-80">{CLINIC.english}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 py-10 text-center md:py-16">
        <ClinicLogo className="h-32 w-32 shadow-lg md:h-40 md:w-40" />
        <h1 className="mt-6 text-2xl font-extrabold text-primary md:text-4xl">{CLINIC.name}</h1>
        <p className="mt-1 text-lg">{CLINIC.amharic}</p>
        <p className="font-semibold tracking-widest text-muted-foreground">{CLINIC.english}</p>
        <p className="mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
          Staff portal for the clinic's shared patient record. New staff register here; the administrator approves each account and assigns the department role.
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 flex-1 text-base">
            <Link to="/register"><UserPlus className="mr-2 h-5 w-5" />Register as staff</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 flex-1 border-primary text-base text-primary">
            <Link to="/auth"><LogIn className="mr-2 h-5 w-5" />Log in</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Already registered and approved? Use <span className="font-medium">Log in</span>.</p>

        <div className="mt-12 grid w-full gap-3 sm:grid-cols-3">
          {DEPARTMENTS.map((d) => (
            <div key={d.name} className="rounded-lg border border-t-4 border-t-primary bg-card p-4 text-left shadow-sm">
              <d.icon className="h-6 w-6 text-primary" />
              <div className="mt-2 font-semibold">{d.name}</div>
              <div className="text-sm text-muted-foreground">{d.text}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />Authorised clinic staff only</span>
          <span>Tel: {CLINIC.phones}</span>
        </div>
      </footer>
    </div>
  );
}
