import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRoles } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Crown, Zap, Gem, Sprout, Check, Package, Shield, Star, Sparkles } from "lucide-react";
import { CREATOR_PLANS, DESIGNER_BADGES, DESIGNER_SLOTS } from "@/lib/mctech";

export const Route = createFileRoute("/_authenticated/store")({
  head: () => ({ meta: [{ title: "Store — MCtech" }, { name: "description", content: "Memberships, badges, and slots for MCtech." }] }),
  component: Store,
});

function Store() {
  const { user } = useSession();
  const { isDesigner } = useRoles();
  const [purchases, setPurchases] = useState<{ item_key: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("mock_purchases").select("item_key").eq("user_id", user.id).then(({ data }) => setPurchases((data as any) ?? []));
  }, [user?.id]);

  async function buy(key: string, label: string, price: number) {
    if (!user) return;
    const { error } = await supabase.from("mock_purchases").insert({ user_id: user.id, item_key: key, item_type: label, price });
    if (error) return toast.error(error.message);
    toast.success(`${label} activated (mock payment)`);
    setPurchases((p) => [...p, { item_key: key }]);
  }
  const owned = new Set(purchases.map((p) => p.item_key));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-xs text-primary">
          <Sparkles className="h-3 w-3" /> Season 2 Store
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Level Up Your <span className="neon-gradient-text">{isDesigner ? "Designer" : "Creator"} Profile</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground">
          {isDesigner
            ? "Unlock more slots, higher-tier badges, and premium showcase perks."
            : "Purchase memberships and badges. All purchases are mock payments — nothing is charged."}
        </p>
      </div>

      {isDesigner ? (
        <DesignerStore owned={owned} onBuy={buy} />
      ) : (
        <CreatorStore owned={owned} onBuy={buy} />
      )}

      <HowItWorks />
    </div>
  );
}

