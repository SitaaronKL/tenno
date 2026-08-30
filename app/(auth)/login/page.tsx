"use client";

import { useState } from "react";
import { useAuth } from "@/components/shell/auth-actions";
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
import { Toaster } from "@/components/ui/sonner";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
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

  async function onMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await signIn("resend", { email, redirectTo: "/dashboard" });
      setSentTo(email);
      toast.success("Magic link sent.");
    } catch {
      toast.error("We could not send the link, check the address.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        {sentTo ? (
          <>
            <CardHeader>
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
            <CardHeader>
              <CardTitle>Sign in to Tenno</CardTitle>
              <CardDescription>Warframe world state, watched your way.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button onClick={onDiscord} disabled={busy}>
                Continue with Discord
              </Button>
              <div className="text-center text-xs text-muted-foreground">or</div>
              <form onSubmit={onMagicLink} className="flex flex-col gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="tenno@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="submit" variant="outline" disabled={busy}>
                  Email me a magic link
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
      <Toaster />
    </div>
  );
}
