import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageSquare, Download } from "lucide-react";
import { SampleImage } from "@/components/SampleImage";

type Order = {
  id: string; customer_id: string; designer_id: string; title: string | null; category: string;
  details: string; reference_url: string | null; attachment_paths: string[]; price: number;
  budget_min: number | null; budget_max: number | null; deadline: string | null; status: string;
  deliverable_path: string | null; watermark_path: string | null; payment_qr_path: string | null; expired: boolean; created_at: string;
};

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({ meta: [{ title: "Order — OnlyCreators" }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = useParams({ from: "/_authenticated/orders/$id" });
  const { user } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [wm, setWm] = useState<File | null>(null);
  const [finalFile, setFinalFile] = useState<File | null>(null);
  const [qr, setQr] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    const o = data as Order | null;
    // Auto-expire on read
    if (o && o.deadline && !o.expired && ["requested", "pending"].includes(o.status)) {
      if (new Date(o.deadline) < new Date()) {
        await supabase.from("orders").update({ expired: true, status: "expired" }).eq("id", o.id);
        o.expired = true; o.status = "expired";
      }
    }
    setOrder(o);
  }
  useEffect(() => { refresh(); }, [id]);

  if (!user) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;
  if (!order) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;

  const isCustomer = user.id === order.customer_id;
  const isDesigner = user.id === order.designer_id;
  const otherId = isCustomer ? order.designer_id : order.customer_id;

  async function accept() {
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status: "accepted" }).eq("id", order!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Order accepted");
    refresh();
  }
  async function reject() {
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status: "rejected" }).eq("id", order!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Rejected");
    refresh();
  }

  async function deliverPreview() {
    if (!wm || !order) return;
    if (!finalFile) return toast.error("Also upload the final (clean) file — customer gets it after paying.");
    if (!qr) return toast.error("Upload your payment QR so the customer can pay you.");
    setBusy(true);
    try {
      const wmPath = `${order.id}/preview-${Date.now()}-${wm.name}`;
      const finalPath = `${order.id}/final-${Date.now()}-${finalFile.name}`;
      const qrPath = `${order.id}/qr-${Date.now()}-${qr.name.replace(/[^\w.-]/g, "_")}`;
      const u1 = await supabase.storage.from("order-files").upload(wmPath, wm);
      if (u1.error) throw u1.error;
      const u2 = await supabase.storage.from("order-files").upload(finalPath, finalFile);
      if (u2.error) throw u2.error;
      const u3 = await supabase.storage.from("order-files").upload(qrPath, qr);
      if (u3.error) throw u3.error;
      const { error } = await supabase.from("orders").update({
        watermark_path: wmPath, deliverable_path: finalPath, payment_qr_path: qrPath,
        status: "delivered", delivered_at: new Date().toISOString(),
      }).eq("id", order.id);
      if (error) throw error;
      toast.success("Order delivered — customer notified.");
      setWm(null); setFinalFile(null); setQr(null);
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  }

  async function approvePayment() {
    if (!order) return;
    setBusy(true);
    await supabase.from("mock_purchases").insert({ user_id: order.customer_id, item_type: "order", item_key: order.id, price: order.price }).select();
    const { error } = await supabase.from("orders").update({ status: "completed", paid_at: new Date().toISOString() }).eq("id", order.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Payment approved — file released to the customer.");
    refresh();
  }

  async function disputePayment() {
    if (!order) return;
    setBusy(true);
    const { error } = await supabase.from("orders").update({ status: "delivered" }).eq("id", order.id);
    if (!error) {
      await supabase.from("notifications").insert({
        user_id: order.customer_id, type: "order", title: "Payment not received",
        body: "Your designer could not confirm the payment. Please pay again or contact them.",
        link: `/orders/${order.id}`,
      } as any);
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Marked as not received — customer notified.");
    refresh();
  }


  async function download() {
    if (!order?.deliverable_path) return;
    const { data, error } = await supabase.storage.from("order-files").createSignedUrl(order.deliverable_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!order?.watermark_path) return;
    supabase.storage.from("order-files").createSignedUrl(order.watermark_path, 300).then(({ data }) => setPreviewUrl(data?.signedUrl ?? null));
  }, [order?.watermark_path]);

  const statusColor: Record<string, string> = {
    requested: "bg-muted text-muted-foreground",
    pending: "bg-muted text-muted-foreground",
    accepted: "bg-primary/20 text-primary",
    rejected: "bg-destructive/20 text-destructive",
    delivered: "bg-primary/20 text-primary",
    paid: "bg-emerald-500/20 text-emerald-400",
    completed: "bg-emerald-500/20 text-emerald-400",
    payment_pending: "bg-amber-500/20 text-amber-400",
    expired: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Card className="p-6 glass">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{order.title || `${order.category} order`}</h1>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{order.category}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={"rounded px-3 py-1 text-xs capitalize " + (statusColor[order.status] ?? "bg-muted text-muted-foreground")}>{order.status}</span>
            <Button asChild variant="outline" size="icon" aria-label="Message">
              <Link to="/messages/$userId" params={{ userId: otherId }}><MessageSquare className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Info label="Offered price" value={`₹${order.price}`} />
          {order.budget_min != null && <Info label="Budget" value={`₹${order.budget_min} – ₹${order.budget_max}`} />}
          {order.deadline && <Info label="Deadline" value={new Date(order.deadline).toLocaleDateString()} />}
        </div>

        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Brief</p>
          <div className="mt-1 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">{order.details}</div>
        </div>
        {order.reference_url && <p className="mt-3 text-sm">Reference: <a className="text-primary underline" href={order.reference_url} target="_blank" rel="noreferrer">link</a></p>}

        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          <span className="font-semibold text-primary">Next step: </span>
          {nextStep(order.status, isDesigner)}
        </div>



        {order.status === "expired" && (
          <div className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">This order expired past its deadline.</div>
        )}

        {isDesigner && (order.status === "requested" || order.status === "pending") && (
          <div className="mt-6 flex gap-2">
            <Button disabled={busy} onClick={accept} className="neon-glow">Accept</Button>
            <Button disabled={busy} onClick={reject} variant="outline">Reject</Button>
          </div>
        )}

        {isDesigner && order.status === "accepted" && (
          <div className="mt-6 space-y-3 rounded-md border border-border/60 p-4">
            <p className="text-sm font-medium">Deliver work</p>
            <p className="text-xs text-muted-foreground">Upload a watermarked preview, the clean final file, and your UPI QR — the customer pays you directly, then you approve to release the file.</p>
            <div><Label>Watermarked preview</Label><Input type="file" onChange={(e) => setWm(e.target.files?.[0] ?? null)} /></div>
            <div><Label>Final (clean) file</Label><Input type="file" onChange={(e) => setFinalFile(e.target.files?.[0] ?? null)} /></div>
            <div><Label>Your payment QR (image)</Label><Input type="file" accept="image/*" onChange={(e) => setQr(e.target.files?.[0] ?? null)} /></div>
            <Button disabled={busy || !wm || !finalFile || !qr} onClick={deliverPreview} className="neon-glow">{busy ? "Uploading..." : "Deliver order"}</Button>
          </div>
        )}

        {(order.status === "delivered" || order.status === "payment_pending" || order.status === "paid" || order.status === "completed") && previewUrl && (
          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Preview (watermarked)</p>
            <SampleImage src={previewUrl} alt="preview" className="max-h-96 w-full rounded-md object-contain" />
          </div>
        )}

        {isCustomer && order.status === "delivered" && (
          <div className="mt-6 rounded-md border border-primary/40 p-4">
            <p className="mb-3 text-sm">Your order is delivered 🎉 Pay the designer to unlock the clean file.</p>
            <Button asChild className="neon-glow">
              <Link to="/pay/$kind/$id" params={{ kind: "order", id: order.id }}>Pay ₹{order.price} &amp; purchase</Link>
            </Button>
          </div>
        )}

        {isCustomer && order.status === "payment_pending" && (
          <div className="mt-6 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-muted-foreground">
            Payment submitted — waiting for the designer to confirm. Your file unlocks right after approval.
          </div>
        )}

        {isDesigner && order.status === "payment_pending" && (
          <div className="mt-6 space-y-3 rounded-md border border-primary/40 p-4">
            <p className="text-sm">The customer submitted payment. Approve once the money is in your account.</p>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={approvePayment} className="neon-glow">Approve payment &amp; release file</Button>
              <Button disabled={busy} variant="outline" onClick={disputePayment}>Not received</Button>
            </div>
          </div>
        )}

        {(order.status === "paid" || order.status === "completed") && isCustomer && order.deliverable_path && (
          <Button onClick={download} className="mt-4"><Download className="mr-1 h-4 w-4" />Download clean file</Button>
        )}

        {(order.status === "paid" || order.status === "completed") && isDesigner && (
          <div className="mt-6 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-400">
            + ₹{order.price} added to your earnings.
          </div>
        )}

      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
