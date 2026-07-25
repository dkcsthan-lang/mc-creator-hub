import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/mctech";

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Apply as designer — MCtech" },
      { name: "description", content: "Apply to sell your Minecraft creator services on MCtech." },
      { property: "og:title", content: "Apply as designer — MCtech" },
      { property: "og:description", content: "Apply to sell your Minecraft creator services on MCtech." },
    ],
  }),
  component: Apply,
});

function Apply() {
  const { user } = useSession();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ contact: "", intro: "", portfolio_url: "", age_group: "16+", why_join: "", extra: "", years_experience: 1 });
  const [cats, setCats] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  function toggleCat(c: string) {
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { toast.error("Please sign in first."); nav({ to: "/auth", search: { redirect: "/apply" } }); return; }
    if (cats.length === 0) return toast.error("Pick at least one category you offer.");
    setBusy(true);
    const paths: string[] = [];
    for (const f of files) {
      const path = `${user.id}/${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from("applications").upload(path, f);
      if (error) { toast.error(`Upload failed: ${error.message}`); setBusy(false); return; }
      paths.push(path);
    }
    const { error } = await supabase.from("designer_applications").insert({
      user_id: user.id, ...form, category: cats[0], categories: cats, samples_paths: paths,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted! Admin will review it.");
    nav({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-bold neon-gradient-text">Apply as designer</h1>
      <p className="mb-6 text-sm text-muted-foreground">Admins review every application. Pick every category you'd like to sell in — you'll be able to upload samples only in those categories.</p>
      <Card className="p-6 glass">
        <form onSubmit={submit} className="space-y-5">
          <div><Label>Contact (Discord / email / phone)</Label><Input required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>

          <div>
            <Label>Categories you offer</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-card/40 p-2 text-sm hover:border-primary/60">
                  <Checkbox checked={cats.includes(c)} onCheckedChange={() => toggleCat(c)} />
                  <span>{CATEGORY_LABELS[c] ?? c}</span>
                </label>
              ))}
            </div>
          </div>

          <div><Label>Years of experience</Label><Input type="number" min={0} max={40} required value={form.years_experience} onChange={(e) => setForm({ ...form, years_experience: parseInt(e.target.value || "0") })} /></div>
          <div><Label>Sample files (upload a few of your best)</Label><Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></div>
          <div><Label>Introduce yourself</Label><Textarea required rows={3} value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} /></div>
          <div><Label>Portfolio link (optional)</Label><Input type="url" value={form.portfolio_url} onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} /></div>
          <div>
            <Label>Age</Label>
            <RadioGroup value={form.age_group} onValueChange={(v) => setForm({ ...form, age_group: v })} className="mt-2 flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="16+" id="a1" /><Label htmlFor="a1">16+</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="16-" id="a2" /><Label htmlFor="a2">Under 16</Label></div>
            </RadioGroup>
          </div>
          <div><Label>Why do you want to join us?</Label><Textarea required rows={3} value={form.why_join} onChange={(e) => setForm({ ...form, why_join: e.target.value })} /></div>
          <div><Label>Anything else? (optional)</Label><Textarea rows={2} value={form.extra} onChange={(e) => setForm({ ...form, extra: e.target.value })} /></div>
          <Button disabled={busy} type="submit" className="w-full neon-glow">{busy ? "Submitting..." : "Submit application"}</Button>
        </form>
      </Card>
    </div>
  );
}
