import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";
import { useStorageUrl } from "@/components/StorageImage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, UserPlus, UserCheck, Gem, ShoppingBag, IndianRupee, CalendarDays } from "lucide-react";
import { useSession } from "@/lib/session";
import { toast } from "sonner";

export type CreatorProfileData = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  gif_avatar_url?: string | null;
  membership: string;
  created_at: string;
  orders_placed: number;
  total_spent: number;
  value_points: number;
  value_cycles: number;
};

const CYCLE_TARGET = 1000;

function valueTheme(cycles: number, orders: number) {
  if (orders >= 80)
    return {
      bar: "bg-gradient-to-r from-sky-300 via-cyan-200 to-sky-400",
      glow: "shadow-[0_0_28px_rgba(125,211,252,0.85)]",
      ring: "ring-sky-300/60",
      label: "Diamond",
      note: "Diamond tier — Supreme rank granted for 1 year",
    };
  if (cycles >= 3)
    return {
      bar: "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500",
      glow: "shadow-[0_0_24px_rgba(251,191,36,0.8)]",
      ring: "ring-amber-300/50",
      label: "Golden",
      note: "Golden yellow glow unlocked",
    };
  if (cycles === 2)
    return {
      bar: "bg-gradient-to-r from-yellow-300 to-yellow-500",
      glow: "shadow-[0_0_22px_rgba(250,204,21,0.75)]",
      ring: "ring-yellow-300/50",
      label: "Yellow",
      note: "Yellow glow unlocked",
    };
  if (cycles === 1)
    return {
      bar: "bg-gradient-to-r from-blue-400 to-sky-500",
      glow: "shadow-[0_0_22px_rgba(59,130,246,0.75)]",
      ring: "ring-blue-400/50",
      label: "Blue",
      note: "Blue glow unlocked",
    };
  return {
    bar: "bg-gradient-to-r from-primary/70 to-primary",
    glow: "",
    ring: "ring-border/60",
    label: "Starter",
    note: "Reach 1000 value to unlock your first glow",
  };
}

export function CreatorProfile({ profile }: { profile: CreatorProfileData }) {
  const { user } = useSession();
  const nav = useNavigate();
  const bannerUrl = useStorageUrl(profile.banner_url);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [supreme, setSupreme] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ count: fc }, { data: ranks }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("designer_id", profile.id),
        supabase.from("user_ranks").select("rank,expires_at").eq("user_id", profile.id),
      ]);
      if (cancelled) return;
      setFollowers(fc ?? 0);
      setSupreme(
        ((ranks as { rank: string; expires_at: string }[]) ?? []).some(
          (r) => r.rank === "supreme" && new Date(r.expires_at) > new Date(),
        ),
      );
      if (user) {
        const { data: f } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("designer_id", profile.id)
          .maybeSingle();
        if (!cancelled) setFollowing(!!f);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.id, user?.id]);

  async function toggleFollow() {
    if (!user) {
      nav({ to: "/auth" });
      return;
    }
    if (user.id === profile.id) return;
    if (following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("designer_id", profile.id);
      setFollowing(false);
      setFollowers((n) => Math.max(0, n - 1));
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, designer_id: profile.id });
      if (error) return toast.error(error.message);
      setFollowing(true);
      setFollowers((n) => n + 1);
    }
  }

  const isSelf = user?.id === profile.id;
  const orders = profile.orders_placed ?? 0;
  const cycles = profile.value_cycles ?? 0;
  const points = Math.max(0, Math.min(CYCLE_TARGET, profile.value_points ?? 0));
  const pct = (points / CYCLE_TARGET) * 100;
  const theme = valueTheme(cycles, orders);
  const roleTag = orders >= 1 ? "Creator" : "Customer";
  const memberFrom = new Date(profile.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {bannerUrl && (
        <div className="mb-6 h-40 overflow-hidden rounded-xl border border-border/60 sm:h-56">
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className={"flex flex-col gap-4 px-2 sm:flex-row sm:items-end sm:justify-between " + (bannerUrl ? "-mt-16" : "")}>
        <div className="flex min-w-0 items-end gap-4">
          <UserAvatar
            src={profile.avatar_url}
            gifSrc={profile.gif_avatar_url}
            className="h-24 w-24 shrink-0 border-4 border-background shadow-lg"
            iconClassName="h-8 w-8"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary ring-1 ring-primary/30">
                {roleTag}
              </span>
              {supreme && (
                <span className="flex items-center gap-1 rounded-full bg-sky-400/15 px-2 py-0.5 text-[11px] text-sky-300 ring-1 ring-sky-300/40 shadow-[0_0_14px_rgba(125,211,252,0.5)]">
                  <Gem className="h-3 w-3" />Supreme
                </span>
              )}
              {profile.membership && profile.membership !== "starter" && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                  {profile.membership}
                </span>
              )}
            </div>
            {profile.bio && <p className="mt-2 max-w-md whitespace-pre-wrap text-sm text-muted-foreground">{profile.bio}</p>}
          </div>
        </div>

        {!isSelf && (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={toggleFollow} variant={following ? "outline" : "default"} className={following ? "" : "neon-glow"}>
              {following ? (
                <>
                  <UserCheck className="mr-1 h-4 w-4" />Following
                </>
              ) : (
                <>
                  <UserPlus className="mr-1 h-4 w-4" />Follow
                </>
              )}
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="Message">
              <Link to="/messages/$userId" params={{ userId: profile.id }}>
                <MessageSquare className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard icon={<ShoppingBag className="h-3.5 w-3.5" />} label="Ordered" value={String(orders)} />
        <StatCard icon={<IndianRupee className="h-3.5 w-3.5" />} label="Total purchase" value={`₹${profile.total_spent ?? 0}`} />
        <StatCard icon={<CalendarDays className="h-3.5 w-3.5" />} label="Member from" value={memberFrom} />
      </div>

      {/* Value bar */}
      <Card className={"mt-4 p-4 glass ring-1 " + theme.ring}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Value bar</p>
          <p className="text-xs text-muted-foreground">
            {points} / {CYCLE_TARGET} · {followers} follower{followers === 1 ? "" : "s"}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={"h-full rounded-full transition-all duration-700 " + theme.bar + " " + theme.glow}
              style={{ width: `${Math.max(pct, points > 0 ? 4 : 0)}%` }}
            />
          </div>
          {cycles > 0 && (
            <span
              className={
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 " +
                theme.ring +
                " " +
                theme.glow +
                " bg-background/60"
              }
            >
              Level {cycles * 10}
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{theme.note}</p>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-3 glass">
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </Card>
  );
}
