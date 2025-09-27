import type { Route } from "./+types/home";
import { AudioTranscription } from "../components/AudioTranscription";
import { useState } from "react";
import { config } from "../config";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Recording Angel - Live Transcription (Testing)" },
    { name: "description", content: "Real-time audio transcription and translation - Testing Mode" },
  ];
}

export default function Home() {
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [userId] = useState(() => `user-${Date.now()}`);

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="bg-yellow-100 border-b border-yellow-200 p-3">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm text-yellow-800">
            🔧 <strong>Testing Mode:</strong> Authentication disabled for fast testing.
            Using simplified API without session management.
          </p>
        </div>
      </div>
      <AudioTranscription
        sessionId={sessionId}
        userId={userId}
        serverUrl={config.wsUrl}
      />
    </div>
  );
}
