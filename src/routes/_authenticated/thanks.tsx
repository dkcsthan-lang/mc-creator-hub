import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PartyPopper, Home, Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/thanks")({
  validateSearch: (s) => z.object({ kind: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "Thanks for your purchase — OnlyCreators" }] }),
  component: Thanks,
});

function Thanks() {
  const { kind } = useSearch({ from: "/_authenticated/thanks" });
  const message =
    kind === "sponsor"
      ? "Your sponsorship is now waiting for payment approval. Once our team confirms it, your banner goes live on the homepage."
      : kind === "order"
      ? "Your payment has been submitted to your designer. They'll confirm it and your file will be unlocked right away."
      : "Your purchase request is waiting for payment approval. Once confirmed, your badge / membership activates instantly.";

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card className="p-8 text-center glass">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/40 neon-glow">
          <PartyPopper className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold neon-gradient-text">Thanks for your purchase!</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">{message}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button asChild className="neon-glow"><Link to="/"><Home className="mr-1 h-4 w-4" />Back home</Link></Button>
          <Button asChild variant="outline"><Link to="/notifications"><Bell className="mr-1 h-4 w-4" />Notifications</Link></Button>
        </div>
      </Card>
    </div>
  );
}
