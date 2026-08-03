import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — OnlyCreators" }] }),
  component: Notifications,
});

function Notifications() {
  const { user } = useSession();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50).then(({ data }) => {
      setRows(data ?? []);
      supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false).then(() => {});
    });
  }, [user?.id]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 flex items-center gap-2 text-3xl font-bold neon-gradient-text"><Bell className="h-6 w-6" />Notifications</h1>
      {rows.length === 0 ? (
        <Card className="p-8 text-center glass"><p className="text-sm text-muted-foreground">No notifications.</p></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((n) => {
            const body = (
              <Card className="p-4 glass transition hover:neon-glow">
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </Card>
            );
            return n.link ? <Link key={n.id} to={n.link as any}>{body}</Link> : <div key={n.id}>{body}</div>;
          })}
        </div>
      )}
    </div>
  );
}
