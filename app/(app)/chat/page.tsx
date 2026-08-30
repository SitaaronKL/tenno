"use client";

import dynamic from "next/dynamic";
import { ChatEmptyState } from "@/components/chat/empty-state";
import { ChatFrame, Composer } from "@/components/chat/composer";

// The fallback is the empty state itself, so opening the page never flashes a loading line.
const Chat = dynamic(() => import("./chat-client"), {
  ssr: false,
  loading: () => (
    <ChatFrame
      log={<ChatEmptyState disabled />}
      composer={<Composer value="" onChange={() => {}} onSend={() => {}} disabled />}
    />
  ),
});

export default function ChatPage() {
  return <Chat />;
}
