import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { useStorageUrl } from "@/components/StorageImage";
import { Send, ArrowLeft, Paperclip, ImagePlus, X, FileDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$userId")({
  head: () => ({ meta: [{ title: "Chat — OnlyCreators" }] }),
  component: Thread,
});

type Msg = { id: string; sender_id: string; recipient_id: string; body: string; attachment_path: string | null; created_at: string; read_at: string | null };
type Profile = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; gif_avatar_url: string | null; bio: string | null };

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

function Attachment({ path, mine }: { path: string; mine: boolean }) {
  const url = useStorageUrl(path);
  const name = path.split("/").pop() ?? "file";
  if (!url) return null;
  if (IMAGE_RE.test(name)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 block">
        <img src={url} alt={name} className="max-h-56 w-full rounded-lg object-cover" loading="lazy" />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={"mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs underline-offset-2 hover:underline " + (mine ? "bg-primary-foreground/15" : "bg-background/60")}
    >
      <FileDown className="h-4 w-4 shrink-0" />
      <span className="truncate">{name.replace(/^\d+-/, "")}</span>
    </a>
  );
}

function Thread() {
  const { userId } = useParams({ from: "/_authenticated/messages/$userId" });
  const { user } = useSession();
  const { canAttachFiles } = useEntitlements();
  const [other, setOther] = useState<Profile | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function pickFile(ref: React.RefObject<HTMLInputElement | null>) {
    if (!canAttachFiles) {
      toast.error("Attachments are for Exclusive-badge designers and Supreme creators only.");
      return;
    }
    ref.current?.click();
  }


  async function load() {
    if (!user) return;
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from("profiles").select("id,username,display_name,avatar_url,gif_avatar_url,bio").eq("id", userId).maybeSingle(),
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
    if (!user) return;
    if (!text.trim() && !file) return;
    setSending(true);
    const body = text.trim();
    try {
      let attachment_path: string | null = null;
      if (file) {
        if (file.size > 20 * 1024 * 1024) throw new Error("File must be under 20MB");
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const up = await supabase.storage.from("chat-files").upload(path, file);
        if (up.error) throw new Error(up.error.message);
        attachment_path = path;
      }
      const { data, error } = await supabase.from("messages")
        .insert({ sender_id: user.id, recipient_id: userId, body: body || (file ? "📎 Attachment" : ""), attachment_path })
        .select("*").single();
      if (error) throw new Error(error.message);
      setText("");
      setFile(null);
      if (data) setMsgs((prev) => (prev.some((x) => x.id === (data as Msg).id) ? prev : [...prev, data as Msg]));
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-4">
      <div className="mb-3 grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link to="/messages"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <UserAvatar src={other?.avatar_url} gifSrc={other?.gif_avatar_url} className="h-10 w-10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{other?.display_name || other?.username || "Chat"}</p>
          {other?.username && <Link to="/u/$username" params={{ username: other.username }} className="block truncate text-xs text-muted-foreground hover:text-primary">@{other.username}</Link>}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto rounded-lg border border-border/50 bg-card/30 p-3">
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Say hi 👋</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
              <div className={"max-w-[75%] rounded-2xl px-3 py-2 text-sm " + (mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                {m.attachment_path && <Attachment path={`chat-files/${m.attachment_path}`} mine={mine} />}
                <p className={"mt-1 text-[10px] " + (mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {file && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-xs">
          <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{file.name}</span>
          <button type="button" onClick={() => setFile(null)} className="ml-auto text-muted-foreground hover:text-destructive" aria-label="Remove attachment">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <input ref={imageInput} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <input ref={fileInput} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button type="button" variant="outline" size="icon" aria-label="Send image" onClick={() => imageInput.current?.click()}>
          <ImagePlus className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label="Attach file" onClick={() => fileInput.current?.click()}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
        <Button type="submit" disabled={sending || (!text.trim() && !file)} className="neon-glow"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
