import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — MCtech" }] }),
  component: Admin,
});

function Admin() {
  const { isAdmin, loading } = useRoles();
  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;
  if (!isAdmin) return <div className="p-10 text-center text-destructive">Admins only.</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold neon-gradient-text">Admin</h1>
      <Tabs defaultValue="apps">
        <TabsList>
          <TabsTrigger value="apps">Applications</TabsTrigger>
          <TabsTrigger value="samples">Samples</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="apps"><Applications /></TabsContent>
        <TabsContent value="samples"><SamplesPanel /></TabsContent>
        <TabsContent value="reports"><ReportsPanel /></TabsContent>
        <TabsContent value="users"><UsersPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function Applications() {
  const [rows, setRows] = useState<any[]>([]);
  async function refresh() {
    const { data } = await supabase.from("designer_applications").select("*").eq("status", "pending").order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { refresh(); }, []);

  async function decide(app: any, approve: boolean) {
    const status: "approved" | "rejected" = approve ? "approved" : "rejected";
    await supabase.from("designer_applications").update({ status: status as any, reviewed_at: new Date().toISOString() }).eq("id", app.id);
    if (approve) {
      await supabase.from("user_roles").insert({ user_id: app.user_id, role: "designer" });
      await supabase.from("notifications").insert({ user_id: app.user_id, type: "app_approved", title: "You're a designer!", body: "Your application was approved. Start uploading samples.", link: "/dashboard" });
    } else {
      await supabase.from("notifications").insert({ user_id: app.user_id, type: "app_rejected", title: "Application update", body: "Your designer application was not accepted this time." });
    }
    toast.success(status);
    refresh();
  }

  if (rows.length === 0) return <Card className="mt-4 p-6 text-center glass"><p className="text-sm text-muted-foreground">No pending applications.</p></Card>;
  return (
    <div className="mt-4 space-y-3">
      {rows.map((r) => (
        <Card key={r.id} className="p-4 glass">
          <p className="text-xs text-muted-foreground">Contact: {r.contact} • Category: {r.category} • Age: {r.age_group}</p>
          <p className="mt-2 text-sm"><strong>Intro:</strong> {r.intro}</p>
          <p className="mt-2 text-sm"><strong>Why:</strong> {r.why_join}</p>
          {r.portfolio_url && <p className="mt-2 text-sm">Portfolio: <a href={r.portfolio_url} target="_blank" rel="noreferrer" className="text-primary underline">{r.portfolio_url}</a></p>}
          {r.extra && <p className="mt-2 text-sm text-muted-foreground">{r.extra}</p>}
          <div className="mt-4 flex gap-2">
            <Button onClick={() => decide(r, true)} className="neon-glow">Approve</Button>
            <Button onClick={() => decide(r, false)} variant="outline">Reject</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SamplesPanel() {
  const [rows, setRows] = useState<any[]>([]);
  async function refresh() {
    const { data } = await supabase.from("samples").select("*").eq("status", "pending").order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { refresh(); }, []);

  async function decide(id: string, status: "approved" | "rejected") {
    await supabase.from("samples").update({ status }).eq("id", id);
    toast.success(status);
    refresh();
  }

  if (rows.length === 0) return <Card className="mt-4 p-6 text-center glass"><p className="text-sm text-muted-foreground">No pending samples.</p></Card>;
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((s) => (
        <Card key={s.id} className="overflow-hidden glass">
          <img src={s.image_url} alt={s.title} className="h-40 w-full object-cover" />
          <div className="p-3">
            <p className="font-medium">{s.title}</p>
            <p className="text-xs text-muted-foreground">₹{s.price} • {s.category}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => decide(s.id, "approved")} className="neon-glow">Approve</Button>
              <Button size="sm" variant="outline" onClick={() => decide(s.id, "rejected")}>Reject</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ReportsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  async function refresh() {
    const { data } = await supabase.from("reports").select("*").eq("status", "open").order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { refresh(); }, []);
  async function close(id: string) {
    await supabase.from("reports").update({ status: "closed" }).eq("id", id);
    refresh();
  }
  if (rows.length === 0) return <Card className="mt-4 p-6 text-center glass"><p className="text-sm text-muted-foreground">No open reports.</p></Card>;
  return (
    <div className="mt-4 space-y-3">
      {rows.map((r) => (
        <Card key={r.id} className="p-4 glass">
          <p className="text-xs text-muted-foreground">Target: {r.target_type} / {r.target_id}</p>
          <p className="mt-1 text-sm">{r.reason}</p>
          <Button size="sm" onClick={() => close(r.id)} className="mt-3">Close</Button>
        </Card>
      ))}
    </div>
  );
}

function UsersPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  async function refresh() {
    let query = supabase.from("profiles").select("id,username,display_name,email").limit(50);
    if (q) query = query.ilike("username", `%${q}%`);
    const { data } = await query;
    setRows(data ?? []);
  }
  useEffect(() => { refresh(); }, [q]);

  async function ban(id: string) {
    await supabase.from("profiles").update({ is_banned: true }).eq("id", id);
    toast.success("Banned");
    refresh();
  }
  async function unban(id: string) {
    await supabase.from("profiles").update({ is_banned: false }).eq("id", id);
    refresh();
  }

  return (
    <div className="mt-4 space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username..." className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm" />
      {rows.map((u) => (
        <Card key={u.id} className="flex items-center justify-between p-3 glass">
          <div><p className="text-sm font-medium">{u.display_name || u.username}</p><p className="text-xs text-muted-foreground">@{u.username} — {u.email}</p></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => ban(u.id)}>Ban</Button>
            <Button size="sm" variant="ghost" onClick={() => unban(u.id)}>Unban</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
