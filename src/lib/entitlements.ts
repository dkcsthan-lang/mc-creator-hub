import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export type Entitlements = {
  loading: boolean;
  badgeKey: string | null;
  membership: string;
  isSupreme: boolean;
  /** Exclusive-badge designers and Supreme creators can attach files in chat. */
  canAttachFiles: boolean;
};

/** Reads the signed-in user's purchased badge / membership perks. */
export function useEntitlements(): Entitlements {
  const { user } = useSession();
  const [state, setState] = useState<Entitlements>({
    loading: true,
    badgeKey: null,
    membership: "starter",
    isSupreme: false,
    canAttachFiles: false,
  });

  useEffect(() => {
    if (!user) {
      setState({ loading: false, badgeKey: null, membership: "starter", isSupreme: false, canAttachFiles: false });
      return;
    }
    let alive = true;
    (async () => {
      const [{ data: p }, { data: ranks }] = await Promise.all([
        supabase.from("profiles").select("designer_badge,membership").eq("id", user.id).maybeSingle(),
        supabase.from("user_ranks").select("rank,expires_at").eq("user_id", user.id).eq("rank", "supreme"),
      ]);
      if (!alive) return;
      const badgeKey = (p as any)?.designer_badge ?? null;
      const membership = (p as any)?.membership ?? "starter";
      const rankSupreme = ((ranks as any[]) ?? []).some((r) => new Date(r.expires_at) > new Date());
      const isSupreme = membership === "supreme" || rankSupreme;
      setState({
        loading: false,
        badgeKey,
        membership,
        isSupreme,
        canAttachFiles: isSupreme || badgeKey === "exclusive_badge",
      });
    })();
    return () => { alive = false; };
  }, [user?.id]);

  return state;
}
