"use client";

import type { ReactNode } from "react";
import { SendIcon } from "@/components/icons/send";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function Composer({
  value,
  onChange,
  onSend,
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend(value.trim());
        }}
        className="flex items-end gap-2 rounded-xl bg-card p-2 ring-1 ring-foreground/10"
      >
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // Enter sends, Shift Enter starts a new line.
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(value.trim());
            }
          }}
          rows={1}
          placeholder="Ask about fissures, items, or your rules"
          aria-label="Message"
          disabled={disabled}
          className="max-h-40 min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <Button type="submit" size="icon" aria-label="Send" disabled={disabled || value.trim() === ""}>
          <SendIcon size={16} aria-hidden="true" />
        </Button>
      </form>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Text your Cephalon from iMessage, link your phone in Settings
      </p>
    </>
  );
}

// The composer never sits on the bottom edge, the log scrolls behind a generous gutter.
// The height leaves room for the history row above, so the page itself never scrolls.
export function ChatFrame({ log, composer }: { log: ReactNode; composer: ReactNode }) {
  return (
    <div className="mx-auto flex h-[calc(100svh-11rem)] w-full max-w-3xl flex-col pb-4">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-8" role="log" aria-live="polite">
        {log}
      </div>
      <div className="pt-2">{composer}</div>
    </div>
  );
}
