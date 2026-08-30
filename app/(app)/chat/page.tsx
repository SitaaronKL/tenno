"use client";

import dynamic from "next/dynamic";

// The chat is live only, so keep it out of the prerendered shell.
const Chat = dynamic(() => import("./chat-client"), {
  ssr: false,
  loading: () => <p className="text-sm text-muted-foreground">Loading the conversation</p>,
});

export default function ChatPage() {
  return <Chat />;
}
