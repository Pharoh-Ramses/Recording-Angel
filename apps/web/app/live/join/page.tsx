"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function JoinFormInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get("code") ?? "";
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = code.trim().toUpperCase();
      if (trimmed.length !== 6) {
        setError("Join code must be 6 characters");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_RECORDING_ANGEL_URL;
        const res = await fetch(`${apiUrl}/sessions/${trimmed}`);
        if (res.status === 404) {
          setError("Session not found. Check the code and try again.");
          return;
        }
        if (!res.ok) {
          setError("Something went wrong. Try again.");
          return;
        }

        const { sessionId } = await res.json();
        router.push(`/live/${sessionId}?code=${trimmed}`);
      } catch {
        setError("Could not connect. Check your internet and try again.");
      } finally {
        setLoading(false);
      }
    },
    [code, router],
  );

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h2 className="text-2xl font-bold">Join a Live Session</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the 6-character join code shared by the host
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().slice(0, 6));
              setError(null);
            }}
            placeholder="ABC123"
            className="text-center text-2xl tracking-[0.3em] font-mono h-14"
            maxLength={6}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || code.trim().length !== 6}
          >
            {loading ? "Joining..." : "Join"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinFormInner />
    </Suspense>
  );
}
