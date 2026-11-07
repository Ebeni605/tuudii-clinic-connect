import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Users, UserPlus, ListOrdered, CalendarDays, Stethoscope,
  FlaskConical, ShieldCheck, BadgeCheck, TestTubes, ScrollText, LogOut, ClipboardList, ListChecks, BookOpen, BarChart3, Receipt, Wallet, ClipboardCheck,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle } from "lucide-react";
import { ClinicLogo } from "@/components/ClinicBrand";
import { IdleSignOut } from "@/components/IdleSignOut";
import { useSignOut, useStaff } from "@/lib/auth";
import { canAccess, ROLE_LABELS, type Area } from "@/lib/workflow";

const NAV: { label: string; area: Area; items: { title: string; url: string; icon: typeof Users }[] }[] = [
  { label: "Overview", area: "dashboard", items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Reception", area: "reception", items: [
      { title: "Reception dashboard", url: "/reception", icon: ClipboardList },
      { title: "Patients", url: "/patients", icon: Users },
      { title: "Register patient", url: "/patients/new", icon: UserPlus },
      { title: "Check-in & queue", url: "/reception/queue", icon: ListOrdered },
      { title: "Appointments", url: "/reception/appointments", icon: CalendarDays },
    ],
  },
  { label: "OPD", area: "opd", items: [{ title: "OPD dashboard", url: "/opd", icon: Stethoscope }] },
  {
    label: "Laboratory", area: "lab", items: [
      { title: "Lab dashboard", url: "/lab", icon: FlaskConical },
      { title: "Result verification", url: "/lab/verify", icon: BadgeCheck },
    ],
  },
  { label: "Billing", area: "billing", items: [{ title: "Invoices & payments", url: "/billing", icon: Receipt }] },
  {
    label: "Administration", area: "admin", items: [
      { title: "Reports", url: "/admin/reports", icon: BarChart3 },
      { title: "Staff & roles", url: "/admin/staff", icon: ShieldCheck },
      { title: "Visit services", url: "/admin/services", icon: ListChecks },
      { title: "Test catalogue", url: "/admin/tests", icon: TestTubes },
      { title: "Diagnosis catalogue", url: "/admin/diagnoses", icon: BookOpen },
      { title: "Billing setup", url: "/admin/billing", icon: Wallet },
      { title: "Go-live checklist", url: "/admin/deployment", icon: ClipboardCheck },
      { title: "Audit log", url: "/admin/audit", icon: ScrollText },
    ],
  },
];

function AppSidebar() {
  const { data: me } = useStaff();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const roles = me?.roles ?? [];
  const groups = NAV.filter((g) => canAccess(roles, g.area));
  // Clinicians and lab technicians can also search patients
  if (!canAccess(roles, "reception") && roles.length) {
    groups.splice(1, 0, { label: "Patients", area: "patients", items: [{ title: "Patient search", url: "/patients", icon: Users }] });
  }
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex-row items-center gap-2 p-3">
        <ClinicLogo className="h-10 w-10 shrink-0" />
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-bold">Two D Medium Clinic</div>
            <div className="text-[11px] opacity-80">G/Galeessa Tuudii</div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/70">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={path === item.url || path === item.url + "/"} tooltip={item.title}>
                      <Link to={item.url} onClick={() => isMobile && setOpenMobile(false)}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}

export function AppShell() {
  const { data: me } = useStaff();
  const signOut = useSignOut();
  return (
    <SidebarProvider>
      {me && <IdleSignOut />}
      <div className="flex min-h-screen w-full">
        <div className="no-print"><AppSidebar /></div>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-card px-3 shadow-sm">
            <SidebarTrigger aria-label="Toggle menu" />
            <div className="min-w-0 flex-1 truncate text-sm font-semibold text-primary md:hidden">Two D Medium Clinic</div>
            <div className="hidden flex-1 md:block" />
            {me && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-muted" aria-label="Account menu">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {initials(me.fullName)}
                    </span>
                    <span className="hidden leading-tight sm:block">
                      <span className="block text-sm font-medium">{me.fullName}</span>
                      <span className="block text-xs text-muted-foreground">{me.roles.map((r) => ROLE_LABELS[r]).join(", ") || "No role assigned"}</span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="text-sm font-medium">{me.fullName}</div>
                    <div className="truncate text-xs text-muted-foreground">{me.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/profile"><UserCircle className="mr-2 h-4 w-4" />My profile</Link></DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>
          <main className="flex-1 p-4 md:p-6"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

/** Shown when a page's data fails to load. */
export function LoadError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <div className="font-medium text-destructive">Could not load this information.</div>
      <div className="mt-1 text-muted-foreground">{message ?? "Check the internet connection and try again."}</div>
      {onRetry && <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-muted-foreground" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />{label}
    </div>
  );
}

/** Renders children only for staff whose role may use this area. */
export function RequireArea({ area, children }: { area: Area; children: ReactNode }) {
  const { data: me, isLoading } = useStaff();
  if (isLoading) return <PageLoading />;
  if (!me || !canAccess(me.roles, area)) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-lg border bg-card p-6 text-center">
        <h2 className="text-lg font-semibold">No access</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your role does not include this section. Contact the administrator if you need access.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
