import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Network hiccups must not sign people out: only redirect when there is
    // genuinely no stored session.
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user ?? null;
    } catch {
      user = null;
    }
    if (!user) {
      try {
        const { data } = await supabase.auth.getSession();
        user = data.session?.user ?? null;
      } catch {
        user = null;
      }
    }
    if (!user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user };
  },
  component: () => <Outlet />,
});
