"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChatEmptyState } from "@/components/chat/empty-state";
import { ChatFrame, Composer } from "@/components/chat/composer";
import { Message, type ChatMessage } from "@/components/chat/message";

export default function Chat() {
  const startThread = useMutation(api.agent.chat.startThread);
  const sendMessage = useAction(api.agent.chat.sendMessage);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const seen = useRef(0);

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

  const count = messages?.length ?? 0;
  useEffect(() => {
    // Only a new message scrolls, so opening the page leaves the view where it is.
    if (count > seen.current && seen.current > 0) {
      bottom.current?.scrollIntoView({ behavior: "smooth" });
    }
    seen.current = count;
  }, [count, sending]);

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

  // An unopened thread and an empty thread look the same, so nothing flashes while it loads.
  const empty = count === 0;

  return (
    <ChatFrame
      log={
        <>
          {empty && <ChatEmptyState onPick={(s) => void send(s)} disabled={!threadId || sending} />}
          {messages?.map((m) => <Message key={m.key} message={m} />)}
          {sending && <p className="text-sm text-muted-foreground">Voidwatch is thinking</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div ref={bottom} />
        </>
      }
      composer={
        <Composer
          value={text}
          onChange={setText}
          onSend={(t) => void send(t)}
          disabled={!threadId || sending}
        />
      }
    />
  );
}
