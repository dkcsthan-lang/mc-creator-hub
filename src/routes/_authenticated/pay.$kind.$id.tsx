import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft, IndianRupee } from "lucide-react";
import qrAsset from "@/assets/platform-upi-qr.jpg.asset.json";

export const Route = createFileRoute("/_authenticated/pay/$kind/$id")({
  head: () => ({ meta: [{ title: "Pay & submit — OnlyCreators" }] }),
  component: PayPage,
});

type Info = { label: string; price: number; qrUrl: string; note: string };

function PayPage() {
  const { kind, id } = useParams({ from: "/_authenticated/pay/$kind/$id" });
  const { user } = useSession();
  const nav = useNavigate();
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      if (kind === "sponsor") {
        const { data } = await supabase.from("sponsor_ads").select("title,price,duration_days,gif_enabled").eq("id", id).maybeSingle();
        if (!data) return setError("Sponsorship not found.");
        setInfo({
          label: `Sponsor banner — ${(data as any).title}`,
          price: (data as any).price,
          qrUrl: qrAsset.url,
          note: `${(data as any).duration_days} day(s)${(data as any).gif_enabled ? " · GIF banner enabled" : ""}`,
        });
      } else if (kind === "store") {
        const { data } = await supabase.from("purchase_requests").select("item_label,item_type,price").eq("id", id).maybeSingle();
        if (!data) return setError("Purchase not found.");
        setInfo({ label: (data as any).item_label, price: (data as any).price, qrUrl: qrAsset.url, note: (data as any).item_type });
      } else if (kind === "order") {
        const { data } = await supabase.from("orders").select("title,category,price,payment_qr_path,customer_id").eq("id", id).maybeSingle();
        if (!data) return setError("Order not found.");
        const o = data as any;
        if (o.customer_id !== user.id) return setError("Only the customer can pay for this order.");
        let qr = "";
        if (o.payment_qr_path) {
          const { data: s } = await supabase.storage.from("order-files").createSignedUrl(o.payment_qr_path, 3600);
          qr = s?.signedUrl ?? "";
        }
        if (!qr) return setError("The designer has not uploaded a payment QR yet.");
        setInfo({ label: o.title || `${o.category} order`, price: o.price, qrUrl: qr, note: "Paid directly to your designer" });
      } else {
        setError("Unknown payment type.");
      }
    })();
  }, [kind, id, user?.id]);

  async function payAndSubmit() {
    setBusy(true);
    try {
      if (kind === "sponsor") {
        const { error } = await supabase.from("sponsor_ads").update({ status: "pending" }).eq("id", id);
        if (error) throw new Error(error.message);
      } else if (kind === "store") {
        const { error } = await supabase.from("purchase_requests").update({ status: "pending" }).eq("id", id);
        if (error) throw new Error(error.message);
      } else if (kind === "order") {
        const { error } = await supabase.from("orders").update({ status: "payment_pending" }).eq("id", id);
        if (error) throw new Error(error.message);
      }
      nav({ to: "/thanks", search: { kind } });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit payment.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => nav({ to: "/" })}>Go home</Button>
      </div>
    );
  }
  if (!info) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => nav({ to: ".." })} className="mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>

      <h1 className="text-center text-3xl font-bold neon-gradient-text">Pay & submit</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">Scan the QR with any UPI app, then confirm below.</p>

      <Card className="mt-6 p-6 glass">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{info.label}</p>
            <p className="text-xs capitalize text-muted-foreground">{info.note}</p>
          </div>
          <p className="flex items-center text-2xl font-bold neon-gradient-text">
            <IndianRupee className="h-5 w-5" />{info.price}
          </p>
        </div>

        <div className="mx-auto max-w-xs overflow-hidden rounded-2xl border border-primary/40 bg-white p-2 shadow-[0_0_50px_-15px_color-mix(in_oklab,var(--neon-purple)_70%,transparent)]">
          <img src={info.qrUrl} alt="UPI payment QR code" className="h-auto w-full rounded-xl" />
        </div>

        <div className="mt-5 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-muted-foreground">
          After paying ₹{info.price}, press the button below. Your request is sent for verification and activates once approved.
        </div>

        <Button disabled={busy} onClick={payAndSubmit} className="mt-5 w-full neon-glow">
          <ShieldCheck className="mr-2 h-4 w-4" />{busy ? "Submitting..." : "Pay & submit"}
        </Button>
      </Card>
    </div>
  );
}
