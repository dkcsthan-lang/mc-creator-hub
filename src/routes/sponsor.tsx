import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SPONSOR_DURATIONS, SPONSOR_GIF_ADDON_PRICE } from "@/lib/mctech";
import { Megaphone, ArrowLeft, LogIn, Sparkles } from "lucide-react";

export const Route = createFileRoute("/sponsor")({
  head: () => ({
    meta: [
      { title: "Sponsor a banner — OnlyCreators" },
      { name: "description", content: "Put your ad on the OnlyCreators homepage banner. Pick a duration, upload your banner, and go live." },
      { property: "og:title", content: "Sponsor a banner — OnlyCreators" },
      { property: "og:description", content: "Homepage banner sponsorships for Minecraft brands, servers and creators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sponsor,
});

function Sponsor() {
  const { user } = useSession();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [destUrl, setDestUrl] = useState("");
  const [duration, setDuration] = useState(SPONSOR_DURATIONS[0].key as string);
  const [gifEnabled, setGifEnabled] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const dur = SPONSOR_DURATIONS.find((d) => d.key === duration)!;
  const total = dur.price + (gifEnabled ? SPONSOR_GIF_ADDON_PRICE : 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to submit your sponsorship.");
      nav({ to: "/auth", search: { redirect: "/sponsor" } });
      return;
    }
    if (!file) return toast.error("Upload a banner image or GIF.");
    if (!destUrl.startsWith("http")) return toast.error("Destination link must be a full URL.");
    const isGif = file.type === "image/gif" || /\.gif$/i.test(file.name);
    if (isGif && !gifEnabled) return toast.error(`Enable the GIF add-on (+₹${SPONSOR_GIF_ADDON_PRICE}) to use an animated banner.`);
    setBusy(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("sponsors").upload(path, file);
      if (upErr) throw new Error(upErr.message);

      const expires = new Date(Date.now() + dur.days * 86400_000).toISOString();
      const { data: row, error } = await supabase.from("sponsor_ads").insert({
        user_id: user.id, title, destination_url: destUrl,
        image_path: path, duration_days: dur.days, price: total,
        gif_enabled: gifEnabled, status: "draft", expires_at: expires,
      } as any).select("id").single();
      if (error || !row) throw new Error(error?.message ?? "Could not create sponsorship");

      nav({ to: "/pay/$kind/$id", params: { kind: "sponsor", id: (row as any).id } });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit your ad. Please try again.");
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => nav({ to: "/" })} className="mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>

      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Advertise</p>
          <h1 className="text-3xl font-bold neon-gradient-text">Sponsor a banner</h1>
        </div>
      </div>

      {!user && (
        <Card className="mb-4 flex items-center justify-between gap-3 p-4 glass">
          <p className="text-sm text-muted-foreground">Sign in to complete your sponsorship.</p>
          <Button asChild size="sm" variant="outline">
            <Link to="/auth" search={{ redirect: "/sponsor" }}><LogIn className="mr-1 h-4 w-4" />Sign in</Link>
          </Button>
        </Card>
      )}

      <Card className="p-6 glass">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label>Destination link</Label>
            <Input required type="url" placeholder="https://your-link.com" value={destUrl} onChange={(e) => setDestUrl(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Opens when someone clicks your banner.</p>
          </div>
          <div>
            <Label>Ad title</Label>
            <Input required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Banner image or GIF (16:9)</Label>
            <Input required type="file" accept="image/*,image/gif" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="mt-1 text-xs text-muted-foreground">Displayed in YouTube-banner 16:9 ratio — 1920×1080 recommended.</p>
          </div>

          <button
            type="button"
            onClick={() => setGifEnabled((v) => !v)}
            className={
              "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition " +
              (gifEnabled ? "border-primary bg-primary/15" : "border-border/60 bg-card/40 hover:border-primary/40")
            }
          >
            <span className={"mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border " + (gifEnabled ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
              {gifEnabled && <Sparkles className="h-3 w-3" />}
            </span>
            <span>
              <span className="block text-sm font-semibold">Animated GIF banner (+₹{SPONSOR_GIF_ADDON_PRICE})</span>
              <span className="block text-xs text-muted-foreground">Enable this to upload an animated GIF instead of a static image.</span>
            </span>
          </button>

          <div>
            <Label>Duration</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SPONSOR_DURATIONS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDuration(d.key)}
                  className={
                    "rounded-md border p-3 text-left transition " +
                    (duration === d.key
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 bg-card/40 hover:border-primary/40")
                  }
                >
                  <p className="text-sm font-semibold">{d.label}</p>
                  <p className="text-xs text-muted-foreground">₹{d.price}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm">
            <p className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-bold neon-gradient-text">₹{total}</span>
            </p>
            {gifEnabled && <p className="mt-1 text-xs text-muted-foreground">Includes GIF add-on ₹{SPONSOR_GIF_ADDON_PRICE}</p>}
          </div>

          <Button disabled={busy} type="submit" className="w-full neon-glow">
            {busy ? "Submitting..." : "Continue to pay & submit"}
          </Button>

        </form>
      </Card>
    </div>
  );
}
