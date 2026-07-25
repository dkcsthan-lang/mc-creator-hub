import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — MCtech" }] }),
  component: MessagesList,
});

type Thread = { other_id: string; last_body: string; last_at: string; unread: number };
type Profile = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

function MessagesList() {
  const { user } = useSession();
  const [threads, setThreads] = useState<(Thread & { profile?: Profile })[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);

  async function loadThreads() {
    if (!user) return;
    const { data } = await supabase.from("messages")
      .select("sender_id,recipient_id,body,created_at,read_at")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(200);
    const map = new Map<string, Thread>();
    for (const m of (data ?? []) as any[]) {
      const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const t = map.get(other);
      if (!t) {
        map.set(other, {
          other_id: other,
          last_body: m.body,
          last_at: m.created_at,
          unread: m.recipient_id === user.id && !m.read_at ? 1 : 0,
        });
      } else if (m.recipient_id === user.id && !m.read_at) {
        t.unread += 1;
      }
    }
    const arr = Array.from(map.values());
    if (arr.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", arr.map((t) => t.other_id));
      const byId = new Map(((profs ?? []) as Profile[]).map((p) => [p.id, p]));
      setThreads(arr.map((t) => ({ ...t, profile: byId.get(t.other_id) })));
    } else setThreads([]);
  }

  useEffect(() => { loadThreads(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("msg-inbox-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => loadThreads())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  useEffect(() => {
    if (!q.trim()) return setResults([]);
    supabase.from("profiles").select("id,username,display_name,avatar_url").ilike("username", `%${q}%`).limit(10)
      .then(({ data }) => setResults((data as Profile[]) ?? []));
  }, [q]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold neon-gradient-text">Messages</h1>

      <Card className="mb-6 p-4 glass">
        <p className="mb-2 text-xs text-muted-foreground">Start a new chat</p>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by username..." />
        {results.length > 0 && (
          <div className="mt-3 space-y-1">
            {results.map((p) => (
              <Link key={p.id} to="/messages/$userId" params={{ userId: p.id }} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/40">
                <Avatar className="h-8 w-8"><AvatarImage src={p.avatar_url ?? undefined} /><AvatarFallback><User className="h-3 w-3" /></AvatarFallback></Avatar>
                <div>
                  <p className="text-sm">{p.display_name || p.username}</p>
                  <p className="text-xs text-muted-foreground">@{p.username}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {threads.length === 0 ? (
        <Card className="p-8 text-center glass"><p className="text-sm text-muted-foreground">No conversations yet.</p></Card>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link key={t.other_id} to="/messages/$userId" params={{ userId: t.other_id }} className="block">
              <Card className="flex items-center gap-3 p-3 glass transition hover:neon-glow">
                <Avatar className="h-10 w-10"><AvatarImage src={t.profile?.avatar_url ?? undefined} /><AvatarFallback><User className="h-4 w-4" /></AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t.profile?.display_name || t.profile?.username || "Unknown"}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{t.last_body}</p>
                </div>
                {t.unread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">{t.unread}</span>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
