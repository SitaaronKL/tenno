"use client";

import { ErrorScreen } from "@/components/error-screen";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorScreen
      code="500"
      title="The relay dropped"
      body={error.digest ? `Something broke on our side, reference ${error.digest}.` : "Something broke on our side."}
      action={<Button onClick={retry}>Try again</Button>}
    />
  );
}
