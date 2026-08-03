import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$userId")({
  head: () => ({ meta: [{ title: "Chat — OnlyCreators" }] }),
  component: Thread,
});

type Msg = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null };
type Profile = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

function Thread() {
  const { userId } = useParams({ from: "/_authenticated/messages/$userId" });
  const { user } = useSession();
  const [other, setOther] = useState<Profile | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    if (!user) return;
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from("profiles").select("id,username,display_name,avatar_url").eq("id", userId).maybeSingle(),
      supabase.from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true }),
    ]);
    setOther(p as Profile | null);
    setMsgs((m as Msg[]) ?? []);
    // mark unread as read
    await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("recipient_id", user.id).eq("sender_id", userId).is("read_at", null);
  }

  useEffect(() => { load(); }, [userId, user?.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("dm-" + user.id + "-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        const relevant = (m.sender_id === user.id && m.recipient_id === userId) || (m.sender_id === userId && m.recipient_id === user.id);
        if (relevant) {
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.recipient_id === user.id) supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", m.id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, userId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setSending(true);
    const body = text.trim();
    setText("");
    const { data, error } = await supabase.from("messages").insert({ sender_id: user.id, recipient_id: userId, body }).select("*").single();
    setSending(false);
    if (error) return toast.error(error.message);
    if (data) setMsgs((prev) => (prev.some((x) => x.id === (data as Msg).id) ? prev : [...prev, data as Msg]));
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-4">
      <div className="mb-3 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link to="/messages"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <Avatar className="h-10 w-10"><AvatarImage src={other?.avatar_url ?? undefined} /><AvatarFallback><User /></AvatarFallback></Avatar>
        <div>
          <p className="text-sm font-semibold">{other?.display_name || other?.username || "Chat"}</p>
          {other?.username && <Link to="/u/$username" params={{ username: other.username }} className="text-xs text-muted-foreground hover:text-primary">@{other.username}</Link>}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto rounded-lg border border-border/50 bg-card/30 p-3">
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Say hi 👋</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
              <div className={"max-w-[75%] rounded-2xl px-3 py-2 text-sm " + (mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={"mt-1 text-[10px] " + (mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-3 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
        <Button type="submit" disabled={sending || !text.trim()} className="neon-glow"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
