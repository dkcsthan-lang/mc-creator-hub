import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — MCtech" }] }),
  component: Profile,
});

function Profile() {
  const { user } = useSession();
  const { profile, refresh } = useProfile();
  const [form, setForm] = useState({ username: "", display_name: "", bio: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) setForm({ username: profile.username ?? "", display_name: profile.display_name ?? "", bio: profile.bio ?? "" });
  }, [profile?.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    let avatar_url = profile?.avatar_url ?? null;
    if (avatarFile) {
      const path = `${user.id}/${Date.now()}-${avatarFile.name}`;
      const up = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (up.error) { setBusy(false); return toast.error(up.error.message); }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      avatar_url = data.publicUrl;
    }
    const { error } = await supabase.from("profiles").update({ username: form.username, display_name: form.display_name, bio: form.bio, avatar_url }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    refresh();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold neon-gradient-text">Profile</h1>
      <Card className="p-6 glass">
        <form onSubmit={save} className="space-y-4">
          <div><Label>Username</Label><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() })} /></div>
          <div><Label>Display name</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
          <div><Label>Bio</Label><Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
          <div><Label>Avatar</Label><Input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} /></div>
          <Button disabled={busy} className="w-full neon-glow">{busy ? "Saving..." : "Save"}</Button>
        </form>
      </Card>
    </div>
  );
}
