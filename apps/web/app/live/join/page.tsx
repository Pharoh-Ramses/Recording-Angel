"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    <>
      <header
        className="px-4 py-3 border-b"
        style={{ borderColor: "var(--tp-glass-border)" }}
      >
        <h1 className="text-lg font-bold text-[var(--tp-text-primary)]">
          Our Stake
        </h1>
        <p className="text-xs text-[var(--tp-text-secondary)]">Live Visit</p>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <h2 className="text-2xl font-bold text-[var(--tp-text-primary)]">
              Join a Live Session
            </h2>
            <p className="text-sm text-[var(--tp-text-secondary)] mt-1">
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
              style={{
                backgroundColor: "var(--tp-glass-bg)",
                border: "1px solid var(--tp-glass-border)",
                color: "var(--tp-text-primary)",
              }}
            />
            {error && (
              <p className="text-sm text-[var(--tp-accent-red)]">{error}</p>
            )}
            <button
              type="submit"
              className="w-full h-10 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              style={{
                backgroundColor: "var(--tp-accent-green)",
                color: "#fff",
              }}
              disabled={loading || code.trim().length !== 6}
            >
              {loading ? "Joining..." : "Join"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinFormInner />
    </Suspense>
  );
}
