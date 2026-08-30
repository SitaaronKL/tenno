"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { CheckIcon } from "@/components/icons/check";
import { CopyIcon } from "@/components/icons/copy";
import { LogoutIcon } from "@/components/icons/logout";
import { XIcon } from "@/components/icons/x";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shell/page-header";
import { ThemeCard } from "@/components/shell/theme-card";
import { useProfile, useUpdateProfile, type Profile } from "@/components/rules/api";
import { errorMessage } from "@/lib/errors";
import {
  DEFAULT_DIGEST_HOUR,
  detectTimezone,
  shouldAdoptTimezone,
} from "@/components/settings/timezone";
import { ClientOnly } from "@/components/rules/client-only";
import { WorldStateCard } from "@/components/settings/world-state-card";
import { cn } from "@/lib/utils";

// The Photon shared pool assigns the line. Unset means there is no line, not a number to invent.
const PHOTON_NUMBER = process.env.NEXT_PUBLIC_PHOTON_NUMBER ?? "";
const START_TEXT = `Text START to ${PHOTON_NUMBER} from this phone`;
// RFC 5724 sms link, so scanning the code opens Messages with START already typed.
const SMS_LINK = `sms:${PHOTON_NUMBER.replace(/[^\d+]/g, "")}?body=START`;

function timezones(): string[] {
  const supported = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  return supported.supportedValuesOf?.("timeZone") ?? ["UTC"];
}

function StatePill({ verified }: { verified: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ring-1",
        verified ? "bg-success/10 text-success ring-success/25" : "bg-surface-2 text-muted-foreground ring-border",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", verified ? "bg-success" : "bg-muted-foreground")}
      />
      {verified ? "Verified" : "Unverified"}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Copy the number"
      onClick={async () => {
        await navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <CheckIcon size={14} className="text-success" /> : <CopyIcon size={14} />}
    </Button>
  );
}

// The code is drawn in the browser, so no image ships with the page.
function SmsQr() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(SMS_LINK, { margin: 1, width: 176, color: { dark: "#f5f5f5", light: "#0000" } })
      .then((url) => live && setSrc(url))
      .catch(() => live && setSrc(null));
    return () => {
      live = false;
    };
  }, []);
  if (!src) return <Skeleton className="size-22 rounded-lg" />;
  return (
    <Image src={src} alt={`QR code that opens a text to ${PHOTON_NUMBER}`} width={88} height={88} unoptimized />
  );
}

function SignOutButton() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        await signOut();
        router.push("/login");
      }}
    >
      <LogoutIcon size={14} aria-hidden="true" /> Sign out
    </Button>
  );
}

function SettingsForm({
  profile,
  update,
}: {
  profile: Profile;
  update: (args: { phone?: string | null; timezone?: string; digestHour?: number }) => Promise<unknown>;
}) {
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [timezone, setTimezone] = useState(profile.timezone);
  const [digestHour, setDigestHour] = useState(profile.digestHour);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adopted = useRef(false);

  const optedIn = Boolean(profile.phone);

  // The digest cron needs a real zone, so the first load fills one in and saves it once.
  useEffect(() => {
    const detected = detectTimezone();
    if (adopted.current || !shouldAdoptTimezone(profile.timezone, detected)) return;
    adopted.current = true;
    setTimezone(detected);
    setDigestHour(DEFAULT_DIGEST_HOUR);
    void update({ timezone: detected, digestHour: DEFAULT_DIGEST_HOUR });
  }, [profile.timezone, update]);

  async function save(next?: { phone?: string | null }) {
    // An empty field means remove the number, undefined would mean leave it alone.
    const value = next && "phone" in next ? next.phone : phone.trim() === "" ? null : phone.trim();
    setBusy(true);
    setError(null);
    try {
      await update({ phone: value ?? null, timezone, digestHour });
      setSaved(true);
    } catch (caught) {
      // A rejected save must say so, a silent failure looks like it worked.
      const message = errorMessage(caught, "Could not save your settings, try again.");
      setError(message);
      setSaved(false);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>From your sign in.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" readOnly value={profile.email} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="grid gap-1">
              <CardTitle>iMessage</CardTitle>
              <CardDescription>We can only text you after you text us first.</CardDescription>
            </div>
            <StatePill verified={Boolean(profile.phoneVerified)} />
          </CardHeader>
          <CardContent className="grid gap-3">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 555 000 1234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {optedIn && PHOTON_NUMBER !== "" && (
              <div className="flex items-center gap-3 rounded-lg bg-surface-2 p-3 ring-1 ring-border">
                <SmsQr />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-sm">
                    {START_TEXT}
                    <CopyButton value={PHOTON_NUMBER} />
                  </p>
                  <p className="text-xs text-muted-foreground">Scan the code to open the text.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Digest</CardTitle>
          <CardDescription>Digest rules collect all day and arrive once, at this hour.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="digest-hour">Digest hour</Label>
            <Select
              value={String(digestHour)}
              onValueChange={(value) => setDigestHour(Number(value))}
            >
              <SelectTrigger id="digest-hour" className="w-full">
                {/* The trigger holds the raw value, so it reads the hour back the way the list writes it. */}
                <SelectValue>{(value: string) => `${String(value).padStart(2, "0")}:00`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, "0")}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={(value) => setTimezone(value ?? timezone)}>
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {timezones().map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ThemeCard />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving" : "Save settings"}
        </Button>
        {saved && !error && <span className="text-sm text-muted-foreground">Saved</span>}
        {error && (
          <span role="alert" className="text-sm text-destructive">
            {error}
          </span>
        )}
      </div>

      <Card className="ring-destructive/25">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>Both take effect right away.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="destructive"
            disabled={!optedIn || busy}
            onClick={() => {
              setPhone("");
              void save({ phone: null });
            }}
          >
            <XIcon size={14} aria-hidden="true" /> Remove phone
          </Button>
          <SignOutButton />
        </CardContent>
      </Card>
    </form>
  );
}

function SettingsBody() {
  const profile = useProfile();
  const update = useUpdateProfile();

  if (profile === undefined) return <Skeleton className="h-64 w-full rounded-xl" />;

  // The world state switches sit outside the form: a guest keeps them in the browser.
  return (
    <div className="grid gap-4">
      {profile === null ? (
        <p className="text-sm">Sign in to see your settings.</p>
      ) : (
        // Keyed on the saved values, so a save mid typing cannot clobber the fields.
        <SettingsForm
          key={`${profile.phone ?? ""}|${profile.timezone}|${profile.digestHour}`}
          profile={profile}
          update={update}
        />
      )}
      <WorldStateCard />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" helper="Where Voidwatch reaches you, and when." />
      <ClientOnly fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <SettingsBody />
      </ClientOnly>
    </>
  );
}
