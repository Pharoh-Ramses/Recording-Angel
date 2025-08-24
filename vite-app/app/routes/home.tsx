import type { Route } from "./+types/home";
import { AudioTranscription } from "../components/AudioTranscription";
import { useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Recording Angel - Live Transcription" },
    { name: "description", content: "Real-time audio transcription and translation" },
  ];
}

export default function Home() {
  // For demo purposes - in a real app, these would come from routing/auth
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);

  return (
    <div className="min-h-screen bg-gray-100">
      <AudioTranscription 
        sessionId={sessionId}
        userId={userId}
        serverUrl="ws://localhost:8080"
      />
    </div>
  );
}
