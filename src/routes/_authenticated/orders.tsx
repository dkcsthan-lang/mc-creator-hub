import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Order = { id: string; category: string; details: string; price: number; status: string; customer_id: string; designer_id: string; created_at: string };

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders — MCtech" }, { name: "description", content: "Your orders on MCtech." }] }),
  component: OrdersList,
});

function OrdersList() {
  const { user } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").or(`customer_id.eq.${user.id},designer_id.eq.${user.id}`).order("created_at", { ascending: false }).then(({ data }) => setOrders((data as Order[]) ?? []));
  }, [user?.id]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold neon-gradient-text">Orders</h1>
        <Button asChild className="neon-glow"><Link to="/orders/new">New order</Link></Button>
      </div>
      {orders.length === 0 ? (
        <Card className="p-8 text-center glass"><p className="text-sm text-muted-foreground">No orders yet.</p></Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} to="/orders/$id" params={{ id: o.id }}>
              <Card className="flex items-center justify-between p-4 neon-border transition hover:neon-glow">
                <div>
                  <p className="text-sm font-medium capitalize">{o.category}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{o.details}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold neon-gradient-text">₹{o.price}</p>
                  <p className="text-xs text-muted-foreground capitalize">{o.status}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
