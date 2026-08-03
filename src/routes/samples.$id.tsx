import { SampleImage } from "@/components/SampleImage";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Star, Flag, ShoppingBag, User, Heart } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/session";

type Sample = {
  id: string; title: string; image_url: string; price: number; category: string;
  designer_id: string;
};

export const Route = createFileRoute("/samples/$id")({
  head: () => ({
    meta: [
      { title: "Sample — OnlyCreators" },
      { name: "description", content: "View a designer sample on OnlyCreators." },
    ],
  }),
  component: SampleDetail,
});

function SampleDetail() {
  const { id } = useParams({ from: "/samples/$id" });
  const { user } = useSession();
  const nav = useNavigate();
  const [sample, setSample] = useState<Sample | null>(null);
  const [designer, setDesigner] = useState<{ username: string | null; avatar_url: string | null; display_name: string | null } | null>(null);
  const [avgRating, setAvgRating] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
  const [myRating, setMyRating] = useState(0);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [reason, setReason] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  // A designer cannot rate, like or report their own showcase sample.
  const isOwnSample = !!user && !!sample && user.id === sample.designer_id;

  useEffect(() => {
    supabase.from("samples").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setSample(data as Sample | null);
      if (data) {
        supabase.from("profiles").select("username,avatar_url,display_name").eq("id", data.designer_id).maybeSingle().then(({ data: p }) => setDesigner(p));
      }
    });
    supabase.from("sample_ratings").select("rating,user_id").eq("sample_id", id).then(({ data }) => {
      const rows = (data ?? []) as { rating: number; user_id: string }[];
      const sum = rows.reduce((a, r) => a + r.rating, 0);
      setAvgRating({ avg: rows.length ? sum / rows.length : 0, count: rows.length });
      if (user) {
        const mine = rows.find((r) => r.user_id === user.id);
        if (mine) setMyRating(mine.rating);
      }
    });
    supabase.from("sample_likes").select("user_id").eq("sample_id", id).then(({ data }) => {
      const rows = (data ?? []) as { user_id: string }[];
      setLikes(rows.length);
      setLiked(!!user && rows.some((r) => r.user_id === user.id));
    });
  }, [id, user?.id]);

  async function rate(n: number) {
    if (!user) return nav({ to: "/auth" });
    if (isOwnSample) return toast.error("You can't rate your own sample.");
    setMyRating(n);
    const { error } = await supabase.from("sample_ratings").upsert({ sample_id: id, user_id: user.id, rating: n });
    if (error) return toast.error(error.message);
    toast.success("Thanks for rating!");
  }

  async function toggleLike() {
    if (!user) return nav({ to: "/auth" });
    if (isOwnSample) return toast.error("You can't like your own sample.");
    if (liked) {
      const { error } = await supabase.from("sample_likes").delete().eq("sample_id", id).eq("user_id", user.id);
      if (error) return toast.error(error.message);
      setLiked(false); setLikes((n) => Math.max(0, n - 1));
    } else {
      const { error } = await supabase.from("sample_likes").insert({ sample_id: id, user_id: user.id });
      if (error) return toast.error(error.message);
      setLiked(true); setLikes((n) => n + 1);
    }
  }

  async function submitReport() {
    if (!user) return nav({ to: "/auth" });
    if (!sample || !reason.trim()) return;
    const { error } = await supabase.from("reports").insert({ reporter_id: user.id, reported_user_id: sample.designer_id, sample_id: sample.id, reason });
    if (error) return toast.error(error.message);
    toast.success("Report sent to admins.");
    setReportOpen(false);
    setReason("");
  }

  if (!sample) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;


  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Card className="overflow-hidden neon-border">
        <SampleImage src={sample.image_url} alt={sample.title} className="max-h-[520px] w-full object-cover" />
        <div className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <Avatar><AvatarImage src={designer?.avatar_url ?? undefined} /><AvatarFallback><User className="h-4 w-4" /></AvatarFallback></Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Designer</p>
              <p className="font-medium">{designer?.display_name || designer?.username || "Unknown"}</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold">{sample.title}</h1>
          <p className="mt-1 text-lg neon-gradient-text font-semibold">₹{sample.price}</p>

          <div className="mt-5">
            <p className="mb-2 text-sm text-muted-foreground">
              {isOwnSample ? "Community rating" : "Rate this sample"}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => rate(n)}
                  disabled={isOwnSample}
                  aria-label={`Rate ${n}`}
                  className={isOwnSample ? "cursor-default" : ""}
                >
                  <Star className={"h-6 w-6 " + (n <= (myRating || Math.round(avgRating.avg)) ? "fill-primary text-primary" : "text-muted-foreground")} />
                </button>
              ))}
              {avgRating.count > 0 && (
                <span className="ml-3 text-sm text-muted-foreground">{avgRating.avg.toFixed(1)} · {avgRating.count} rating{avgRating.count === 1 ? "" : "s"}</span>
              )}
              <Button
                onClick={toggleLike}
                disabled={isOwnSample}
                variant={liked ? "default" : "outline"}
                size="sm"
                className={"ml-3 " + (liked ? "neon-glow" : "")}
              >
                <Heart className={"mr-1 h-4 w-4 " + (liked ? "fill-current" : "")} />
                {likes}
              </Button>
            </div>
            {isOwnSample && (
              <p className="mt-2 text-xs text-muted-foreground">This is your own sample — you can't rate, like or report it.</p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {!isOwnSample && (
              <Button asChild className="neon-glow">
                <Link to="/orders/new" search={{ designer: sample.designer_id }}><ShoppingBag className="mr-1 h-4 w-4" />Place order</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/u/$username" params={{ username: designer?.username ?? "" }}><User className="mr-1 h-4 w-4" />See portfolio</Link>
            </Button>
            {!isOwnSample && (
              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogTrigger asChild><Button variant="ghost"><Flag className="mr-1 h-4 w-4" />Report designer</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Report designer</DialogTitle></DialogHeader>
                  <Textarea placeholder="Reason..." value={reason} onChange={(e) => setReason(e.target.value)} />
                  <DialogFooter><Button onClick={submitReport}>Submit report</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

        </div>
      </Card>
    </div>
  );
}
