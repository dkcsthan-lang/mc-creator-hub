import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — OnlyCreators" },
      { name: "description", content: "Sign in or create an account on OnlyCreators." },
      { property: "og:title", content: "Sign in — OnlyCreators" },
      { property: "og:description", content: "Sign in or create an account on OnlyCreators." },
    ],
  }),
  component: AuthPage,
});

/** Turns raw auth/network errors into plain, friendly guidance. */
function friendlyAuthError(err: unknown): string {
  const raw = (err as { message?: string })?.message ?? String(err ?? "");
  const m = raw.toLowerCase();
  if (!raw) return "Something went wrong. Please try again.";
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("timeout") || m.includes("load failed")) {
    return "Connection hiccup — please check your internet and try again.";
  }
  if (m.includes("invalid login credentials")) return "Wrong email or password. Please try again.";
  if (m.includes("email not confirmed")) return "Please confirm your email, then sign in.";
  if (m.includes("already registered") || m.includes("already exists")) return "That email already has an account — try signing in instead.";
  if (m.includes("password") && m.includes("6")) return "Password must be at least 6 characters.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  return raw;
}

/** Retries transient network failures so a single hiccup never blocks sign in. */
async function withRetry<T extends { error: unknown }>(run: () => Promise<T>, attempts = 3): Promise<T> {
  let last: T | undefined;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await run();
      const msg = ((res.error as { message?: string })?.message ?? "").toLowerCase();
      const transient = msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed") || msg.includes("timeout");
      if (!res.error || !transient) return res;
      last = res;
    } catch (e) {
      last = { error: e } as T;
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  return last as T;
}

function AuthPage() {
  const nav = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  function afterAuth() {
    const to = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/";
    nav({ to: to as string });
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await withRetry(() => supabase.auth.signInWithPassword({ email: email.trim(), password }));
    setLoading(false);
    if (error) return toast.error(friendlyAuthError(error));
    toast.success("Welcome back!");
    afterAuth();
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await withRetry(() =>
      supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { username: username.trim(), display_name: username.trim() },
        },
      }),
    );
    setLoading(false);
    if (error) return toast.error(friendlyAuthError(error));
    if (!data?.session) {
      toast.success("Almost there — check your email to confirm your account.");
      return;
    }
    toast.success("Account created. You're signed in.");
    afterAuth();
  }

  async function google() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) return toast.error(friendlyAuthError(result.error));
      if (result.redirected) return;
      afterAuth();
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
      <Card className="w-full p-6 glass">
        <h1 className="text-2xl font-bold neon-gradient-text">Welcome to OnlyCreators</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">Sign in or create your account.</p>

        <Button onClick={google} disabled={loading} variant="outline" className="mb-4 w-full">Continue with Google</Button>
        <div className="mb-4 text-center text-xs uppercase text-muted-foreground">or</div>

        <Tabs defaultValue="in">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="in">Sign in</TabsTrigger>
            <TabsTrigger value="up">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="in">
            <form onSubmit={signIn} className="mt-4 space-y-3">
              <div><Label>Email</Label><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button disabled={loading} className="w-full neon-glow">{loading ? "Signing in..." : "Sign in"}</Button>
            </form>
          </TabsContent>
          <TabsContent value="up">
            <form onSubmit={signUp} className="mt-4 space-y-3">
              <div><Label>Username</Label><Input required minLength={3} value={username} onChange={(e) => setUsername(e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button disabled={loading} className="w-full neon-glow">{loading ? "Creating account..." : "Create account"}</Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
