import { createFileRoute, redirect, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, LoadError, PageLoading } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } });
  },
  pendingComponent: () => <div className="p-6"><PageLoading /></div>,
  errorComponent: AuthedError,
  component: AppShell,
});

function AuthedError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="mx-auto mt-12 max-w-md p-4">
      <LoadError message={(error as Error).message} onRetry={() => { router.invalidate(); reset(); }} />
    </div>
  );
}
