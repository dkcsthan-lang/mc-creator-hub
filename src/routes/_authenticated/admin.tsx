import { SampleImage } from "@/components/SampleImage";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";
import { useRoles } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users, FileCheck, ImageIcon, Flag, IndianRupee,
  ShoppingBag, ChevronLeft, Shield, LayoutDashboard, Megaphone, Wallet,
} from "lucide-react";
import { CATEGORY_LABELS, DESIGNER_SLOTS, BADGE_META, DEFAULT_DESIGNER_SLOTS } from "@/lib/mctech";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — OnlyCreators" }] }),
  component: Admin,
});

type View = "home" | "users" | "apps" | "reports" | "samples" | "sponsors" | "payments";


function Admin() {
  const { isAdmin, loading } = useRoles();
  const [view, setView] = useState<View>("home");
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [u, d, apps, s, o, r, comp, sampAll, sp, pr, prPaid] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "designer"),
        supabase.from("designer_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("samples").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["requested", "pending", "accepted"]),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("orders").select("price").in("status", ["paid", "completed"]),
        supabase.from("samples").select("*", { count: "exact", head: true }),
        supabase.from("sponsor_ads").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("purchase_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("purchase_requests").select("price").eq("status", "approved"),
      ]);
      const orderRevenue = ((comp.data as any[]) ?? []).reduce((a, b) => a + (b.price ?? 0), 0);
      const storeRevenue = ((prPaid.data as any[]) ?? []).reduce((a, b) => a + (b.price ?? 0), 0);
      setStats({
        users: u.count ?? 0,
        designers: d.count ?? 0,
        pending_apps: apps.count ?? 0,
        pending_samples: s.count ?? 0,
        open_orders: o.count ?? 0,
        open_reports: r.count ?? 0,
        revenue: orderRevenue + storeRevenue,
        total_samples: sampAll.count ?? 0,
        pending_sponsors: sp.count ?? 0,
        pending_payments: pr.count ?? 0,
      });

    })();
  }, [isAdmin]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;
  if (!isAdmin) return <div className="p-10 text-center text-destructive">Admins only.</div>;

  if (view !== "home") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => setView("home")} className="mb-4">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to admin dashboard
        </Button>
        {view === "users" && <UsersPanel />}
        {view === "apps" && <Applications />}
        {view === "reports" && <ReportsPanel />}
        {view === "samples" && <SamplesPanel />}
        {view === "sponsors" && <SponsorsPanel />}
        {view === "payments" && <PaymentsPanel />}

      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
          <h1 className="text-3xl font-bold neon-gradient-text">Dashboard</h1>
        </div>
      </div>

      {/* Top stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total revenue" value={`₹${stats.revenue ?? 0}`} Icon={IndianRupee} accent="text-emerald-400" />
        <StatCard label="Total orders" value={stats.open_orders ?? 0} Icon={ShoppingBag} accent="text-blue-400" />
        <StatCard label="Total users" value={stats.users ?? 0} Icon={Users} accent="text-primary" />
        <StatCard label="Total samples" value={stats.total_samples ?? 0} Icon={ImageIcon} accent="text-amber-400" />
      </div>

      {/* Action cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard title="Manage users" desc="Recent signups, ban & unban" Icon={Users} count={stats.users ?? 0} onClick={() => setView("users")} />
        <ActionCard title="Applications" desc="Review pending designer applications" Icon={FileCheck} count={stats.pending_apps ?? 0} onClick={() => setView("apps")} highlight={(stats.pending_apps ?? 0) > 0} />
        <ActionCard title="Reports" desc="Open user reports" Icon={Flag} count={stats.open_reports ?? 0} onClick={() => setView("reports")} highlight={(stats.open_reports ?? 0) > 0} />
        <ActionCard title="Samples" desc="Approved, pending, rejected" Icon={Shield} count={stats.pending_samples ?? 0} onClick={() => setView("samples")} />
      </div>
    </div>
  );
}

function StatCard({ label, value, Icon, accent }: { label: string; value: any; Icon: any; accent: string }) {
  return (
    <Card className="p-4 glass">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={"h-4 w-4 " + accent} />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function ActionCard({ title, desc, Icon, count, onClick, highlight }: { title: string; desc: string; Icon: any; count: number; onClick: () => void; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={
        "group relative overflow-hidden rounded-xl border p-5 text-left backdrop-blur transition hover:-translate-y-0.5 " +
        (highlight
          ? "border-primary/50 bg-gradient-to-br from-primary/15 via-primary/5 to-background hover:border-primary"
          : "border-border/50 bg-card/50 hover:border-primary/40")
      }
    >
      <div className="flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="h-5 w-5" />
        </div>
        {count > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </div>
      <p className="mt-4 text-base font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </button>
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
    await (supabase.from("designer_applications") as any).update({ status, reviewed_at: new Date().toISOString() }).eq("id", app.id);
    if (approve) {
      await supabase.from("user_roles").insert({ user_id: app.user_id, role: "designer" });
      const cats = (app.categories as string[]) ?? [app.category];
      await supabase.from("profiles").update({ allowed_categories: cats, years_experience: app.years_experience ?? null }).eq("id", app.user_id);
      await supabase.from("notifications").insert({ user_id: app.user_id, type: "app_approved", title: "You're a designer!", body: "Your application was approved. Start uploading samples.", link: "/dashboard" });
    } else {
      await supabase.from("notifications").insert({ user_id: app.user_id, type: "app_rejected", title: "Application update", body: "Your designer application was not accepted this time." });
    }
    toast.success(status);
    refresh();
  }

  return (
    <>
      <h2 className="mb-4 text-2xl font-bold">Pending applications</h2>
      {rows.length === 0 ? (
        <Card className="p-6 text-center glass"><p className="text-sm text-muted-foreground">No pending applications.</p></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 glass">
              <p className="text-xs text-muted-foreground">Contact: {r.contact} • {((r.categories as string[]) ?? [r.category]).map((c) => CATEGORY_LABELS[c] ?? c).join(", ")} • {r.years_experience ?? "?"} yrs • Age: {r.age_group}</p>
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
      )}
    </>
  );
}

function SamplesPanel() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<any[]>([]);
  async function refresh() {
    const { data } = await supabase.from("samples").select("*").eq("status", tab).order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { refresh(); }, [tab]);

  async function decide(id: string, status: "approved" | "rejected") {
    await supabase.from("samples").update({ status }).eq("id", id);
    toast.success(status);
    refresh();
  }

  return (
    <>
      <h2 className="mb-4 text-2xl font-bold">Samples</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-full border px-4 py-1.5 text-sm capitalize transition " +
              (tab === t
                ? "border-primary bg-primary/20 text-primary"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40")
            }
          >
            {t}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <Card className="p-6 text-center glass"><p className="text-sm text-muted-foreground">No {tab} samples.</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <Card key={s.id} className="overflow-hidden glass">
              {s.media_type === "server-id" ? (
                <div className="grid h-40 place-items-center bg-muted/30 text-xs text-muted-foreground">{s.server_id ?? "server"}</div>
              ) : (
                <SampleImage src={s.image_url} alt={s.title} className="h-40 w-full object-cover" />
              )}
              <div className="p-3">
                <p className="font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">₹{s.price} • {CATEGORY_LABELS[s.category] ?? s.category}</p>
                {(s.tags as string[])?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(s.tags as string[]).slice(0, 4).map((t) => <span key={t} className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">#{t}</span>)}
                  </div>
                )}
                {tab === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => decide(s.id, "approved")} className="neon-glow">Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => decide(s.id, "rejected")}>Reject</Button>
                  </div>
                )}
                {tab === "rejected" && (
                  <Button size="sm" onClick={() => decide(s.id, "approved")} className="mt-3 w-full">Restore & approve</Button>
                )}
                {tab === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => decide(s.id, "rejected")} className="mt-3 w-full">Take down</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
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
  return (
    <>
      <h2 className="mb-4 text-2xl font-bold">Reports</h2>
      {rows.length === 0 ? (
        <Card className="p-6 text-center glass"><p className="text-sm text-muted-foreground">No open reports.</p></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 glass">
              <p className="text-xs text-muted-foreground">Target user: {r.reported_user_id}{r.sample_id ? ` · sample ${r.sample_id}` : ""}</p>
              <p className="mt-1 text-sm">{r.reason}</p>
              <Button size="sm" onClick={() => close(r.id)} className="mt-3">Close</Button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function UsersPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  async function refresh() {
    let query = supabase.from("profiles").select("id,username,display_name,avatar_url,is_banned,created_at").order("created_at", { ascending: false }).limit(50);
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
    <>
      <h2 className="mb-4 text-2xl font-bold">Manage users</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username..." className="mb-4 w-full rounded-md border border-border bg-input px-3 py-2 text-sm" />
      <div className="space-y-2">
        {rows.map((u) => (
          <Card key={u.id} className="flex items-center justify-between gap-3 p-3 glass">
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar src={u.avatar_url} className="h-9 w-9 shrink-0" iconClassName="h-3 w-3" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{u.display_name || u.username}</p>
                <p className="truncate text-xs text-muted-foreground">@{u.username} · joined {new Date(u.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {u.username && (
                <Button asChild size="sm" variant="ghost"><Link to="/u/$username" params={{ username: u.username }}>View</Link></Button>
              )}
              {u.is_banned ? (
                <Button size="sm" variant="ghost" onClick={() => ban(u.id, false)}>Unban</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => ban(u.id, true)}>Ban</Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
