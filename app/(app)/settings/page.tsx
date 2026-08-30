"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import QRCode from "qrcode";
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
import { ClientOnly } from "@/components/rules/client-only";
import { cn } from "@/lib/utils";

const PHOTON_NUMBER = "+1 (415) 603-5536";
const START_TEXT = `Text START to ${PHOTON_NUMBER} from this phone`;
// RFC 5724 sms link, so scanning the code opens Messages with START already typed.
const SMS_LINK = "sms:+14156035536?body=START";

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

  const optedIn = Boolean(profile.phone);

  async function save(next?: { phone?: string | null }) {
    // An empty field means remove the number, undefined would mean leave it alone.
    const value = next && "phone" in next ? next.phone : phone.trim() === "" ? null : phone.trim();
    await update({ phone: value ?? null, timezone, digestHour });
    setSaved(true);
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
            {optedIn && (
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
          <CardDescription>Hourly digest rules send once a day at this hour.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="digest-hour">Digest hour</Label>
            <Select
              value={String(digestHour)}
              onValueChange={(value) => setDigestHour(Number(value))}
            >
              <SelectTrigger id="digest-hour" className="w-full">
                <SelectValue />
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
        <Button type="submit">Save settings</Button>
        {saved && <span className="text-sm text-muted-foreground">Saved</span>}
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
            disabled={!optedIn}
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
  if (profile === null) return <p className="text-sm">Sign in to see your settings.</p>;

  // Keyed on the saved values, so a save mid typing cannot clobber the fields.
  return (
    <SettingsForm
      key={`${profile.phone ?? ""}|${profile.timezone}|${profile.digestHour}`}
      profile={profile}
      update={update}
    />
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
