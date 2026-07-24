import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIES = ["thumbnail","editing","vfx","models","server-dev","website-dev","plugin-dev","skin-maker","designer"];

export const Route = createFileRoute("/_authenticated/orders/new")({
  validateSearch: (s) => z.object({ designer: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "New order — MCtech" }] }),
  component: NewOrder,
});

type Designer = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

function NewOrder() {
  const { user } = useSession();
  const nav = useNavigate();
  const search = useSearch({ from: "/_authenticated/orders/new" });
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Designer[]>([]);
  const [chosen, setChosen] = useState<Designer | null>(null);

  const [form, setForm] = useState({ category: "thumbnail", details: "", reference_url: "", price: 100, deadline: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (search.designer) {
      supabase.from("profiles").select("id,username,display_name,avatar_url").eq("id", search.designer).maybeSingle().then(({ data }) => data && setChosen(data as Designer));
    }
  }, [search.designer]);

  useEffect(() => {
    if (!q) return setResults([]);
    supabase.from("user_roles").select("user_id").eq("role", "designer").then(async ({ data }) => {
      const ids = ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
      if (ids.length === 0) return setResults([]);
      const { data: p } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", ids).ilike("username", `%${q}%`).limit(10);
      setResults((p as Designer[]) ?? []);
    });
  }, [q]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !chosen) return toast.error("Pick a designer first.");
    setBusy(true);
    const { data: order, error } = await supabase.from("orders").insert({
      customer_id: user.id, designer_id: chosen.id, category: form.category, details: form.details,
      reference_url: form.reference_url || null, price: form.price, deadline: form.deadline || null,
    }).select("id").single();
    if (error || !order) { setBusy(false); return toast.error(error?.message ?? "Failed"); }

    const paths: string[] = [];
    for (const f of files) {
      const path = `${order.id}/${Date.now()}-${f.name}`;
      const up = await supabase.storage.from("order-files").upload(path, f);
      if (!up.error) paths.push(path);
    }
    if (paths.length) await supabase.from("orders").update({ attachment_paths: paths }).eq("id", order.id);

    await supabase.from("notifications").insert({
      user_id: chosen.id, type: "order_request", title: "New order request",
      body: `You have a new ${form.category} order request for ₹${form.price}.`, link: `/orders/${order.id}`,
    });

    setBusy(false);
    toast.success("Order sent!");
    nav({ to: "/orders/$id", params: { id: order.id } });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold neon-gradient-text">Place an order</h1>

      {!chosen ? (
        <Card className="p-4 glass">
          <Label>Search a designer by username</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a username..." className="mt-2" />
          <div className="mt-3 space-y-2">
            {results.map((r) => (
              <button key={r.id} onClick={() => setChosen(r)} className="flex w-full items-center justify-between rounded-md border border-border/60 bg-card/50 p-3 text-left hover:neon-glow">
                <span>{r.display_name || r.username}</span>
                <span className="text-xs text-muted-foreground">@{r.username}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-6 glass">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Ordering from</p>
              <p className="font-medium">{chosen.display_name || chosen.username}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setChosen(null)}>Change</Button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Reference image URL (optional)</Label><Input value={form.reference_url} onChange={(e) => setForm({ ...form, reference_url: e.target.value })} /></div>
            <div><Label>Details</Label><Textarea required rows={4} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></div>
            <div><Label>Attach files (any type)</Label><Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price (₹)</Label><Input type="number" min={10} value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value || "0") })} /></div>
              <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
            </div>
            <Button disabled={busy} className="w-full neon-glow">{busy ? "Sending..." : "Send order request"}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
