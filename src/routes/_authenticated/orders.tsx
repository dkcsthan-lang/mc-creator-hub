import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS } from "@/lib/mctech";

type Order = {
  id: string; title: string | null; category: string; details: string; price: number; status: string;
  customer_id: string; designer_id: string; created_at: string;
};

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders — OnlyCreators" }, { name: "description", content: "Your orders on OnlyCreators." }] }),
  component: OrdersList,
});

const STATUS_LABEL: Record<string, string> = {
  requested: "Waiting for designer",
  pending: "Waiting for designer",
  accepted: "In progress",
  rejected: "Rejected",
  delivered: "Delivered — pay to unlock",
  payment_pending: "Payment awaiting approval",
  paid: "Paid",
  completed: "Completed",
  expired: "Expired",
};

function OrderRow({ o, mine }: { o: Order; mine: boolean }) {
  return (
    <Link to="/orders/$id" params={{ id: o.id }} className="block">
      <Card className="flex items-center justify-between gap-3 p-4 neon-border transition hover:neon-glow">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{o.title || CATEGORY_LABELS[o.category] || o.category}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{o.details}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{mine ? "You ordered" : "Incoming request"} · {new Date(o.created_at).toLocaleDateString()}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold neon-gradient-text">₹{o.price}</p>
          <p className="text-xs text-muted-foreground">{STATUS_LABEL[o.status] ?? o.status}</p>
        </div>
      </Card>
    </Link>
  );
}

function OrdersList() {
  const { user } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("orders").select("*")
      .or(`customer_id.eq.${user.id},designer_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    setOrders((data as Order[]) ?? []);
  }

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("orders-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const incoming = orders.filter((o) => o.designer_id === user?.id);
  const placed = orders.filter((o) => o.customer_id === user?.id);
  const newRequests = incoming.filter((o) => o.status === "requested" || o.status === "pending");
  const activeIncoming = incoming.filter((o) => !newRequests.includes(o));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold neon-gradient-text">Orders</h1>
        <Button asChild className="neon-glow"><Link to="/orders/new">New order</Link></Button>
      </div>

      {incoming.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Order requests {newRequests.length > 0 && <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">{newRequests.length}</span>}
          </h2>
          <div className="mb-8 space-y-3">
            {newRequests.length === 0 && activeIncoming.length === 0 && (
              <Card className="p-6 text-center glass"><p className="text-sm text-muted-foreground">No requests yet.</p></Card>
            )}
            {newRequests.map((o) => <OrderRow key={o.id} o={o} mine={false} />)}
            {activeIncoming.map((o) => <OrderRow key={o.id} o={o} mine={false} />)}
          </div>
        </>
      )}

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your orders</h2>
      {placed.length === 0 ? (
        <Card className="p-8 text-center glass"><p className="text-sm text-muted-foreground">You haven't placed any orders yet.</p></Card>
      ) : (
        <div className="space-y-3">
          {placed.map((o) => <OrderRow key={o.id} o={o} mine />)}
        </div>
      )}
    </div>
  );
}
