"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function JoinSessionPage() {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionCode.length !== 6) {
      setError("Session code must be 6 characters");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sessionCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to join session");
      }

      const data = await res.json();
      setSuccess(`Successfully joined session! Redirecting...`);
      
      // Redirect to session room after a brief delay
      setTimeout(() => {
        router.push(`/sessions/${data.sessionId}`);
      }, 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join Session</CardTitle>
          <CardDescription>
            Enter the 6-digit session code to join
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinSession} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionCode">Session Code</Label>
              <Input
                id="sessionCode"
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toLowerCase())}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center text-2xl font-mono tracking-wider"
              />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            {success && (
              <div className="text-green-600 text-sm font-medium">
                {success}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading || sessionCode.length !== 6}
            >
              {loading ? "Joining..." : "Join Session"}
            </Button>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
