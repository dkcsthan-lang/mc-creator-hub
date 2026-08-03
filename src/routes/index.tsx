import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SampleImage } from "@/components/SampleImage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Compass, Sparkles, ShieldCheck, Zap, Users, ArrowRight,
  Image as ImageIcon, Scissors, Wand2, Boxes, Server, Globe, Plug, User, Film, Palette, Hammer, Package, Layers, Flame, Star, Heart, Crown,
} from "lucide-react";
import { DISCORD_INVITE_URL } from "@/lib/mctech";
import { SponsorBanner } from "@/components/SponsorBanner";

const CATEGORIES = [
  { key: "thumbnail", label: "Thumbnails", desc: "Click-worthy cover art", Icon: ImageIcon },
  { key: "editing", label: "Video Editing", desc: "Cuts, pacing, polish", Icon: Scissors },
  { key: "cinematics", label: "Cinematics", desc: "Story-driven trailers", Icon: Film },
  { key: "vfx", label: "VFX", desc: "Motion & visual effects", Icon: Wand2 },
  { key: "gfx-designers", label: "GFX Designers", desc: "Logos, banners, branding", Icon: Palette },
  { key: "models", label: "3D Models", desc: "Blockbench & rigs", Icon: Boxes },
  { key: "minecraft-builds", label: "Minecraft Builds", desc: "Maps, spawns, hubs", Icon: Hammer },
  { key: "resource-packs", label: "Resource Packs", desc: "Textures & sounds", Icon: Layers },
  { key: "mod-developers", label: "Mod Developers", desc: "Forge & Fabric mods", Icon: Package },
  { key: "server-dev", label: "Server Dev", desc: "Setup, config, systems", Icon: Server },
  { key: "website-dev", label: "Web Dev", desc: "Landing & store fronts", Icon: Globe },
  { key: "plugin-dev", label: "Plugins", desc: "Custom Java & Bukkit", Icon: Plug },
  { key: "skin-maker", label: "Skins", desc: "Custom character skins", Icon: User },
];

