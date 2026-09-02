"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChatEmptyState } from "@/components/chat/empty-state";
import { ChatFrame, Composer } from "@/components/chat/composer";
import { Message, type ChatMessage } from "@/components/chat/message";
import { Button } from "@/components/ui/button";
import { MessageSquareIcon } from "@/components/icons/message-square";
import { XIcon } from "@/components/icons/x";
import { SquarePenIcon } from "@/components/icons/square-pen";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_SIZE = 50;

export default function Chat() {
  const newThread = useMutation(api.agent.chat.newThread);
  const setArchived = useMutation(api.agent.chat.setThreadArchived);
  const sendMessage = useAction(api.agent.chat.sendMessage);
  const threads = useQuery(api.agent.chat.listThreads) ?? [];
  // Null is a fresh chat: the thread only exists once something was said.
  const [threadId, setThreadId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const seen = useRef(0);
  const described = useRef(false);

  // "New rule, describe" lands here with the words carried over and sends them right away.
  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get("describe");
    if (prompt && !described.current) {
      described.current = true;
      window.history.replaceState(null, "", window.location.pathname);
      void send(prompt);
    }
    // send changes identity per render, this only ever runs for the arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openThread(id: string | null) {
    seen.current = 0;
    setError(null);
    setThreadId(id);
  }

  // The thread answers newest first, so each page is reversed to read top to bottom.
  const { results, status, loadMore } = usePaginatedQuery(
    api.agent.chat.listMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: PAGE_SIZE },
  );
  // Sorted by conversation position, so page direction can never flip a reply above its question.
  const messages = useMemo(
    () =>
      [...(results as ChatMessage[])].sort(
        (a, b) => a.order - b.order || a.stepOrder - b.stepOrder,
      ),
    [results],
  );

  const count = messages.length;
  useEffect(() => {
    // Only a new message scrolls, so opening the page leaves the view where it is.
    if (count > seen.current && seen.current > 0) {
      bottom.current?.scrollIntoView({ behavior: "smooth" });
    }
    seen.current = count;
  }, [count, sending]);

  async function send(prompt: string) {
    if (!prompt || sending) return;
    setText("");
    setSending(true);
    setError(null);
    try {
      let id = threadId;
      if (!id) {
        // The first line names the thread in the history.
        id = await newThread({ title: prompt.slice(0, 60) });
        setThreadId(id);
      }
      await sendMessage({ threadId: id, text: prompt });
    } catch {
      setError("The assistant could not answer, try again.");
    } finally {
      setSending(false);
    }
  }

  // An unopened thread and an empty thread look the same, so nothing flashes while it loads.
  const empty = count === 0;
  const canLoadMore = status === "CanLoadMore";

  return (
    <>
      <div className="mx-auto -mt-2 mb-2 flex w-full max-w-3xl items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" variant="ghost" size="sm" aria-label="Chat history" />}
          >
            <MessageSquareIcon size={14} aria-hidden="true" /> History
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
            {threads.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">No chats yet</p>
            )}
            {threads.map((thread) => (
              <DropdownMenuItem
                key={thread.id}
                className="justify-between gap-2"
                onClick={() => openThread(thread.id)}
              >
                <span className="truncate">{thread.title}</span>
                <button
                  type="button"
                  aria-label={`Archive ${thread.title}`}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    // Archiving is not opening, the row click must not fire too.
                    e.stopPropagation();
                    if (threadId === thread.id) openThread(null);
                    void setArchived({ threadId: thread.id, archived: true });
                  }}
                >
                  <XIcon size={12} aria-hidden="true" />
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="New chat"
          onClick={() => openThread(null)}
          // Already on a fresh chat, another one would do nothing.
          disabled={!threadId}
        >
          <SquarePenIcon size={14} aria-hidden="true" /> New chat
        </Button>
      </div>
      <ChatFrame
        log={
          <>
            {empty && <ChatEmptyState onPick={(s) => void send(s)} disabled={sending} />}
            {canLoadMore && (
              <button
                type="button"
                onClick={() => loadMore(PAGE_SIZE)}
                className="mx-auto block text-sm text-muted-foreground underline underline-offset-4"
              >
                Load older messages
              </button>
            )}
            {messages.map((m) => <Message key={m.key} message={m} />)}
            {sending && <p className="text-sm text-muted-foreground">Voidwatch is thinking</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div ref={bottom} />
          </>
        }
        composer={
          <Composer value={text} onChange={setText} onSend={(t) => void send(t)} disabled={sending} />
        }
      />
    </>
  );
}
