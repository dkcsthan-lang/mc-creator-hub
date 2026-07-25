import { SampleImage } from "@/components/SampleImage";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

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
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="apps">Applications</TabsTrigger>
          <TabsTrigger value="samples">Samples</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="recent">Recent users</TabsTrigger>
          <TabsTrigger value="users">Search users</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><Overview /></TabsContent>
        <TabsContent value="apps"><Applications /></TabsContent>
        <TabsContent value="samples"><SamplesPanel /></TabsContent>
        <TabsContent value="reports"><ReportsPanel /></TabsContent>
        <TabsContent value="recent"><RecentUsers /></TabsContent>
        <TabsContent value="users"><UsersPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      const [u, d, apps, s, o, r] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "designer"),
        supabase.from("designer_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("samples").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["requested", "pending", "accepted"]),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);
      setStats({
        users: u.count ?? 0, designers: d.count ?? 0,
        pending_apps: apps.count ?? 0, pending_samples: s.count ?? 0,
        open_orders: o.count ?? 0, open_reports: r.count ?? 0,
      });
    })();
  }, []);
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard label="Total users" value={stats.users ?? 0} />
      <StatCard label="Designers" value={stats.designers ?? 0} />
      <StatCard label="Pending applications" value={stats.pending_apps ?? 0} />
      <StatCard label="Pending samples" value={stats.pending_samples ?? 0} />
      <StatCard label="Open orders" value={stats.open_orders ?? 0} />
      <StatCard label="Open reports" value={stats.open_reports ?? 0} />
    </div>
  );
}
function StatCard({ label, value }: { label: string; value: number }) {
  return <Card className="p-4 glass"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold neon-gradient-text">{value}</p></Card>;
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
    await (supabase.from("designer_applications") as any).update({ status, reviewed_at: new Date().toISOString() }).eq("id", app.id);
    if (approve) {
      await supabase.from("user_roles").insert({ user_id: app.user_id, role: "designer" });
      // grant allowed_categories + experience
      const cats = (app.categories as string[]) ?? [app.category];
      await supabase.from("profiles").update({ allowed_categories: cats, years_experience: app.years_experience ?? null }).eq("id", app.user_id);
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
          <p className="text-xs text-muted-foreground">Contact: {r.contact} • Categories: {((r.categories as string[]) ?? [r.category]).join(", ")} • {r.years_experience ?? "?"} yrs • Age: {r.age_group}</p>
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
          <SampleImage src={s.image_url} alt={s.title} className="h-40 w-full object-cover" />
          <div className="p-3">
            <p className="font-medium">{s.title}</p>
            <p className="text-xs text-muted-foreground">₹{s.price} • {s.category} • {s.media_type}</p>
            {s.server_id && <p className="text-xs text-muted-foreground">Server: {s.server_id}</p>}
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

function RecentUsers() {
  const [rows, setRows] = useState<any[]>([]);
  async function refresh() {
    const { data } = await supabase.from("profiles").select("id,username,display_name,avatar_url,is_banned,created_at").order("created_at", { ascending: false }).limit(30);
    setRows(data ?? []);
  }
  useEffect(() => { refresh(); }, []);
  async function ban(id: string, val: boolean) {
    await supabase.from("profiles").update({ is_banned: val }).eq("id", id);
    refresh();
  }
  return (
    <div className="mt-4 space-y-2">
      {rows.map((u) => (
        <Card key={u.id} className="flex items-center justify-between gap-3 p-3 glass">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9"><AvatarImage src={u.avatar_url ?? undefined} /><AvatarFallback><User className="h-3 w-3" /></AvatarFallback></Avatar>
            <div>
              <p className="text-sm font-medium">{u.display_name || u.username}</p>
              <p className="text-xs text-muted-foreground">@{u.username} · joined {new Date(u.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {u.is_banned ? (
              <Button size="sm" variant="ghost" onClick={() => ban(u.id, false)}>Unban</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => ban(u.id, true)}>Ban</Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function UsersPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  async function refresh() {
    let query = supabase.from("profiles").select("id,username,display_name,is_banned").limit(50);
    if (q) query = query.ilike("username", `%${q}%`);
    const { data } = await query;
    setRows(data ?? []);
  }
  useEffect(() => { refresh(); }, [q]);

  async function ban(id: string, val: boolean) {
    await supabase.from("profiles").update({ is_banned: val }).eq("id", id);
    refresh();
  }

  return (
    <div className="mt-4 space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username..." className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm" />
      {rows.map((u) => (
        <Card key={u.id} className="flex items-center justify-between p-3 glass">
          <div><p className="text-sm font-medium">{u.display_name || u.username}</p><p className="text-xs text-muted-foreground">@{u.username}{u.is_banned ? " · banned" : ""}</p></div>
          <div className="flex gap-2">
            {u.is_banned ? <Button size="sm" variant="ghost" onClick={() => ban(u.id, false)}>Unban</Button> : <Button size="sm" variant="outline" onClick={() => ban(u.id, true)}>Ban</Button>}
          </div>
        </Card>
      ))}
    </div>
  );
}
