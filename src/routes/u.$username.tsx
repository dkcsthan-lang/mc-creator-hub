import { SampleImage } from "@/components/SampleImage";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, MessageSquare, UserPlus, UserCheck, Package, Star } from "lucide-react";
import { useSession } from "@/lib/session";
import { toast } from "sonner";
import { levelFromCompleted } from "@/lib/mctech";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — OnlyCreators` },
      { name: "description", content: `Portfolio of @${params.username} on OnlyCreators.` },
      { property: "og:title", content: `@${params.username} — OnlyCreators` },
      { property: "og:description", content: `Portfolio of @${params.username} on OnlyCreators.` },
    ],
  }),
  component: Portfolio,
});

type Profile = {
  id: string; username: string | null; display_name: string | null; bio: string | null;
  avatar_url: string | null; banner_url: string | null; designer_tag: string | null;
  years_experience: number | null; completed_orders: number;
};
type Sample = { id: string; title: string; image_url: string; price: number };

function Portfolio() {
  const { username } = useParams({ from: "/u/$username" });
  const { user } = useSession();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [avg, setAvg] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);

  useEffect(() => {
    if (!username) return;
    supabase.from("profiles").select("*").eq("username", username).maybeSingle().then(async ({ data }) => {
      const p = data as Profile | null;
      setProfile(p);
      if (!p) return;
      const [{ data: s }, { data: r }, { count: fc }] = await Promise.all([
        supabase.from("samples").select("id,title,image_url,price").eq("designer_id", p.id).eq("status", "approved").order("created_at", { ascending: false }),
        supabase.from("sample_ratings").select("rating, samples!inner(designer_id)").eq("samples.designer_id", p.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("designer_id", p.id),
      ]);
      setSamples((s as Sample[]) ?? []);
      const ratings = ((r as any[]) ?? []).map((x) => x.rating as number);
      setAvg({ avg: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0, count: ratings.length });
      setFollowers(fc ?? 0);
      if (user) {
        const { data: f } = await supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("designer_id", p.id).maybeSingle();
        setFollowing(!!f);
      }
    });
  }, [username, user?.id]);

  // realtime rating updates
  useEffect(() => {
    if (!profile) return;
    const ch = supabase
      .channel("ratings-" + profile.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "sample_ratings" }, async () => {
        const { data: r } = await supabase.from("sample_ratings").select("rating, samples!inner(designer_id)").eq("samples.designer_id", profile.id);
        const ratings = ((r as any[]) ?? []).map((x) => x.rating as number);
        setAvg({ avg: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0, count: ratings.length });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id]);

  async function toggleFollow() {
    if (!user || !profile) { nav({ to: "/auth" }); return; }
    if (user.id === profile.id) return;
    if (following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("designer_id", profile.id);
      setFollowing(false); setFollowers((n) => Math.max(0, n - 1));
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, designer_id: profile.id });
      if (error) return toast.error(error.message);
      setFollowing(true); setFollowers((n) => n + 1);
    }
  }

  if (!profile) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;

  const level = levelFromCompleted(profile.completed_orders ?? 0);
  const isSelf = user?.id === profile.id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Banner — only rendered when the user actually uploaded one */}
      {bannerUrl && (
        <div className="mb-6 h-40 overflow-hidden rounded-xl border border-border/60 sm:h-56">
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {/* Identity + actions */}
      <div className={"flex flex-col gap-4 px-2 sm:flex-row sm:items-end sm:justify-between " + (bannerUrl ? "-mt-16" : "")}>
        <div className="flex min-w-0 items-end gap-4">
          <UserAvatar
            src={profile.avatar_url}
            gifSrc={(profile as any).gif_avatar_url}
            className="h-24 w-24 shrink-0 border-4 border-background shadow-lg"
            iconClassName="h-8 w-8"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary ring-1 ring-primary/30">
                {profile.designer_tag || "Designer"}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{level.label}</span>
            </div>
            {profile.bio && (
              <p className="mt-2 max-w-md whitespace-pre-wrap text-sm text-muted-foreground">{profile.bio}</p>
            )}
          </div>
        </div>

        {!isSelf && (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={toggleFollow} variant={following ? "outline" : "default"} className={following ? "" : "neon-glow"}>
              {following ? <><UserCheck className="mr-1 h-4 w-4" />Following</> : <><UserPlus className="mr-1 h-4 w-4" />Follow</>}
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="Message">
              <Link to="/messages/$userId" params={{ userId: profile.id }}><MessageSquare className="h-4 w-4" /></Link>
            </Button>
            <Button asChild className="neon-glow">
              <Link to="/orders/new" search={{ designer: profile.id }}><Package className="mr-1 h-4 w-4" />Place order</Link>
            </Button>
          </div>
        )}
      </div>



      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard label="Rank & level" value={`${profile.designer_tag || "Designer"} · ${level.label}`} />
        <StatCard label="Experience" value={profile.years_experience ? `${profile.years_experience} yr${profile.years_experience > 1 ? "s" : ""}` : "—"} />
        <StatCard label="Orders done" value={String(profile.completed_orders ?? 0)} />
      </div>

      {/* Rating bar */}
      <Card className="mt-4 p-4 glass">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Average rating</p>
          <p className="text-xs text-muted-foreground">{avg.count} rating{avg.count === 1 ? "" : "s"} · {followers} follower{followers === 1 ? "" : "s"}</p>
        </div>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={"h-6 w-6 " + (n <= Math.round(avg.avg) ? "fill-primary text-primary" : "text-muted-foreground/40")} />
          ))}
          <span className="ml-2 text-sm font-medium">{avg.avg.toFixed(1)} / 5</span>
        </div>
      </Card>

      {/* Samples */}
      <h2 className="mb-3 mt-8 text-lg font-semibold">Samples</h2>
      {samples.length === 0 ? (
        <Card className="p-8 text-center glass"><p className="text-sm text-muted-foreground">No approved samples yet.</p></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {samples.map((s) => (
            <Link key={s.id} to="/samples/$id" params={{ id: s.id }}>
              <Card className="overflow-hidden neon-border transition hover:neon-glow">
                <SampleImage src={s.image_url} alt={s.title} className="h-40 w-full object-cover" loading="lazy" />
                <div className="p-3"><p className="line-clamp-1 text-sm font-medium">{s.title}</p><p className="mt-1 text-xs text-muted-foreground">₹{s.price}</p></div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3 glass">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </Card>
  );
}
