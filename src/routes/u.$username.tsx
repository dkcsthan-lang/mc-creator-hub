import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { User } from "lucide-react";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — MCtech` },
      { name: "description", content: `Portfolio of @${params.username} on MCtech.` },
      { property: "og:title", content: `@${params.username} — MCtech` },
      { property: "og:description", content: `Portfolio of @${params.username} on MCtech.` },
    ],
  }),
  component: Portfolio,
});

type Profile = { id: string; username: string | null; display_name: string | null; bio: string | null; avatar_url: string | null; banner_url: string | null };
type Sample = { id: string; title: string; image_url: string; price: number };

function Portfolio() {
  const { username } = useParams({ from: "/u/$username" });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);

  useEffect(() => {
    if (!username) return;
    supabase.from("profiles").select("*").eq("username", username).maybeSingle().then(({ data }) => {
      setProfile(data as Profile | null);
      if (data) {
        supabase.from("samples").select("id,title,image_url,price").eq("designer_id", data.id).eq("status", "approved").order("created_at", { ascending: false }).then(({ data: s }) => setSamples((s as Sample[]) ?? []));
      }
    });
  }, [username]);

  if (!profile) return <div className="p-10 text-center text-muted-foreground">Not found.</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {profile.banner_url && <img src={profile.banner_url} alt="banner" className="mb-4 h-40 w-full rounded-xl object-cover" />}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16"><AvatarImage src={profile.avatar_url ?? undefined} /><AvatarFallback><User /></AvatarFallback></Avatar>
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-1 max-w-xl text-sm">{profile.bio}</p>}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Samples</h2>
      {samples.length === 0 ? (
        <Card className="p-8 text-center glass"><p className="text-sm text-muted-foreground">No approved samples yet.</p></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {samples.map((s) => (
            <Link key={s.id} to="/samples/$id" params={{ id: s.id }}>
              <Card className="overflow-hidden neon-border transition hover:neon-glow">
                <img src={s.image_url} alt={s.title} className="h-40 w-full object-cover" loading="lazy" />
                <div className="p-3"><p className="line-clamp-1 text-sm font-medium">{s.title}</p><p className="mt-1 text-xs text-muted-foreground">₹{s.price}</p></div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
