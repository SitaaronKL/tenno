"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/components/shell/logo-mark";

type Flow = "signIn" | "signUp";

// Convex Auth hides the reason for a refused password, so the copy has to cover both halves.
function messageFor(error: unknown, flow: Flow) {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return flow === "signUp"
    ? "We could not create that account. That email may already be in use."
    : "Wrong email or password.";
}

export default function LoginPage() {
  const { signIn } = useAuthActions();
  // One source of truth: the server registers a provider only where its secret exists, and says so.
  const enabled = useQuery(api.auth.providers, {});
  const discord = enabled?.discord ?? false;
  const magicLink = enabled?.magicLink ?? false;
  const password = enabled?.password ?? false;
  const guest = enabled?.guest ?? false;
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [flow, setFlow] = useState<Flow>("signIn");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onDiscord() {
    setBusy(true);
    try {
      await signIn("discord", { redirectTo: "/dashboard" });
    } catch {
      toast.error("Discord sign in failed, try again.");
      setBusy(false);
    }
  }

  // For a deployment without Discord and Resend keys, switched on with NEXT_PUBLIC_ALLOW_GUEST.
  async function onGuest() {
    setBusy(true);
    try {
      await signIn("anonymous", { redirectTo: "/dashboard" });
    } catch {
      toast.error("Guest sign in failed, try again.");
      setBusy(false);
    }
  }

  async function onPassword() {
    setError(null);
    setBusy(true);
    try {
      await signIn("password", { email, password: secret, flow, redirectTo: "/dashboard" });
    } catch (caught) {
      setError(messageFor(caught, flow));
    } finally {
      setBusy(false);
    }
  }

  async function onMagicLink() {
    if (email.trim() === "") {
      setError("Enter your email first.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await signIn("resend", { email, redirectTo: "/dashboard" });
      setSentTo(email);
      toast.success("Magic link sent.");
    } catch {
      setError("We could not send the link, check the address.");
    } finally {
      setBusy(false);
    }
  }

  const submitLabel = flow === "signUp" ? "Create account" : "Sign in";

  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden p-6">
      {/* The wash is the accent at 8 percent, white on dark and black on light, same as the landing hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,var(--accent-soft),transparent_65%)]"
      />
      <Card className="relative w-full max-w-sm">
        {sentTo ? (
          <>
            <CardHeader className="justify-items-center text-center">
              <LogoMark size={32} className="mb-2" />
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                We sent a sign in link to {sentTo}. The link expires in 15 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setSentTo(null)}>
                Use a different email
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="justify-items-center text-center">
              <LogoMark size={32} className="mb-2" />
              <CardTitle>
                {password && flow === "signUp" ? "Create your account" : "Sign in to Voidwatch"}
              </CardTitle>
              <CardDescription>Warframe world state, watched your way.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {discord && (
                <Button onClick={onDiscord} disabled={busy}>
                  Continue with Discord
                </Button>
              )}
              {discord && (password || magicLink) && (
                <div className="text-center text-xs text-muted-foreground">or</div>
              )}

              {(password || magicLink) && (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void (password ? onPassword() : onMagicLink());
                  }}
                >
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {password && (
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete={flow === "signUp" ? "new-password" : "current-password"}
                        placeholder="At least 8 characters"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                      />
                    </div>
                  )}
                  {error && (
                    <p role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  {password && (
                    <Button type="submit" disabled={busy}>
                      {submitLabel}
                    </Button>
                  )}
                  {magicLink && (
                    <Button
                      type={password ? "button" : "submit"}
                      variant="outline"
                      disabled={busy}
                      onClick={password ? () => void onMagicLink() : undefined}
                    >
                      Email me a magic link
                    </Button>
                  )}
                </form>
              )}

              {password && (
                <div className="text-center text-sm text-muted-foreground">
                  {flow === "signIn" ? "New to Voidwatch? " : "Already have an account? "}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => {
                      setError(null);
                      setFlow(flow === "signIn" ? "signUp" : "signIn");
                    }}
                  >
                    {flow === "signIn" ? "Create one" : "Sign in instead"}
                  </Button>
                </div>
              )}

              {guest && (
                <Button onClick={onGuest} variant="link" size="sm" disabled={busy}>
                  Continue as guest
                </Button>
              )}
              {!discord && !magicLink && !password && !guest && (
                <p className="text-sm text-muted-foreground">
                  No sign in method is configured for this deployment yet.
                </p>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
