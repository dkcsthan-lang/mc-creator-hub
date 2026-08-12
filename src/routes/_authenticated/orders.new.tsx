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
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/mctech";
import { UserAvatar } from "@/components/UserAvatar";


export const Route = createFileRoute("/_authenticated/orders/new")({
  validateSearch: (s) => z.object({ designer: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "New order — OnlyCreators" }] }),
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

  const [form, setForm] = useState({ title: "", category: "thumbnail", details: "", reference_url: "", price: 500, budget_min: 100, budget_max: 1000, deadline: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (search.designer) {
      supabase.from("profiles").select("id,username,display_name,avatar_url").eq("id", search.designer).maybeSingle().then(({ data }) => data && setChosen(data as Designer));
    }
  }, [search.designer]);

  // Load every designer once so the picker is never an empty box.
  useEffect(() => {
    supabase.from("user_roles").select("user_id").eq("role", "designer").then(async ({ data }) => {
      const ids = ((data ?? []) as { user_id: string }[]).map((r) => r.user_id).filter((id) => id !== user?.id);
      if (ids.length === 0) return setResults([]);
      const { data: p } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", ids).limit(100);
      setResults((p as Designer[]) ?? []);
    });
  }, [user?.id]);

  const visible = results.filter((r) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (r.username ?? "").toLowerCase().includes(t) || (r.display_name ?? "").toLowerCase().includes(t);
  });


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !chosen) return toast.error("Pick a designer first.");
    if (chosen.id === user.id) return toast.error("You can't place an order with yourself — pick another designer.");
    if (!form.deadline) return toast.error("Set a deadline.");
    if (form.budget_min > form.budget_max) return toast.error("Budget max must be ≥ min.");
    setBusy(true);
    const { data: order, error } = await supabase.from("orders").insert({
      customer_id: user.id, designer_id: chosen.id, title: form.title, category: form.category, details: form.details,
      reference_url: form.reference_url || null, price: form.price,
      budget_min: form.budget_min, budget_max: form.budget_max,
      deadline: form.deadline || null,
    }).select("id").single();
    if (error || !order) { setBusy(false); return toast.error(error?.message ?? "Could not create the order."); }

    const paths: string[] = [];
    for (const f of files) {
      const path = `${order.id}/${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
      const up = await supabase.storage.from("order-files").upload(path, f);
      if (up.error) toast.error(`Could not upload ${f.name}: ${up.error.message}`);
      else paths.push(path);
    }
    if (paths.length) await supabase.from("orders").update({ attachment_paths: paths }).eq("id", order.id);

    setBusy(false);
    toast.success("Order sent! The designer has been notified.");
    nav({ to: "/orders/$id", params: { id: order.id } });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold neon-gradient-text">Place an order</h1>

      {!chosen ? (
        <Card className="p-4 glass">
          <Label>Choose a designer</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or username..." className="mt-2" />
          <div className="mt-3 space-y-2">
            {visible.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {results.length === 0 ? "No approved designers are available yet." : "No designer matches that search."}
              </p>
            )}
            {visible.map((r) => (
              <button key={r.id} onClick={() => setChosen(r)} className="flex w-full items-center gap-3 rounded-md border border-border/60 bg-card/50 p-3 text-left hover:neon-glow">
                <UserAvatar src={r.avatar_url} className="h-9 w-9 shrink-0" iconClassName="h-4 w-4" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.display_name || r.username}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{r.username}</span>
                </span>
                <span className="shrink-0 text-xs text-primary">Select</span>
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
            <div><Label>Order title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Gaming channel thumbnail" /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Details</Label><Textarea required rows={4} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Describe what you need..." /></div>
            <div><Label>Reference image URL (optional)</Label><Input value={form.reference_url} onChange={(e) => setForm({ ...form, reference_url: e.target.value })} /></div>
            <div><Label>Attach files (optional)</Label><Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Budget min (₹)</Label><Input type="number" min={10} value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: parseInt(e.target.value || "0") })} /></div>
              <div><Label>Budget max (₹)</Label><Input type="number" min={10} value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: parseInt(e.target.value || "0") })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Offered price (₹)</Label><Input type="number" min={10} value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value || "0") })} /></div>
              <div><Label>Deadline (order expires after this)</Label><Input type="date" required value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
            </div>
            <Button disabled={busy} className="w-full neon-glow">{busy ? "Sending..." : "Submit order"}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
