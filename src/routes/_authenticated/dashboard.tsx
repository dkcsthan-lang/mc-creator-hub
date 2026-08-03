import { SampleImage } from "@/components/SampleImage";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Plus, Eye, Star } from "lucide-react";
import { categoryMedia, CATEGORY_LABELS } from "@/lib/mctech";

type Sample = {
  id: string; title: string; image_url: string; price: number; category: string; status: string;
  views: number; likes: number; media_type: string; gallery_paths: string[]; server_id: string | null;
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Designer dashboard — OnlyCreators" }, { name: "description", content: "Manage your samples, orders, and sales on OnlyCreators." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSession();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [orders, setOrders] = useState<{ price: number; status: string }[]>([]);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  async function refresh() {
    if (!user) return;
    const [{ data: s }, { data: o }, { data: p }] = await Promise.all([
      supabase.from("samples").select("*").eq("designer_id", user.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("price,status").eq("designer_id", user.id),
      supabase.from("profiles").select("allowed_categories").eq("id", user.id).maybeSingle(),
    ]);
    setSamples((s as Sample[]) ?? []);
    setOrders((o as any) ?? []);
    setAllowed(((p as any)?.allowed_categories as string[]) ?? []);
  }
  useEffect(() => { refresh(); }, [user?.id]);

  async function del(id: string) {
    if (!confirm("Delete this sample?")) return;
    const { error } = await supabase.from("samples").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  const paid = orders.filter((o) => o.status === "paid" || o.status === "completed");
  const sales = paid.reduce((a, b) => a + b.price, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold neon-gradient-text">Designer dashboard</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="neon-glow rounded-full px-6"><Plus className="mr-2 h-5 w-5" />New sample</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="neon-gradient-text">Upload a new sample</DialogTitle></DialogHeader>
            {allowed.length === 0 ? (
              <p className="text-sm text-muted-foreground">Your designer application is still being reviewed, or no categories are approved yet.</p>
            ) : (
              <UploadWizard allowed={allowed} onDone={() => { setOpen(false); refresh(); }} />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total earnings" value={`₹${sales}`} />
        <Stat label="Orders completed" value={String(paid.length)} />
        <Stat label="Approved samples" value={String(samples.filter((s) => s.status === "approved").length)} />
        <Stat label="Categories" value={String(allowed.length)} />
      </div>

      <h2 className="mb-3 text-lg font-semibold">My samples</h2>
      {samples.length === 0 ? (
        <Card className="p-6 text-center glass"><p className="text-sm text-muted-foreground">No samples yet — click "New sample" to upload your first.</p></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {samples.map((s) => (
            <Card key={s.id} className="overflow-hidden neon-border">
              {s.media_type === "server-id" ? (
                <div className="flex h-40 items-center justify-center bg-muted/30 text-xs text-muted-foreground">{s.server_id ?? "server"}</div>
              ) : (
                <SampleImage src={s.image_url} alt={s.title} className="h-40 w-full object-cover" />
              )}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <p className="line-clamp-1 text-sm font-medium">{s.title}</p>
                  <span className={"rounded px-2 py-0.5 text-[10px] " + (s.status === "approved" ? "bg-primary/20 text-primary" : s.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground")}>{s.status}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>₹{s.price} · {CATEGORY_LABELS[s.category] ?? s.category}</span>
                  <span className="flex items-center gap-2"><Eye className="h-3 w-3" />{s.views} <Star className="ml-1 h-3 w-3" />{s.likes}</span>
                </div>
                <Button onClick={() => del(s.id)} variant="ghost" size="sm" className="mt-2 w-full text-destructive"><Trash2 className="mr-1 h-3 w-3" />Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 glass">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold neon-gradient-text">{value}</p>
    </Card>
  );
}

function UploadWizard({ allowed, onDone }: { allowed: string[]; onDone: () => void }) {
  const { user } = useSession();
  const [step, setStep] = useState<"cat" | "form">("cat");
  const [category, setCategory] = useState<string>(allowed[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(100);
  const [tagsStr, setTagsStr] = useState("");
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File[]>([]);
  const [serverId, setServerId] = useState("");
  const [busy, setBusy] = useState(false);

  const media = categoryMedia(category);

  async function upload(file: File, bucket = "samples") {
    const path = `${user!.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw new Error(error.message);
    return path;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const tags = tagsStr.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (tags.length === 0) return toast.error("Add at least one tag (comma separated).");
    setBusy(true);
    try {
      let image_url = "";
      let preview_path: string | null = null;
      let gallery_paths: string[] = [];
      let attachment_path: string | null = null;
      let server_id: string | null = null;

      if (media === "server-id") {
        if (!serverId.trim()) throw new Error("Server ID required");
        server_id = serverId.trim();
        if (mainFile) {
          const path = await upload(mainFile);
          image_url = path;
          preview_path = path;
        } else {
          image_url = "placeholder";
        }
      } else if (media === "zip-gallery") {
        if (!mainFile) throw new Error("Attach the ZIP / project file");
        if (gallery.length === 0) throw new Error("Add at least one showcase image");
        attachment_path = await upload(mainFile);
        preview_path = attachment_path;
        for (const f of gallery) gallery_paths.push(await upload(f));
        image_url = gallery_paths[0];
      } else if (media === "gallery-file") {
        if (gallery.length === 0) throw new Error("Add at least one showcase image");
        for (const f of gallery) gallery_paths.push(await upload(f));
        image_url = gallery_paths[0];
        if (attachFile) attachment_path = await upload(attachFile);
      } else if (media === "video-preview") {
        if (!mainFile) throw new Error("Upload the video");
        if (!previewImage) throw new Error("Upload a preview image");
        preview_path = await upload(mainFile);
        image_url = await upload(previewImage);
      } else {
        if (!mainFile) throw new Error("Upload the preview file");
        image_url = await upload(mainFile);
        preview_path = image_url;
      }

      const { error } = await supabase.from("samples").insert({
        designer_id: user.id, title, description, price, category, game_type: "minecraft",
        image_url, media_type: media, gallery_paths, server_id, preview_path,
        tags, attachment_path,
      } as any);
      if (error) throw new Error(error.message);
      toast.success("Sample submitted for admin approval");
      onDone();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (step === "cat") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Which category is this sample?</p>
        <div className="grid grid-cols-2 gap-2">
          {allowed.map((c) => (
            <button key={c} type="button"
              onClick={() => { setCategory(c); setStep("form"); }}
              className="rounded-md border border-border/60 bg-card/40 p-3 text-left text-sm hover:border-primary/60">
              {CATEGORY_LABELS[c] ?? c}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      <div className="text-xs text-muted-foreground">Category: <button type="button" className="underline" onClick={() => setStep("cat")}>{CATEGORY_LABELS[category] ?? category} — change</button></div>

      <div><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><Label>Short description (optional)</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div><Label>Price (₹)</Label><Input type="number" min={10} required value={price} onChange={(e) => setPrice(parseInt(e.target.value || "0"))} /></div>
      <div>
        <Label>Tags (required, comma-separated)</Label>
        <Input required placeholder="gaming, tutorial, vlog, minecraft" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} />
      </div>

      {media === "image-only" && (
        <div><Label>Preview image</Label><Input type="file" accept="image/*" required onChange={(e) => setMainFile(e.target.files?.[0] ?? null)} /></div>
      )}
      {media === "video" && (
        <div><Label>Preview (video or image)</Label><Input type="file" accept="video/*,image/*" required onChange={(e) => setMainFile(e.target.files?.[0] ?? null)} /></div>
      )}
      {media === "video-preview" && (
        <>
          <div><Label>Video file</Label><Input type="file" accept="video/*" required onChange={(e) => setMainFile(e.target.files?.[0] ?? null)} /></div>
          <div><Label>Preview image (thumbnail)</Label><Input type="file" accept="image/*" required onChange={(e) => setPreviewImage(e.target.files?.[0] ?? null)} /></div>
        </>
      )}
      {media === "zip-gallery" && (
        <>
          <div><Label>Project file (ZIP or mod file)</Label><Input type="file" accept=".zip,.jar,.rar,application/zip,application/x-zip-compressed" required onChange={(e) => setMainFile(e.target.files?.[0] ?? null)} /></div>
          <div><Label>Showcase gallery (1 or more images)</Label><Input type="file" accept="image/*" multiple required onChange={(e) => setGallery(Array.from(e.target.files ?? []))} /></div>
        </>
      )}
      {media === "gallery-file" && (
        <>
          <div><Label>Showcase gallery (1 or more images)</Label><Input type="file" accept="image/*" multiple required onChange={(e) => setGallery(Array.from(e.target.files ?? []))} /></div>
          <div><Label>Attach file (optional — pack / schematic)</Label><Input type="file" onChange={(e) => setAttachFile(e.target.files?.[0] ?? null)} /></div>
        </>
      )}
      {media === "server-id" && (
        <>
          <div><Label>Server ID / IP</Label><Input required placeholder="e.g. bananasmp.fun" value={serverId} onChange={(e) => setServerId(e.target.value)} /></div>
          <div><Label>Optional banner image</Label><Input type="file" accept="image/*" onChange={(e) => setMainFile(e.target.files?.[0] ?? null)} /></div>
        </>
      )}

      <Button disabled={busy} type="submit" className="w-full neon-glow">{busy ? "Uploading..." : "Submit for review"}</Button>
    </form>
  );
}
