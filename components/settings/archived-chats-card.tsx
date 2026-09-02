"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Nothing archived, no card: the section only exists once there is something in it.
export function ArchivedChatsCard() {
  const threads = useQuery(api.agent.chat.listArchivedThreads) ?? [];
  const setArchived = useMutation(api.agent.chat.setThreadArchived);
  if (threads.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Archived chats</CardTitle>
        <CardDescription>Restore one to see it in the chat history again.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {threads.map((thread) => (
          <div key={thread.id} className="flex items-center justify-between gap-3">
            <span className="truncate text-sm">{thread.title}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void setArchived({ threadId: thread.id, archived: false })}
            >
              Restore
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
