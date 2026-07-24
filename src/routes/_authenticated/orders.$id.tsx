import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Order = { id: string; customer_id: string; designer_id: string; category: string; details: string; reference_url: string | null; attachment_paths: string[]; price: number; deadline: string | null; status: string; deliverable_path: string | null };

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({ meta: [{ title: "Order — MCtech" }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = useParams({ from: "/_authenticated/orders/$id" });
  const { user } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    setOrder(data as Order | null);
  }
  useEffect(() => { refresh(); }, [id]);

  if (!order || !user) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;
  const isCustomer = user.id === order.customer_id;
  const isDesigner = user.id === order.designer_id;

  async function setStatus(status: string) {
    setBusy(true);
    const patch: any = { status };
    if (status === "delivered") patch.delivered_at = new Date().toISOString();
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    if (status === "accepted") await supabase.from("notifications").insert({ user_id: order!.customer_id, type: "order_accepted", title: "Order accepted", body: "The designer accepted your order.", link: `/orders/${id}` });
    if (status === "delivered") await supabase.from("notifications").insert({ user_id: order!.customer_id, type: "order_delivered", title: "Your thumbnail is ready", body: "Tap to pay and receive.", link: `/orders/${id}` });
    toast.success("Updated");
    refresh();
  }

  async function deliver() {
    if (!file || !order) return;
    setBusy(true);
    const path = `${order.id}/deliverable-${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("order-files").upload(path, file);
    if (up.error) { setBusy(false); return toast.error(up.error.message); }
    await supabase.from("orders").update({ deliverable_path: path, status: "delivered", delivered_at: new Date().toISOString() }).eq("id", order.id);
    await supabase.from("notifications").insert({ user_id: order.customer_id, type: "order_delivered", title: "Your thumbnail is ready", body: "Tap to pay and receive.", link: `/orders/${order.id}` });
    setBusy(false);
    toast.success("Delivered!");
    setFile(null);
    refresh();
  }

  async function download() {
    if (!order?.deliverable_path) return;
    const { data, error } = await supabase.storage.from("order-files").createSignedUrl(order.deliverable_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Card className="p-6 glass">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold capitalize">{order.category} order</h1>
          <span className="rounded bg-primary/20 px-3 py-1 text-xs capitalize text-primary">{order.status}</span>
        </div>
        <p className="text-sm text-muted-foreground">Price</p>
        <p className="mb-3 text-2xl font-bold neon-gradient-text">₹{order.price}</p>
        {order.deadline && <p className="text-sm text-muted-foreground">Deadline: {order.deadline}</p>}
        <div className="mt-4 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{order.details}</div>
        {order.reference_url && <p className="mt-3 text-sm">Reference: <a className="text-primary underline" href={order.reference_url} target="_blank" rel="noreferrer">link</a></p>}

        {isDesigner && order.status === "requested" && (
          <div className="mt-6 flex gap-2">
            <Button disabled={busy} onClick={() => setStatus("accepted")} className="neon-glow">Accept</Button>
            <Button disabled={busy} onClick={() => setStatus("rejected")} variant="outline">Reject</Button>
          </div>
        )}

        {isDesigner && order.status === "accepted" && (
          <div className="mt-6">
            <Label>Upload deliverable</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-2" />
            <Button disabled={busy || !file} onClick={deliver} className="mt-3 neon-glow">Deliver</Button>
          </div>
        )}

        {isCustomer && order.status === "delivered" && (
          <div className="mt-6 rounded-md border border-primary/40 p-4">
            <p className="mb-3 text-sm">Your thumbnail is ready 🎉</p>
            <Button disabled={busy} onClick={() => setStatus("paid")} className="neon-glow">Pay ₹{order.price} & receive (mock)</Button>
          </div>
        )}

        {order.status === "paid" && order.deliverable_path && (
          <Button onClick={download} className="mt-4">Download deliverable</Button>
        )}
      </Card>
    </div>
  );
}
