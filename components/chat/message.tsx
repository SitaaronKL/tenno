"use client";

import { CheckIcon } from "@/components/icons/check";
import { AsciiLogo } from "@/components/ascii-logo";

export type ChatMessage = {
  key: string;
  role: string;
  text: string;
  status: string;
  order: number;
  stepOrder: number;
};

// A tool step comes back as an assistant turn with no prose, so it reads as one quiet row.
function ToolRow() {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <CheckIcon size={12} className="text-success" aria-hidden="true" />
      Checked world state
    </p>
  );
}

export function Message({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <article className="flex justify-end">
        <p className="max-w-[80%] rounded-xl bg-surface-2 px-3.5 py-2 text-sm whitespace-pre-wrap">
          {message.text}
        </p>
      </article>
    );
  }
  return (
    <article className="flex gap-3">
      {/* The ASCII mark from the landing page is the agent's face, no avatar image and no initials. */}
      <AsciiLogo size={24} cell={3} animated={false} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 text-sm leading-6 whitespace-pre-wrap">
        {message.text.trim() === "" ? <ToolRow /> : message.text}
      </div>
    </article>
  );
}
