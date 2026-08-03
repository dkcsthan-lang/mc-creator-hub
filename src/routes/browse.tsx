import { SampleImage } from "@/components/SampleImage";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Search } from "lucide-react";

type Sample = {
  id: string; title: string; image_url: string; price: number; category: string;
  designer_id: string; created_at: string;
};

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Explore services — OnlyCreators" },
      { name: "description", content: "Browse approved thumbnails, edits, VFX, and more from OnlyCreators designers." },
      { property: "og:title", content: "Explore services — OnlyCreators" },
      { property: "og:description", content: "Browse approved samples across every category." },
    ],
  }),
  component: Browse,
});

type Filter = "recent" | "under100" | "under200" | "under500" | "rating4";

function Browse() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("recent");
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase
      .from("samples")
      .select("id,title,image_url,price,category,designer_id,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setSamples((data as Sample[]) ?? []));
    supabase.from("sample_ratings").select("sample_id,rating").then(({ data }) => {
      const acc: Record<string, { sum: number; n: number }> = {};
      for (const r of (data ?? []) as { sample_id: string; rating: number }[]) {
        acc[r.sample_id] ??= { sum: 0, n: 0 };
        acc[r.sample_id].sum += r.rating;
        acc[r.sample_id].n += 1;
      }
      const out: Record<string, number> = {};
      for (const k in acc) out[k] = acc[k].sum / acc[k].n;
      setRatings(out);
    });
  }, []);

  const filtered = useMemo(() => {
    return samples.filter((s) => {
      if (q && !s.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "under100" && s.price >= 100) return false;
      if (filter === "under200" && s.price >= 200) return false;
      if (filter === "under500" && s.price >= 500) return false;
      if (filter === "rating4" && (ratings[s.id] ?? 0) < 4) return false;
      return true;
    });
  }, [samples, q, filter, ratings]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search samples..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <DropdownMenuRadioItem value="recent">Recently uploaded</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="under100">Under ₹100</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="under200">Under ₹200</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="under500">Under ₹500</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="rating4">Rating 4+</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center glass">
          <p className="text-sm text-muted-foreground">
            No samples match. <span className="neon-gradient-text font-semibold">Coming soon</span> — join our Discord for more information.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((s) => (
            <Link key={s.id} to="/samples/$id" params={{ id: s.id }}>
              <Card className="overflow-hidden neon-border transition hover:neon-glow">
                <SampleImage src={s.image_url} alt={s.title} className="h-40 w-full object-cover" loading="lazy" />
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-medium">{s.title}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>₹{s.price}</span>
                    {ratings[s.id] ? <span>★ {ratings[s.id].toFixed(1)}</span> : null}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
