import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Compass, Star } from "lucide-react";

const CATEGORIES = [
  { key: "thumbnail", label: "Thumbnails", emoji: "🖼️" },
  { key: "editing", label: "Editing", emoji: "✂️" },
  { key: "vfx", label: "VFX", emoji: "✨" },
  { key: "models", label: "Models", emoji: "🧱" },
  { key: "server-dev", label: "Server Devs", emoji: "🖥️" },
  { key: "website-dev", label: "Website Devs", emoji: "🌐" },
  { key: "plugin-dev", label: "Plugin Devs", emoji: "🔌" },
  { key: "skin-maker", label: "Skin Makers", emoji: "🧍" },
  { key: "designer", label: "Designers", emoji: "🎨" },
  { key: "order-request", label: "Order Requests", emoji: "📦" },
];

type Sample = {
  id: string;
  title: string;
  image_url: string;
  price: number;
  category: string;
  designer_id: string;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MCtech — Minecraft Technology for Creators" },
      { name: "description", content: "Thumbnails, editing, VFX, models, plugins and more from vetted Minecraft designers." },
      { property: "og:title", content: "MCtech — Minecraft Technology" },
      { property: "og:description", content: "The neon-purple marketplace for Minecraft creator services." },
    ],
  }),
  component: Home,
});

function Home() {
  const [suggestions, setSuggestions] = useState<Sample[]>([]);
  useEffect(() => {
    // Suggested = approved samples ordered newest; rating filter applied when we have enough data.
    supabase
      .from("samples")
      .select("id,title,image_url,price,category,designer_id")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setSuggestions((data as Sample[]) ?? []));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-16">
      {/* Hero */}
      <section className="text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">Welcome to</p>
        <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
          <span className="neon-gradient-text">MCtech</span>{" "}
          <span className="text-foreground">= Minecraft Technology</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-muted-foreground">
          Level up your channel. Order thumbnails, editing, VFX, models, plugins and more —
          straight from creators-turned-designers.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="neon-glow">
            <Link to="/browse"><Compass className="mr-2 h-5 w-5" />Explore services</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/apply"><Sparkles className="mr-2 h-5 w-5" />Apply as designer</Link>
          </Button>
        </div>
      </section>

      {/* Ad banner slot */}
      <section className="mt-12">
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground">
          Add your ad here
        </div>
      </section>

      {/* Suggestions */}
      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">-- Suggestions --</h2>
          <Link to="/browse" className="text-sm text-muted-foreground hover:text-primary">See all →</Link>
        </div>
        {suggestions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {suggestions.map((s) => (
              <Link key={s.id} to="/samples/$id" params={{ id: s.id }} className="w-64 shrink-0">
                <Card className="overflow-hidden neon-border transition hover:neon-glow">
                  <img src={s.image_url} alt={s.title} className="h-36 w-full object-cover" loading="lazy" />
                  <div className="p-3">
                    <p className="line-clamp-1 text-sm font-medium">{s.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">₹{s.price}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Category chips */}
      <section className="mt-14">
        <h2 className="mb-5 text-xl font-semibold">Choose your category</h2>
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.key}
              to="/category/$cat"
              params={{ cat: c.key }}
              className="group rounded-full glass px-4 py-2 text-sm transition hover:neon-glow"
            >
              <span className="mr-2">{c.emoji}</span>
              <span className="group-hover:neon-gradient-text">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Discord */}
      <section className="mt-16 mb-4">
        <Card className="flex flex-col items-center gap-3 p-8 text-center glass">
          <Star className="h-8 w-8 text-primary" />
          <h3 className="text-xl font-semibold neon-gradient-text">Join our Discord</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Chat with designers, get updates on new drops, and be first to hear about limited slots.
          </p>
          <Button asChild variant="outline">
            <a href="https://discord.gg/" target="_blank" rel="noreferrer">Open Discord</a>
          </Button>
        </Card>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="p-8 text-center glass">
      <p className="text-sm text-muted-foreground">
        No samples yet. <span className="neon-gradient-text font-semibold">Coming soon</span> — join our Discord for more information.
      </p>
    </Card>
  );
}
