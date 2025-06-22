"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewSessionPage() {
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSession = async () => {
    setLoading(true);
    setError(null);
    setSessionCode(null);
    try {
      const res = await fetch("/api/sessions/create", { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to create session");
      }
      const data = await res.json();
      setSessionCode(data.code);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New Session</CardTitle>
          <CardDescription>Click the button to create a session and get a session code.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 items-center">
          <Button onClick={handleCreateSession} disabled={loading} size="lg">
            {loading ? "Creating..." : "Create Session"}
          </Button>
          {sessionCode && (
            <div className="text-center mt-4">
              <div className="text-lg font-semibold">Session Code:</div>
              <div className="text-3xl font-mono font-bold tracking-wider text-orange-600 mt-2">{sessionCode}</div>
            </div>
          )}
          {error && <div className="text-red-500 mt-2">{error}</div>}
        </CardContent>
      </Card>
    </div>
  );
} 