type Sample = { id: string; title: string; image_url: string; price: number; category: string; designer_id: string };
type Designer = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; designer_tag: string | null; completed_orders: number };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OnlyCreators — Minecraft creator services, done properly" },
      { name: "description", content: "A curated marketplace for Minecraft creators. Thumbnails, editing, VFX, models, plugins and more — from vetted professional designers." },
      { property: "og:title", content: "OnlyCreators — Minecraft creator services" },
      { property: "og:description", content: "Vetted designers, transparent pricing, secure delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [suggestions, setSuggestions] = useState<Sample[]>([]);
  const [trending, setTrending] = useState<Sample[]>([]);
  const [mostLiked, setMostLiked] = useState<Sample[]>([]);
  const [mostRated, setMostRated] = useState<Sample[]>([]);
  const [popularDesigners, setPopularDesigners] = useState<Designer[]>([]);
  const [designerOfMonth, setDesignerOfMonth] = useState<Designer | null>(null);

  useEffect(() => {
    (async () => {
      const [rec, trend, liked] = await Promise.all([
        supabase.from("samples").select("id,title,image_url,price,category,designer_id").eq("status", "approved").order("created_at", { ascending: false }).limit(8),
        supabase.from("samples").select("id,title,image_url,price,category,designer_id").eq("status", "approved").order("views", { ascending: false }).limit(8),
        supabase.from("samples").select("id,title,image_url,price,category,designer_id").eq("status", "approved").order("likes", { ascending: false }).limit(8),
      ]);
      setSuggestions((rec.data as Sample[]) ?? []);
      setTrending((trend.data as Sample[]) ?? []);
      setMostLiked((liked.data as Sample[]) ?? []);

      // most rated — aggregate sample_ratings on client
      const { data: ratings } = await supabase.from("sample_ratings").select("sample_id, rating");
      const bySample = new Map<string, { sum: number; n: number }>();
      for (const r of (ratings ?? []) as any[]) {
        const acc = bySample.get(r.sample_id) ?? { sum: 0, n: 0 };
        acc.sum += r.rating; acc.n += 1;
        bySample.set(r.sample_id, acc);
      }
      const topIds = Array.from(bySample.entries())
        .filter(([, v]) => v.n >= 1)
        .sort((a, b) => (b[1].sum / b[1].n) - (a[1].sum / a[1].n))
        .slice(0, 8)
        .map(([id]) => id);
      if (topIds.length) {
        const { data: mr } = await supabase.from("samples").select("id,title,image_url,price,category,designer_id").in("id", topIds).eq("status", "approved");
        setMostRated((mr as Sample[]) ?? []);
      }

      // popular designers by follower count
      const { data: follows } = await supabase.from("follows").select("designer_id");
      const count = new Map<string, number>();
      for (const f of (follows ?? []) as any[]) count.set(f.designer_id, (count.get(f.designer_id) ?? 0) + 1);
      const topDesignerIds = Array.from(count.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
      if (topDesignerIds.length) {
        const { data: pd } = await supabase.from("profiles").select("id,username,display_name,avatar_url,designer_tag,completed_orders").in("id", topDesignerIds);
        setPopularDesigners((pd as Designer[]) ?? []);
      }

      // designer of the month = highest completed_orders (last 30d) via orders
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data: recentOrders } = await supabase.from("orders").select("designer_id").eq("status", "completed").gte("updated_at", since);
      const ordCount = new Map<string, number>();
      for (const o of (recentOrders ?? []) as any[]) ordCount.set(o.designer_id, (ordCount.get(o.designer_id) ?? 0) + 1);
      const top = Array.from(ordCount.entries()).sort((a, b) => b[1] - a[1])[0];
      if (top) {
        const { data: dm } = await supabase.from("profiles").select("id,username,display_name,avatar_url,designer_tag,completed_orders").eq("id", top[0]).maybeSingle();
        setDesignerOfMonth(dm as Designer | null);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-14 sm:pt-20">
      {/* Hero */}
      <section className="relative text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Curated Minecraft creator marketplace
        </div>
        <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Ship a channel that <span className="neon-gradient-text">actually looks the part</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Thumbnails, editing, VFX, models, plugins and full server setups —
          from vetted professionals. Transparent pricing, secure delivery, zero guesswork.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="neon-glow">
            <Link to="/browse"><Compass className="mr-2 h-4 w-4" />Explore services</Link>
          </Button>
          {!isSeller && (
            <Button asChild size="lg" variant="outline">
              <Link to="/apply"><Sparkles className="mr-2 h-4 w-4" />Join as a designer</Link>
            </Button>
          )}
          {isSeller && (
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard"><Sparkles className="mr-2 h-4 w-4" />Your dashboard</Link>
            </Button>
          )}
        </div>

      </section>

      {/* Sponsor banner */}
      <SponsorBanner />

      {/* Trust strip */}
      <section className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TrustItem Icon={ShieldCheck} title="Vetted designers" body="Every seller is manually reviewed before their work is listed." />
        <TrustItem Icon={Zap} title="Fast turnaround" body="Direct chat with your designer. Deadlines set upfront." />
        <TrustItem Icon={Users} title="Built for creators" body="Made by Minecraft creators, for Minecraft creators." />
      </section>

      <SampleRow title="Recent samples" eyebrow="Featured work" data={suggestions} />
      <SampleRow title="Trending now" eyebrow="Hot" Icon={Flame} data={trending} />
      <SampleRow title="Most rated" eyebrow="Community favourites" Icon={Star} data={mostRated} />
      <SampleRow title="Most liked" eyebrow="Fan-favourites" Icon={Heart} data={mostLiked} />

      {/* Popular designers */}
      {popularDesigners.length > 0 && (
        <section className="mt-20">
          <SectionHeader eyebrow="Talent" title="Popular designers" Icon={Crown} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {popularDesigners.map((d) => (
              <Link key={d.id} to="/u/$username" params={{ username: d.username ?? "" }} className="group">
                <Card className="flex flex-col items-center gap-2 p-4 text-center glass transition hover:neon-glow">
                  <Avatar className="h-14 w-14"><AvatarImage src={d.avatar_url ?? undefined} /><AvatarFallback><User /></AvatarFallback></Avatar>
                  <p className="line-clamp-1 text-sm font-medium">{d.display_name || d.username}</p>
                  <p className="text-[10px] text-muted-foreground">{d.designer_tag || "Designer"}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Designer of the month */}
      {designerOfMonth && (
        <section className="mt-16">
          <SectionHeader eyebrow="Spotlight" title="Designer of the month" Icon={Crown} />
          <Link to="/u/$username" params={{ username: designerOfMonth.username ?? "" }}>
            <Card className="flex items-center gap-4 p-6 glass transition hover:neon-glow">
              <Avatar className="h-16 w-16"><AvatarImage src={designerOfMonth.avatar_url ?? undefined} /><AvatarFallback><User /></AvatarFallback></Avatar>
              <div>
                <p className="text-lg font-semibold">{designerOfMonth.display_name || designerOfMonth.username}</p>
                <p className="text-xs text-muted-foreground">{designerOfMonth.designer_tag || "Designer"} · {designerOfMonth.completed_orders} orders completed</p>
              </div>
            </Card>
          </Link>
        </section>
      )}

      {/* Categories */}
      <section className="mt-20">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Services</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Find the right specialist</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          {CATEGORIES.map(({ key, label, desc, Icon }) => (
            <Link
              key={key}
              to="/category/$cat"
              params={{ cat: key }}
              className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/40 p-5 backdrop-blur transition hover:border-primary/50 hover:bg-card/70"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <h3 className="mt-4 text-sm font-semibold tracking-tight">{label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Discord CTA */}
      <section className="mt-20">
        <Card className="relative overflow-hidden border-primary/30 bg-card/60 p-10 text-center backdrop-blur">
          <div className="pointer-events-none absolute inset-0 opacity-60"
               style={{ background: "radial-gradient(ellipse at center, color-mix(in oklab, var(--neon-purple) 20%, transparent), transparent 60%)" }} />
          <div className="relative">
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Talk to the crew. <span className="neon-gradient-text">Join our Discord community.</span>
            </h3>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              Chat with designers and creators, get feedback, and hear about upcoming drops.
            </p>
            <Button asChild size="lg" className="mt-6 neon-glow">
              <a href={DISCORD_INVITE_URL} target="_blank" rel="noreferrer">Join our Discord community</a>
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}

function SectionHeader({ eyebrow, title, Icon }: { eyebrow: string; title: string; Icon?: any }) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {Icon && <Icon className="h-5 w-5 text-primary" />}{title}
        </h2>
      </div>
    </div>
  );
}

function SampleRow({ title, eyebrow, Icon, data }: { title: string; eyebrow: string; Icon?: any; data: Sample[] }) {
  if (data.length === 0) return null;
  return (
    <section className="mt-16">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {Icon && <Icon className="h-5 w-5 text-primary" />}{title}
          </h2>
        </div>
        <Link to="/browse" className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary">
          Browse all <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data.slice(0, 8).map((s) => (
          <Link key={s.id} to="/samples/$id" params={{ id: s.id }} className="group">
            <Card className="overflow-hidden border-border/50 bg-card/60 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_0_40px_-10px_color-mix(in_oklab,var(--neon-purple)_50%,transparent)]">
              <div className="relative aspect-[4/3] overflow-hidden">
                <SampleImage src={s.image_url} alt={s.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
              </div>
              <div className="p-3">
                <p className="line-clamp-1 text-sm font-medium">{s.title}</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs capitalize text-muted-foreground">{s.category.replace("-", " ")}</p>
                  <p className="text-sm font-semibold neon-gradient-text">₹{s.price}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TrustItem({ Icon, title, body }: { Icon: any; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
