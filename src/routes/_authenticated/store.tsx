import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Crown, Zap, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/store")({
  head: () => ({ meta: [{ title: "Store — MCtech" }] }),
  component: Store,
});

const CUSTOMER_TIERS = [
  { key: "vip", label: "VIP", price: 199, icon: Crown, perks: ["VIP badge on profile", "Priority support"] },
  { key: "vip+", label: "VIP+", price: 499, icon: Crown, perks: ["VIP+ badge", "Featured customer", "Priority support"] },
];
const DESIGNER_TIERS = [
  { key: "extra_slot", label: "Extra sample slot", price: 99, icon: Package, perks: ["+1 sample upload slot"] },
  { key: "featured", label: "Featured designer", price: 299, icon: Zap, perks: ["Appear in featured row", "Neon border on cards"] },
  { key: "verified", label: "Verified designer", price: 599, icon: Crown, perks: ["Verified checkmark", "Priority in search"] },
];

function Store() {
  const { user } = useSession();
  const { profile } = useProfile();
  const [purchases, setPurchases] = useState<{ item_key: string }[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("mock_purchases").select("item_key").eq("user_id", user.id).then(({ data }) => setPurchases((data as any) ?? []));
  }, [user?.id]);

  async function buy(key: string, label: string, price: number) {
    if (!user) return;
    const { error } = await supabase.from("mock_purchases").insert({ user_id: user.id, item_key: key, item_label: label, price });
    if (error) return toast.error(error.message);
    toast.success(`Purchased ${label} (mock)`);
    setPurchases((p) => [...p, { item_key: key }]);
  }

  const owned = new Set(purchases.map((p) => p.item_key));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold neon-gradient-text">Store</h1>
      <p className="mb-6 text-sm text-muted-foreground">All payments are mock for now — nothing gets charged.</p>

      <h2 className="mb-3 text-lg font-semibold">For customers</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {CUSTOMER_TIERS.map((t) => (
          <TierCard key={t.key} tier={t} owned={owned.has(t.key)} onBuy={() => buy(t.key, t.label, t.price)} />
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold">For designers</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {DESIGNER_TIERS.map((t) => (
          <TierCard key={t.key} tier={t} owned={owned.has(t.key)} onBuy={() => buy(t.key, t.label, t.price)} />
        ))}
      </div>
    </div>
  );
}

function TierCard({ tier, owned, onBuy }: { tier: { key: string; label: string; price: number; icon: any; perks: string[] }; owned: boolean; onBuy: () => void }) {
  const Icon = tier.icon;
  return (
    <Card className="p-6 glass neon-border">
      <div className="mb-3 flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><h3 className="font-semibold">{tier.label}</h3></div>
      <p className="mb-4 text-3xl font-bold neon-gradient-text">₹{tier.price}</p>
      <ul className="mb-4 space-y-1 text-sm text-muted-foreground">{tier.perks.map((p) => <li key={p}>• {p}</li>)}</ul>
      <Button disabled={owned} onClick={onBuy} className="w-full neon-glow">{owned ? "Owned" : "Buy (mock)"}</Button>
    </Card>
  );
}
