import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Megaphone, Plus } from "lucide-react";

type Ad = { id: string; title: string; destination_url: string; image_path: string };

export function SponsorBanner() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sponsor_ads")
        .select("id,title,destination_url,image_path,expires_at,starts_at")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
      const row = (data?.[0] as Ad) ?? null;
      setAd(row);
      if (row) {
        const { data: s } = await supabase.storage.from("sponsors").createSignedUrl(row.image_path, 3600);
        setImgUrl(s?.signedUrl ?? null);
      }
    })();
  }, []);

  if (ad && imgUrl) {
    return (
      <a
        href={ad.destination_url}
        target="_blank"
        rel="noreferrer noopener"
        className="relative mt-10 block overflow-hidden rounded-2xl border border-primary/40 shadow-[0_0_40px_-15px_color-mix(in_oklab,var(--neon-purple)_60%,transparent)] transition hover:border-primary"
      >
        <div className="relative aspect-[6/1] w-full bg-card/50 sm:aspect-[8/1]">
          <img src={imgUrl} alt={ad.title} className="h-full w-full object-cover" />
          <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur">Sponsored</div>
        </div>
      </a>
    );
  }

  return (
    <Link
      to="/sponsor"
      className="group relative mt-10 flex items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-8 text-center transition hover:border-primary hover:from-primary/10 hover:to-primary/15"
    >
      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30 transition group-hover:scale-110">
        <Megaphone className="h-5 w-5" />
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold">Show your ad here</p>
        <p className="text-xs text-muted-foreground">Banner sponsorships from ₹500 · Click to configure</p>
      </div>
      <Plus className="ml-2 h-5 w-5 text-primary opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}
