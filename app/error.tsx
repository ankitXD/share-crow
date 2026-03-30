"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="text-6xl font-bold font-creepster">Oops!</div>
        <p className="text-lg text-muted-foreground">
          Something went wrong. The crow dropped the meme.
        </p>
        <Button size="lg" onClick={reset}>
          Try Again
        </Button>
      </div>
    </main>
  );
}
