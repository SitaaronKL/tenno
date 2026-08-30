"use client";

import Link from "next/link";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Keys are stable per rotation, so a new sortie or a new week starts unticked on its own.
export const sortieKey = (setKey: string, key: string, node: string) => `${setKey}:${key}:${node}`;
export const nightwaveKey = (act: string) => `nightwave:${act}`;
export const invasionKey = (key: string) => `invasion:${key}`;

// An invasion has no end time upstream, a week past its start is well past its life.
export const INVASION_LIFE = 7 * 24 * 60 * 60 * 1000;

// A ticked row reads as finished without leaving the list, so the order never shifts.
export const doneRow = "text-muted-foreground line-through";

type Checkoffs = {
  done: ReadonlySet<string>;
  toggle: (key: string, expiresAt: number) => void;
};

const CheckoffsContext = createContext<Checkoffs>({ done: new Set<string>(), toggle: () => {} });

export function useCheckoffs(): Checkoffs {
  return useContext(CheckoffsContext);
}

// How many of these are still to do, for the count pill on the box header.
export function remaining(keys: string[], done: ReadonlySet<string>): number {
  return keys.filter((key) => !done.has(key)).length;
}

// Everyone sees the boxes. Only a real account can keep a tick, so a guest is asked to sign in.
export function Checkoffs({
  canSave,
  done,
  onToggle,
  children,
}: {
  canSave: boolean;
  done: ReadonlySet<string>;
  onToggle: (key: string, expiresAt: number) => void;
  children: ReactNode;
}) {
  const [asking, setAsking] = useState(false);
  const value = useMemo<Checkoffs>(
    () => ({
      done,
      toggle: (key, expiresAt) => {
        if (!canSave) {
          setAsking(true);
          return;
        }
        onToggle(key, expiresAt);
      },
    }),
    [canSave, done, onToggle],
  );

  return (
    <CheckoffsContext.Provider value={value}>
      {children}
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in to save this</DialogTitle>
            <DialogDescription>
              Check offs are saved to your account so they follow you across devices.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Not now</DialogClose>
            <Button nativeButton={false} render={<Link href="/login" />}>
              Sign in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CheckoffsContext.Provider>
  );
}

// One box, the same on a sortie stage, a nightwave act and an invasion row.
export function Checkoff({
  id,
  expiresAt,
  label,
  className,
}: {
  id: string;
  expiresAt: number;
  label: string;
  className?: string;
}) {
  const { done, toggle } = useCheckoffs();
  return (
    <Checkbox
      checked={done.has(id)}
      onCheckedChange={() => toggle(id, expiresAt)}
      aria-label={label}
      className={cn("inline-flex shrink-0 align-middle", className)}
    />
  );
}
