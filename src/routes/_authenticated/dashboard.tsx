import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Upload, Package, Eye, Star } from "lucide-react";

const CATEGORIES = ["thumbnail","editing","vfx","models","server-dev","website-dev","plugin-dev","skin-maker","designer"];
const GAME_TYPES = ["minecraft","roblox","other"];

type Sample = { id: string; title: string; image_url: string; price: number; category: string; status: string; views: number; likes: number };

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Designer dashboard — MCtech" }, { name: "description", content: "Manage your samples, orders, and sales on MCtech." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSession();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [orders, setOrders] = useState<{ price: number; status: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(100);
  const [category, setCategory] = useState("thumbnail");
  const [gameType, setGameType] = useState("minecraft");
  const [file, setFile] = useState<File | null>(null);

  async function refresh() {
    if (!user) return;
    const { data: s } = await supabase.from("samples").select("*").eq("designer_id", user.id).order("created_at", { ascending: false });
    setSamples((s as Sample[]) ?? []);
    const { data: o } = await supabase.from("orders").select("price,status").eq("designer_id", user.id);
    setOrders((o as any) ?? []);
  }
  useEffect(() => { refresh(); }, [user?.id]);

  async function uploadSample(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !file) return;
    setBusy(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("samples").upload(path, file);
    if (up.error) { setBusy(false); return toast.error(up.error.message); }
    const { data: pub } = supabase.storage.from("samples").getPublicUrl(path);
    const { error } = await supabase.from("samples").insert({ designer_id: user.id, title, price, category, game_type: gameType, image_url: pub.publicUrl });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Sample submitted for admin approval");
    setTitle(""); setFile(null);
    refresh();
  }

  async function del(id: string) {
    if (!confirm("Delete this sample?")) return;
    const { error } = await supabase.from("samples").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  const sales = orders.filter((o) => o.status === "paid").reduce((a, b) => a + b.price, 0);
  const completed = orders.filter((o) => o.status === "paid").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold neon-gradient-text">Designer dashboard</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Total sales" value={`₹${sales}`} />
        <Stat label="Orders completed" value={String(completed)} />
        <Stat label="Approved samples" value={String(samples.filter((s) => s.status === "approved").length)} />
      </div>

      <Card className="mb-8 p-6 glass">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Upload className="h-4 w-4" />Upload sample</h2>
        <form onSubmit={uploadSample} className="grid gap-3 sm:grid-cols-2">
          <div><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Game type</Label>
            <Select value={gameType} onValueChange={setGameType}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GAME_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Price (₹)</Label><Input type="number" min={10} required value={price} onChange={(e) => setPrice(parseInt(e.target.value || "0"))} /></div>
          <div className="sm:col-span-2"><Label>Image (PNG/JPG)</Label><Input type="file" accept="image/*" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          <Button disabled={busy} className="sm:col-span-2 neon-glow">{busy ? "Uploading..." : "Submit sample"}</Button>
        </form>
      </Card>

      <h2 className="mb-3 text-lg font-semibold">My samples</h2>
      {samples.length === 0 ? (
        <Card className="p-6 text-center glass"><p className="text-sm text-muted-foreground">No samples yet.</p></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {samples.map((s) => (
            <Card key={s.id} className="overflow-hidden neon-border">
              <SampleImage src={s.image_url} alt={s.title} className="h-40 w-full object-cover" />
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <p className="line-clamp-1 text-sm font-medium">{s.title}</p>
                  <span className={"rounded px-2 py-0.5 text-[10px] " + (s.status === "approved" ? "bg-primary/20 text-primary" : s.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground")}>{s.status}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>₹{s.price}</span>
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
