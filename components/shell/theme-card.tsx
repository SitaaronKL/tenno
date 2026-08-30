"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/segmented";

const OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function ThemeCard() {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known in the browser, so the control waits for mount.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>System follows your device.</CardDescription>
      </CardHeader>
      <CardContent>
        <Segmented
          label="Theme"
          options={OPTIONS}
          value={mounted ? ((theme as (typeof OPTIONS)[number]["value"]) ?? "system") : "system"}
          onChange={setTheme}
        />
      </CardContent>
    </Card>
  );
}
