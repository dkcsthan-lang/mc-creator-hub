import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";
import { useStorageUrl } from "@/components/StorageImage";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — OnlyCreators" }] }),
  component: Profile,
});

function Profile() {
  const { user } = useSession();
  const { profile, refresh } = useProfile();
  const [form, setForm] = useState({ username: "", display_name: "", bio: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const bannerUrl = useStorageUrl(profile?.banner_url);

  useEffect(() => {
    if (profile) setForm({ username: profile.username ?? "", display_name: profile.display_name ?? "", bio: profile.bio ?? "" });
  }, [profile?.id]);

  async function upload(file: File) {
    const path = `${user!.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (up.error) throw new Error(up.error.message);
    return `avatars/${path}`;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let avatar_url = profile?.avatar_url ?? null;
      let banner_url = profile?.banner_url ?? null;
      if (avatarFile) avatar_url = await upload(avatarFile);
      if (bannerFile) banner_url = await upload(bannerFile);
      const { error } = await supabase.from("profiles")
        .update({ username: form.username, display_name: form.display_name, bio: form.bio, avatar_url, banner_url })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      toast.success("Profile saved");
      setAvatarFile(null);
      setBannerFile(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  async function removeBanner() {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ banner_url: null }).eq("id", user.id);
    if (error) return toast.error(error.message);
    setBannerFile(null);
    toast.success("Banner removed");
    refresh();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold neon-gradient-text">Profile</h1>

      {/* Live preview — banner sits above the logo, and is skipped entirely when unset */}
      <Card className="mb-6 overflow-hidden glass">
        {bannerUrl && <img src={bannerUrl} alt="" className="h-28 w-full object-cover sm:h-36" />}
        <div className={"flex items-center gap-3 p-4 " + (bannerUrl ? "-mt-8" : "")}>
          <UserAvatar
            src={profile?.avatar_url}
            gifSrc={profile?.gif_avatar_url}
            className="h-16 w-16 border-4 border-background"
            iconClassName="h-6 w-6"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold">{form.display_name || form.username || "Your name"}</p>
            {form.username && <p className="truncate text-xs text-muted-foreground">@{form.username}</p>}
            {form.bio && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{form.bio}</p>}
          </div>
        </div>
      </Card>

      <Card className="p-6 glass">
        <form onSubmit={save} className="space-y-4">
          <div><Label>Username</Label><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() })} /></div>
          <div><Label>Display name</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
          <div><Label>Bio</Label><Textarea rows={3} maxLength={280} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell creators what you do..." /></div>
          <div>
            <Label>Logo / avatar</Label>
            <Input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Banner (optional)</Label>
              {profile?.banner_url && (
                <button type="button" onClick={removeBanner} className="text-xs text-muted-foreground underline hover:text-destructive">Remove</button>
              )}
            </div>
            <Input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)} />
            <p className="mt-1 text-[11px] text-muted-foreground">Wide image works best. No banner? Your profile simply shows no banner.</p>
          </div>
          <Button disabled={busy} className="w-full neon-glow">{busy ? "Saving..." : "Save"}</Button>
        </form>
      </Card>
    </div>
  );
}
