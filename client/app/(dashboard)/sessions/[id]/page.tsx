"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Users,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";
import TranscriptionDisplay from "@/components/sessions/transcription-display";
import { useTranscription } from "@/lib/hooks/use-transcription";

interface SessionData {
  id: string;
  code: string;
  host_id: string;
  createdAt: string;
  endedAt?: string;
}

export default function SessionRoomPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState("Unknown Speaker");
  const [participantCount, setParticipantCount] = useState(1);

  // Use the transcription hook for verse numbering
  const {
    chunks,
    currentText,
    isPaused,
    updateCurrentText,
    startRecording: startTranscription,
    pauseRecording,
    resumeRecording,
    endSession,
  } = useTranscription();

  // Audio-related state
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(false);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);

  // Transcription-related state
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  useEffect(() => {
    // Fetch session data
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch (error) {
        console.error("Failed to fetch session:", error);
      }
    };

    fetchSession();
  }, [sessionId]);

  // Function to request microphone access and set up audio analysis
  const initializeMicrophone = async () => {
    try {
      setMicrophoneError(null);

      // Step 1: Request microphone permission
      // This prompts the user for microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true, // Reduces echo
          noiseSuppression: true, // Reduces background noise
          autoGainControl: true, // Automatically adjusts volume
        },
      });

      setMediaStream(stream);

      // Step 2: Create AudioContext (the main audio processing interface)
      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      setAudioContext(audioCtx);

      // Step 3: Create audio source from microphone stream
      const source = audioCtx.createMediaStreamSource(stream);

      // Step 4: Create AnalyserNode to analyze audio levels
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256; // Size of frequency analysis (smaller = faster)
      analyserNode.smoothingTimeConstant = 0.8; // Smooths out rapid changes

      // Step 5: Connect source to analyser
      source.connect(analyserNode);

      setAnalyser(analyserNode);

      // Step 6: Set up MediaRecorder for audio chunking
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/mp4";
      }

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data]);
        }
      };

      setMediaRecorder(recorder);
      setIsMicrophoneEnabled(true);

      console.log("🎤 Microphone and recorder initialized successfully");
    } catch (error) {
      console.error("Microphone access failed:", error);
      setMicrophoneError(
        error instanceof Error ? error.message : "Failed to access microphone",
      );
    }
  };

  // Real-time audio level analysis
  useEffect(() => {
    if (isRecording && analyser && isMicrophoneEnabled) {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        // Get frequency data from the analyser
        analyser.getByteFrequencyData(dataArray);

        // Calculate average amplitude across all frequencies
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Convert to percentage (0-100) and apply some scaling
        const level = Math.min((average / 128) * 100, 100);
        setAudioLevel(level);
      };

      // Update audio levels 60 times per second for smooth animation
      const intervalId = setInterval(updateAudioLevel, 16);

      return () => clearInterval(intervalId);
    } else {
      setAudioLevel(0);
    }
  }, [isRecording, analyser, isMicrophoneEnabled]);

  // Send audio chunk to transcription API
  const transcribeAudioChunk = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      formData.append("sessionId", sessionId);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { text } = await response.json();
        console.log("📝 Received transcription:", text);
        if (text.trim()) {
          // Update current text for real-time display by appending new text
          updateCurrentText((prev) => {
            const newText = prev + (prev ? " " : "") + text;
            console.log("🔄 Updating currentText:", newText);
            return newText;
          });
        }
      } else {
        console.error("❌ Transcription API error:", response.status);
      }
    } catch (error) {
      console.error("Transcription failed:", error);
    }
  };

  // Process audio chunks for transcription
  useEffect(() => {
    if (audioChunks.length > 0 && isRecording && mediaRecorder) {
      // Process chunks every 3 seconds for real-time transcription
      // Continue processing even when paused to maintain audio flow
      const timer = setTimeout(() => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        console.log(
          "🎵 Processing audio chunk:",
          audioBlob.size,
          "bytes, isPaused:",
          isPaused,
        );

        if (!isPaused) {
          // Only transcribe when not paused
          transcribeAudioChunk(audioBlob);
        } else {
          console.log("⏸️ Skipping transcription while paused");
        }
        setAudioChunks([]); // Clear processed chunks regardless
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [audioChunks, isRecording, mediaRecorder, isPaused]);

  const handleStartRecording = async () => {
    // Initialize microphone if not already done
    if (!isMicrophoneEnabled) {
      await initializeMicrophone();
    }

    if (isMicrophoneEnabled && mediaRecorder) {
      setIsRecording(true);
      startTranscription(); // Reset transcription state

      // Start recording audio chunks
      mediaRecorder.start(1000); // Record in 1-second chunks

      console.log("🔴 Started recording for transcription");
    }
  };

  const handlePauseRecording = () => {
    // Don't actually pause MediaRecorder, just finalize current verse
    // Process any remaining audio chunks and finalize current verse
    if (audioChunks.length > 0 && mediaRecorder) {
      const mimeType = mediaRecorder.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      transcribeAudioChunk(audioBlob);
      setAudioChunks([]);
    }

    pauseRecording(session?.host_id || "unknown");
    console.log("⏸️ Paused recording (verse finalized)");
  };

  const handleResumeRecording = () => {
    // Just update state, MediaRecorder keeps running
    resumeRecording();
    console.log("▶️ Resumed recording (new verse started)");
  };

  const handleEndSession = () => {
    setIsRecording(false);

    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }

    // Process any remaining audio chunks
    if (audioChunks.length > 0 && mediaRecorder) {
      const mimeType = mediaRecorder.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      transcribeAudioChunk(audioBlob);
      setAudioChunks([]);
    }

    endSession(session?.host_id || "unknown");
    console.log("🛑 Ended session");
  };

  // Cleanup function to stop microphone when component unmounts
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [mediaStream, audioContext]);

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent rounded-2xl overflow-hidden">
      {/* Header Row - Speaker Information */}
      <div className="border-b border-amber-200/90 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="font-medium text-lg">{currentSpeaker}</span>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {participantCount} participant{participantCount !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                Disconnected
              </>
            )}
          </div>
          <Badge variant="secondary">
            Session: {session.code.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Main Content Area - Transcript Stream */}
      <div className="flex-1 overflow-hidden p-6">
        <TranscriptionDisplay
          chunks={chunks}
          currentText={currentText}
          isRecording={isRecording}
          isPaused={isPaused}
          microphoneError={microphoneError}
        />
      </div>

      {/* Footer Row - Session Controls & Audio Indicator */}
      <div className="border-t bg-transparent px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Session Controls */}
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <Button
                onClick={handleStartRecording}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <Play className="w-4 h-4" />
                Start Recording
              </Button>
            ) : (
              <>
                {!isPaused ? (
                  <Button
                    onClick={handlePauseRecording}
                    variant="outline"
                    className="flex items-center gap-2 border-yellow-600 text-yellow-600 hover:bg-yellow-50"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    onClick={handleResumeRecording}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </Button>
                )}

                <Button
                  onClick={handleEndSession}
                  variant="outline"
                  className="flex items-center gap-2 border-red-600 text-red-600 hover:bg-red-50"
                >
                  <Square className="w-4 h-4" />
                  End Session
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isMicrophoneEnabled && mediaStream) {
                  // Mute microphone
                  mediaStream.getAudioTracks().forEach((track) => {
                    track.enabled = !track.enabled;
                  });
                }
              }}
              className={
                isMicrophoneEnabled ? "text-green-600" : "text-red-600"
              }
            >
              {isMicrophoneEnabled ? (
                <Mic className="w-4 h-4" />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Audio Level Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Volume2 className="w-4 h-4" />
              Audio Level
            </div>
            <div className="flex items-center gap-1">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-6 rounded-full transition-colors duration-75 ${
                    audioLevel > (i + 1) * 10
                      ? i < 6
                        ? "bg-green-500"
                        : i < 8
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            {isRecording && (
              <Badge variant="destructive" className="animate-pulse">
                REC
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
