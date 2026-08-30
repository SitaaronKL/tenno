"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile, useUpdateProfile, type Profile } from "@/components/rules/api";
import { ClientOnly } from "@/components/rules/client-only";

const PHOTON_NUMBER = "+1 (415) 603-5536";
const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs";

function timezones(): string[] {
  const supported = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  return supported.supportedValuesOf?.("timeZone") ?? ["UTC"];
}

function SettingsBody() {
  const profile = useProfile();
  const update = useUpdateProfile();

  if (profile === undefined) return <Skeleton className="m-6 h-64" />;
  if (profile === null) return <p className="p-6 text-sm">Sign in to see your settings.</p>;

  // Keyed on the saved values, so a save mid typing cannot clobber the fields.
  return (
    <SettingsForm
      key={`${profile.phone ?? ""}|${profile.timezone}|${profile.digestHour}`}
      profile={profile}
      update={update}
    />
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
  const verified = Boolean(profile.phoneVerified);

  async function save() {
    // An empty field means remove the number, undefined would mean leave it alone.
    await update({ phone: phone.trim() === "" ? null : phone.trim(), timezone, digestHour });
    setSaved(true);
  }

  return (
    <form
      className="grid max-w-2xl gap-6 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Email comes from how you signed in.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" readOnly value={profile.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>iMessage</CardTitle>
          <CardDescription>We can only text you after you text us first.</CardDescription>
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
            <div className="rounded-md border p-3 text-sm">
              <p>Text START to {PHOTON_NUMBER} from this phone</p>
              <p className="mt-1 text-muted-foreground">
                {verified ? "Phone verified, texts are on." : "Waiting for your first text."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Digest</CardTitle>
          <CardDescription>When digest rules get sent, in your timezone.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="digest-hour">Digest hour</Label>
            <select
              id="digest-hour"
              className={selectClass}
              value={digestHour}
              onChange={(e) => setDigestHour(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              className={selectClass}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {timezones().map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit">Save settings</Button>
        {saved && <span className="text-sm text-muted-foreground">Saved</span>}
      </div>
    </form>
  );
}

export default function SettingsPage() {
  return (
    <ClientOnly fallback={<Skeleton className="m-6 h-64" />}>
      <SettingsBody />
    </ClientOnly>
  );
}
