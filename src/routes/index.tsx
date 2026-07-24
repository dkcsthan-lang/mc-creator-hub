import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Compass, Sparkles, ShieldCheck, Zap, Users, ArrowRight,
  Image as ImageIcon, Scissors, Wand2, Boxes, Server, Globe, Plug, User, PenTool,
} from "lucide-react";

const CATEGORIES = [
  { key: "thumbnail", label: "Thumbnails", desc: "Click-worthy cover art", Icon: ImageIcon },
  { key: "editing", label: "Video Editing", desc: "Cuts, pacing, polish", Icon: Scissors },
  { key: "vfx", label: "VFX", desc: "Motion & visual effects", Icon: Wand2 },
  { key: "models", label: "3D Models", desc: "Blockbench & rigs", Icon: Boxes },
  { key: "server-dev", label: "Server Dev", desc: "Setup, config, systems", Icon: Server },
  { key: "website-dev", label: "Web Dev", desc: "Landing & store fronts", Icon: Globe },
  { key: "plugin-dev", label: "Plugins", desc: "Custom Java & Bukkit", Icon: Plug },
  { key: "skin-maker", label: "Skins", desc: "Custom character skins", Icon: User },
  { key: "designer", label: "Graphics", desc: "Logos, banners, branding", Icon: PenTool },
];

type Sample = { id: string; title: string; image_url: string; price: number; category: string; designer_id: string };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MCtech — Minecraft creator services, done properly" },
      { name: "description", content: "A curated marketplace for Minecraft creators. Thumbnails, editing, VFX, models, plugins and more — from vetted professional designers." },
      { property: "og:title", content: "MCtech — Minecraft creator services" },
      { property: "og:description", content: "Vetted designers, transparent pricing, secure delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [suggestions, setSuggestions] = useState<Sample[]>([]);
  useEffect(() => {
    supabase.from("samples").select("id,title,image_url,price,category,designer_id")
      .eq("status", "approved").order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => setSuggestions((data as Sample[]) ?? []));
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
          <Button asChild size="lg" variant="outline">
            <Link to="/apply"><Sparkles className="mr-2 h-4 w-4" />Join as a designer</Link>
          </Button>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TrustItem Icon={ShieldCheck} title="Vetted designers" body="Every seller is manually reviewed before their work is listed." />
        <TrustItem Icon={Zap} title="Fast turnaround" body="Direct chat with your designer. Deadlines set upfront." />
        <TrustItem Icon={Users} title="Built for creators" body="Made by Minecraft creators, for Minecraft creators." />
      </section>

      {/* Suggestions */}
      <section className="mt-20">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Featured work</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Recent samples</h2>
          </div>
          <Link to="/browse" className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-primary">
            Browse all <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
        {suggestions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {suggestions.map((s) => (
              <Link key={s.id} to="/samples/$id" params={{ id: s.id }} className="group">
                <Card className="overflow-hidden border-border/50 bg-card/60 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_0_40px_-10px_color-mix(in_oklab,var(--neon-purple)_50%,transparent)]">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={s.image_url} alt={s.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
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
        )}
      </section>

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

      {/* CTA */}
      <section className="mt-20">
        <Card className="relative overflow-hidden border-primary/30 bg-card/60 p-10 text-center backdrop-blur">
          <div className="pointer-events-none absolute inset-0 opacity-60"
               style={{ background: "radial-gradient(ellipse at center, color-mix(in oklab, var(--neon-purple) 20%, transparent), transparent 60%)" }} />
          <div className="relative">
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Are you a designer? <span className="neon-gradient-text">Get paid for your craft.</span>
            </h3>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              Apply once. Get reviewed. Start earning from a growing audience of Minecraft creators.
            </p>
            <Button asChild size="lg" className="mt-6 neon-glow">
              <Link to="/apply">Apply as a designer</Link>
            </Button>
          </div>
        </Card>
      </section>
    </div>
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

function EmptyState() {
  return (
    <Card className="border-dashed border-border/60 bg-card/30 p-10 text-center backdrop-blur">
      <p className="text-sm text-muted-foreground">
        Fresh samples are being reviewed.{" "}
        <Link to="/browse" className="text-primary underline underline-offset-4">Browse the full catalogue</Link>.
      </p>
    </Card>
  );
}
