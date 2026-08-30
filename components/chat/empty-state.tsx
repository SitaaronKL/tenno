"use client";

import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shell/logo-mark";

// Three, so the eye takes them in at once instead of reading a menu.
export const SUGGESTIONS = [
  "What is worth running right now",
  "Any Axi Survival fissures",
  "When does Cetus go night",
];

export function ChatEmptyState({
  onPick,
  disabled = false,
}: {
  onPick?: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
      <LogoMark size={40} />
      <p className="text-lg font-medium">What do you want to know, Tenno?</p>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <Button
            key={s}
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={disabled || !onPick}
            onClick={() => onPick?.(s)}
          >
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}
