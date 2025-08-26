import type { Route } from "./+types/home";
import { AudioTranscription } from "../components/AudioTranscription";
import { useState } from "react";
import { RequireAuth } from "../components/ProtectedRoute";
import { useUser } from "@clerk/clerk-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Recording Angel - Live Transcription" },
    { name: "description", content: "Real-time audio transcription and translation" },
  ];
}

export default function Home() {
  const { user } = useUser();
  const [sessionId] = useState(() => `session-${Date.now()}`);

  return (
    <RequireAuth>
      <div className="bg-gray-100 min-h-screen">
        <AudioTranscription 
          sessionId={sessionId}
          userId={user?.id || 'unknown'}
          serverUrl="ws://localhost:8080"
        />
      </div>
    </RequireAuth>
  );
}
