import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireArea } from "@/lib/auth";

// Friendly alias: /admin/go-live always lands on the deployment checklist.
export const Route = createFileRoute("/_authenticated/admin/go-live")({
  beforeLoad: async (args) => {
    await requireArea("admin")(args);
    throw redirect({ to: "/admin/deployment", replace: true });
  },
  component: () => null,
});