function CreatorStore({ owned, onBuy }: { owned: Set<string>; onBuy: (k: string, l: string, p: number) => void }) {
  const iconFor = (i: string) => ({ sprout: Sprout, zap: Zap, gem: Gem, crown: Crown } as any)[i] ?? Sprout;
  return (
    <>
      <p className="mb-6 text-center text-xs text-muted-foreground">
        Customer memberships provide perks, discounts, and badges. They do not affect creator showcase slots.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        {CREATOR_PLANS.map((p) => {
          const Icon = iconFor(p.icon);
          const isPopular = p.tag === "MOST POPULAR";
          const isSupreme = p.key === "supreme";
          const isPremium = p.key === "premium";
          const isStarter = p.key === "starter";
          return (
            <div key={p.key} className="relative">
              {p.tag && (
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold tracking-wider text-primary-foreground shadow-lg shadow-primary/40">
                  {p.tag}
                </div>
              )}
              <Card
                className={
                  "relative overflow-hidden p-6 " +
                  (isPopular
                    ? "border-primary/60 bg-gradient-to-br from-primary/25 via-primary/10 to-background shadow-[0_0_60px_-10px_color-mix(in_oklab,var(--neon-purple)_50%,transparent)]"
                    : isSupreme
                    ? "border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-amber-800/10 to-background"
                    : isPremium
                    ? "border-blue-500/40 bg-gradient-to-br from-blue-600/15 via-blue-900/10 to-background"
                    : "border-border/60 bg-card/50")
                }
              >
                <Icon
                  className={
                    "h-8 w-8 " +
                    (isPopular ? "text-primary" : isSupreme ? "text-amber-400" : isPremium ? "text-blue-400" : "text-emerald-400")
                  }
                />
                <p className="mt-4 text-lg font-semibold">{p.label}</p>
                <p className="mt-1 text-3xl font-bold">
                  {p.price === 0 ? "Free" : <>₹{p.price}<span className="text-sm text-muted-foreground">/mo</span></>}
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <Check className={"mt-0.5 h-4 w-4 shrink-0 " + (isPopular ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-muted-foreground">{perk}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {isStarter ? (
                    <Button variant="outline" disabled className="w-full">Current Free Plan</Button>
                  ) : (
                    <Button
                      disabled={owned.has(p.key)}
                      onClick={() => onBuy(p.key, p.label, p.price)}
                      className={
                        "w-full " +
                        (isPopular
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 neon-glow"
                          : isSupreme
                          ? "bg-amber-500 text-black hover:bg-amber-400"
                          : "")
                      }
                    >
                      {owned.has(p.key) ? "Owned" : `Buy ${p.label}`}
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </>
  );
}

function DesignerStore({ owned, onBuy }: { owned: Set<string>; onBuy: (k: string, l: string, p: number) => void }) {
  return (
    <>
      <Tabs defaultValue="badges" className="w-full">
        <TabsList className="mx-auto mb-8 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="badges"><Shield className="mr-2 h-4 w-4" />Badges</TabsTrigger>
          <TabsTrigger value="slots"><Package className="mr-2 h-4 w-4" />Slots</TabsTrigger>
        </TabsList>

        <TabsContent value="badges">
          <div className="grid gap-5 sm:grid-cols-2">
            {DESIGNER_BADGES.map((b) => (
              <BadgeCard key={b.key} badge={b} owned={owned.has(b.key)} onBuy={() => onBuy(b.key, b.label, b.price)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="slots">
          <p className="mb-6 text-center text-xs text-muted-foreground">
            Add extra upload slots on top of the slots your badge grants.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DESIGNER_SLOTS.map((s) => (
              <Card key={s.key} className="p-5 glass text-center">
                <Package className="mx-auto h-7 w-7 text-primary" />
                <p className="mt-3 text-lg font-semibold">{s.label}</p>
                <p className="mt-1 text-3xl font-bold neon-gradient-text">₹{s.price}</p>
                <Button
                  disabled={owned.has(s.key)}
                  onClick={() => onBuy(s.key, s.label, s.price)}
                  className="mt-4 w-full neon-glow"
                >
                  {owned.has(s.key) ? "Owned" : "Buy"}
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function BadgeCard({ badge, owned, onBuy }: { badge: any; owned: boolean; onBuy: () => void }) {
  const themes: Record<string, string> = {
    purple: "border-primary/50 bg-gradient-to-br from-primary/20 via-primary/5 to-background shadow-[0_0_50px_-15px_color-mix(in_oklab,var(--neon-purple)_60%,transparent)]",
    green: "border-emerald-500/50 bg-gradient-to-br from-emerald-500/20 via-emerald-800/5 to-background shadow-[0_0_50px_-15px_rgba(16,185,129,0.5)]",
    gold: "border-amber-400/60 bg-gradient-to-br from-amber-400/20 via-amber-700/5 to-background shadow-[0_0_50px_-15px_rgba(250,204,21,0.6)]",
    blue: "border-blue-500/60 bg-gradient-to-br from-blue-500/25 via-indigo-600/10 to-background shadow-[0_0_60px_-15px_rgba(59,130,246,0.7)]",
  };
  const iconColor: Record<string, string> = {
    purple: "text-primary",
    green: "text-emerald-400",
    gold: "text-amber-400",
    blue: "text-blue-400",
  };
  const labelClass: Record<string, string> = {
    purple: "neon-gradient-text",
    green: "text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]",
    gold: "text-amber-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.7)]",
    blue: "bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]",
  };
  return (
    <Card className={"relative overflow-hidden p-6 " + themes[badge.theme]}>
      <div className="mb-3 flex items-center gap-3">
        <div className={"grid h-12 w-12 place-items-center rounded-xl bg-background/40 ring-1 ring-border/50 " + iconColor[badge.theme]}>
          <Star className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Designer badge</p>
          <p className={"text-xl font-bold " + labelClass[badge.theme]}>{badge.label}</p>
        </div>
      </div>
      <p className="text-3xl font-bold">
        {badge.price === 0 ? <span className="text-muted-foreground">Free</span> : <>₹{badge.price}</>}
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {badge.perks.map((p: string) => (
          <li key={p} className="flex items-start gap-2 text-muted-foreground">
            <Check className={"mt-0.5 h-4 w-4 shrink-0 " + iconColor[badge.theme]} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <Button
        disabled={owned || badge.price === 0}
        onClick={onBuy}
        className="mt-5 w-full neon-glow"
      >
        {badge.price === 0 ? "Included" : owned ? "Owned" : `Buy ${badge.label}`}
      </Button>
    </Card>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Package, title: "Choose a Plan", body: "Pick your membership or badge from the store." },
    { icon: Zap, title: "Pay via QR Code", body: "Scan our UPI QR and complete the payment." },
    { icon: Check, title: "Confirm Payment", body: "Click 'I've Paid' and we verify your payment." },
    { icon: Sparkles, title: "Get Activated", body: "Admin activates your purchase within 24 hours." },
  ];
  return (
    <Card className="mt-12 p-6 glass">
      <h3 className="mb-6 text-center text-lg font-semibold">How Purchases Work</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {steps.map((s, i) => (
          <div key={i} className="text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
              <s.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold">{s.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
