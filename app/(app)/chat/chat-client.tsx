"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = { key: string; role: string; text: string; status: string };

export default function Chat() {
  const startThread = useMutation(api.agent.chat.startThread);
  const sendMessage = useAction(api.agent.chat.sendMessage);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    startThread({})
      .then((id: string) => live && setThreadId(id))
      .catch(() => live && setError("Could not open the chat, try reloading."));
    return () => {
      live = false;
    };
  }, [startThread]);

  const messages = useQuery(
    api.agent.chat.listMessages,
    threadId ? { threadId } : "skip",
  ) as ChatMessage[] | undefined;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const prompt = text.trim();
    if (!prompt || !threadId || sending) return;
    setText("");
    setSending(true);
    setError(null);
    try {
      await sendMessage({ threadId, text: prompt });
    } catch {
      setError("The assistant could not answer, try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold">Ask Voidwatch</h1>
        <p className="text-muted-foreground text-sm">
          Live world state, wiki lookups, and your notification rules.
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto" role="log" aria-live="polite">
        {messages === undefined && (
          <p className="text-muted-foreground text-sm">Loading the conversation</p>
        )}
        {messages?.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Ask something like: notify me about Axi survival fissures.
          </p>
        )}
        {messages?.map((m) => (
          <article key={m.key} className={m.role === "user" ? "text-right" : "text-left"}>
            <span className="text-muted-foreground text-xs">
              {m.role === "user" ? "You" : "Voidwatch"}
            </span>
            <p className="bg-muted inline-block max-w-full rounded-lg px-3 py-2 text-left text-sm whitespace-pre-wrap">
              {m.text}
            </p>
          </article>
        ))}
        {sending && <p className="text-muted-foreground text-sm">Voidwatch is thinking</p>}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div ref={bottom} />
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about fissures, items, or your rules"
          aria-label="Message"
          disabled={!threadId || sending}
        />
        <Button type="submit" disabled={!threadId || sending || text.trim() === ""}>
          Send
        </Button>
      </form>
    </div>
  );
}
