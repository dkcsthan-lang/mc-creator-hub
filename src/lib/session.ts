import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type Role = "customer" | "designer" | "admin";

export type MctechProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  gif_avatar_url: string | null;
  membership: string;
  designer_tag: string | null;
  is_banned: boolean;
  allowed_categories: string[];
  years_experience: number | null;
  completed_orders: number;
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useRoles() {
  const { user } = useSession();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) { setRoles([]); setLoading(false); return; }
    setLoading(true);
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      setRoles(((data ?? []) as { role: Role }[]).map((r) => r.role));
      setLoading(false);
    });
  }, [user?.id]);
  return { roles, loading, isAdmin: roles.includes("admin"), isDesigner: roles.includes("designer") };
}

export function useProfile() {
  const { user } = useSession();
  const [profile, setProfile] = useState<MctechProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) { setProfile(null); setLoading(false); return; }
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile((data as MctechProfile | null) ?? null);
      setLoading(false);
    });
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  return { profile, loading, setProfile, refresh: load };
}
