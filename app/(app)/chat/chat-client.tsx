"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Check, Send } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LogoMark } from "@/components/shell/logo-mark";

type ChatMessage = { key: string; role: string; text: string; status: string };

const SUGGESTIONS = [
  "What is worth running right now",
  "Alert me when Baro brings Primed Chamber",
  "Any Axi Survival fissures",
  "When does Cetus go night",
];

// A tool step comes back as an assistant turn with no prose, so it reads as one quiet row.
function ToolRow() {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <Check className="size-3 text-success" aria-hidden="true" />
      Checked world state
    </p>
  );
}

function Message({ message }: { message: ChatMessage }) {
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
      <LogoMark size={20} className="mt-0.5 opacity-80" />
      <div className="min-w-0 flex-1 text-sm leading-6 whitespace-pre-wrap">
        {message.text.trim() === "" ? <ToolRow /> : message.text}
      </div>
    </article>
  );
}

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

  async function send(prompt: string) {
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

  const empty = messages?.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100svh-6.5rem)] w-full max-w-3xl flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4" role="log" aria-live="polite">
        {messages === undefined && (
          <p className="text-sm text-muted-foreground">Loading the conversation</p>
        )}
        {empty && (
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
                  onClick={() => void send(s)}
                  disabled={!threadId || sending}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
        {messages?.map((m) => <Message key={m.key} message={m} />)}
        {sending && <p className="text-sm text-muted-foreground">Voidwatch is thinking</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div ref={bottom} />
      </div>

      <div className="sticky bottom-0 bg-background pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(text.trim());
          }}
          className="flex items-end gap-2 rounded-xl bg-card p-2 ring-1 ring-foreground/10"
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            // Enter sends, Shift Enter starts a new line.
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text.trim());
              }
            }}
            rows={1}
            placeholder="Ask about fissures, items, or your rules"
            aria-label="Message"
            disabled={!threadId || sending}
            className="max-h-40 min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send"
            disabled={!threadId || sending || text.trim() === ""}
          >
            <Send className="size-4" aria-hidden="true" />
          </Button>
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Text this agent from iMessage, link your phone in Settings
        </p>
      </div>
    </div>
  );
}
