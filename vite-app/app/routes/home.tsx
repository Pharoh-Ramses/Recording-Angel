import type { Route } from "./+types/home";
import { AudioTranscription } from "../components/AudioTranscription";
import { AppHeader } from "../components/AppHeader";
import { useState } from "react";
import { RequireAuth } from "../components/ProtectedRoute";
import { useSession } from "../lib/auth/client";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Recording Angel - Live Transcription" },
    { name: "description", content: "Real-time audio transcription and translation" },
  ];
}

export default function Home() {
  const { data: session } = useSession();
  const user = session?.user;
  const [sessionId] = useState(() => `session-${Date.now()}`);

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-100">
        <AppHeader />
        <AudioTranscription 
          sessionId={sessionId}
          userId={user?.id || 'unknown'}
          serverUrl="ws://localhost:8080"
        />
      </div>
    </RequireAuth>
  );
}
