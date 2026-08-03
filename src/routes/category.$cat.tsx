import { SampleImage } from "@/components/SampleImage";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

const LABELS: Record<string, { label: string; emoji: string }> = {
  thumbnail: { label: "Thumbnails", emoji: "🖼️" },
  editing: { label: "Editing", emoji: "✂️" },
  vfx: { label: "VFX", emoji: "✨" },
  models: { label: "Models", emoji: "🧱" },
  "server-dev": { label: "Server Devs", emoji: "🖥️" },
  "website-dev": { label: "Website Devs", emoji: "🌐" },
  "plugin-dev": { label: "Plugin Devs", emoji: "🔌" },
  "skin-maker": { label: "Skin Makers", emoji: "🧍" },
  designer: { label: "Designers", emoji: "🎨" },
  "order-request": { label: "Order Requests", emoji: "📦" },
};

type Sample = { id: string; title: string; image_url: string; price: number; designer_id: string };

export const Route = createFileRoute("/category/$cat")({
  head: ({ params }) => {
    const l = LABELS[params.cat]?.label ?? params.cat;
    return {
      meta: [
        { title: `${l} — OnlyCreators` },
        { name: "description", content: `Browse ${l.toLowerCase()} from OnlyCreators designers.` },
        { property: "og:title", content: `${l} — OnlyCreators` },
        { property: "og:description", content: `Approved ${l.toLowerCase()} samples on OnlyCreators.` },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { cat } = useParams({ from: "/category/$cat" });
  const meta = LABELS[cat] ?? { label: cat, emoji: "📦" };
  const [samples, setSamples] = useState<Sample[]>([]);
  useEffect(() => {
    supabase
      .from("samples")
      .select("id,title,image_url,price,designer_id")
      .eq("status", "approved")
      .eq("category", cat)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSamples((data as Sample[]) ?? []));
  }, [cat]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold"><span className="mr-2">{meta.emoji}</span><span className="neon-gradient-text">{meta.label}</span></h1>
      {samples.length === 0 ? (
        <Card className="p-10 text-center glass">
          <p className="text-sm text-muted-foreground">
            No samples in this category yet. <span className="neon-gradient-text font-semibold">Coming soon</span> — join our Discord for more information.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {samples.map((s) => (
            <Link key={s.id} to="/samples/$id" params={{ id: s.id }}>
              <Card className="overflow-hidden neon-border transition hover:neon-glow">
                <SampleImage src={s.image_url} alt={s.title} className="h-40 w-full object-cover" loading="lazy" />
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-medium">{s.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">₹{s.price}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
