"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function TagInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const text = draft.trim();
    if (!text || values.includes(text)) return;
    onChange([...values, text]);
    setDraft("");
  }

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium" htmlFor="tag-input">
        {label}
      </label>
      <Input
        id="tag-input"
        value={draft}
        placeholder="Type a name, press Enter"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
      />
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <Badge key={v} variant="secondary">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
              x
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
