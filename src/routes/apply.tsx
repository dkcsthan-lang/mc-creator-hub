import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

const CATEGORIES = ["thumbnail","editing","model-maker","skin-maker","server-dev","website-dev","vfx","animation","other"];

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
  const [form, setForm] = useState({ contact: "", intro: "", category: "thumbnail", portfolio_url: "", age_group: "16+", why_join: "", extra: "" });
  const [files, setFiles] = useState<File[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { toast.error("Please sign in first."); nav({ to: "/auth", search: { redirect: "/apply" } }); return; }
    setBusy(true);
    const paths: string[] = [];
    for (const f of files) {
      const path = `${user.id}/${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from("applications").upload(path, f);
      if (error) { toast.error(`Upload failed: ${error.message}`); setBusy(false); return; }
      paths.push(path);
    }
    const { error } = await supabase.from("designer_applications").insert({
      user_id: user.id, ...form, samples_paths: paths,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted! Admin will review it.");
    nav({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-bold neon-gradient-text">Apply as designer</h1>
      <p className="mb-6 text-sm text-muted-foreground">Admins review every application before your samples go live.</p>
      <Card className="p-6 glass">
        <form onSubmit={submit} className="space-y-5">
          <div><Label>1. Where should we contact you? (Discord/email/phone)</Label><Input required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
          <div><Label>2. Samples (upload files)</Label><Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></div>
          <div><Label>3. Introduce yourself</Label><Textarea required rows={3} value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} /></div>
          <div>
            <Label>4. Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>5. Portfolio link (optional)</Label><Input type="url" value={form.portfolio_url} onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} /></div>
          <div>
            <Label>6. Age</Label>
            <RadioGroup value={form.age_group} onValueChange={(v) => setForm({ ...form, age_group: v })} className="mt-2 flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="16+" id="a1" /><Label htmlFor="a1">16+</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="16-" id="a2" /><Label htmlFor="a2">16-</Label></div>
            </RadioGroup>
          </div>
          <div><Label>7. Why do you want to join us?</Label><Textarea required rows={3} value={form.why_join} onChange={(e) => setForm({ ...form, why_join: e.target.value })} /></div>
          <div><Label>8. Anything else? (optional)</Label><Textarea rows={2} value={form.extra} onChange={(e) => setForm({ ...form, extra: e.target.value })} /></div>
          <Button disabled={busy} type="submit" className="w-full neon-glow">{busy ? "Submitting..." : "Submit application"}</Button>
        </form>
      </Card>
    </div>
  );
}
