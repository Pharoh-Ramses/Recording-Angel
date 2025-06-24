"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  Users, 
  Volume2,
  Wifi,
  WifiOff
} from "lucide-react";

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
  const [transcriptText, setTranscriptText] = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState("Unknown Speaker");
  const [participantCount, setParticipantCount] = useState(1);
  
  // Audio-related state
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(false);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);

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
          echoCancellation: true,  // Reduces echo
          noiseSuppression: true,  // Reduces background noise
          autoGainControl: true,   // Automatically adjusts volume
        } 
      });
      
      setMediaStream(stream);
      
      // Step 2: Create AudioContext (the main audio processing interface)
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
      setIsMicrophoneEnabled(true);
      
      console.log("🎤 Microphone initialized successfully");
      
    } catch (error) {
      console.error("Microphone access failed:", error);
      setMicrophoneError(
        error instanceof Error 
          ? error.message 
          : "Failed to access microphone"
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

  const handleStartRecording = async () => {
    // Initialize microphone if not already done
    if (!isMicrophoneEnabled) {
      await initializeMicrophone();
    }
    
    if (isMicrophoneEnabled) {
      setIsRecording(true);
      setTranscriptText("🎤 Recording started... Audio will be transcribed here in real-time.");
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setTranscriptText(prev => prev + "\n\n⏹️ Recording stopped.");
  };

  // Cleanup function to stop microphone when component unmounts
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
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
            {participantCount} participant{participantCount !== 1 ? 's' : ''}
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
        <Card className="h-full p-6 overflow-y-auto border-0 shadow-none bg-white">
          <div className="space-y-4">
            {transcriptText ? (
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {transcriptText}
                {isRecording && (
                  <span className="inline-block w-2 h-5 bg-gray-400 ml-1 animate-pulse"></span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Mic className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg mb-2">Ready to record</p>
                  <p className="text-sm">Click "Start Recording" to begin transcription</p>
                  {microphoneError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm">
                        🚫 Microphone Error: {microphoneError}
                      </p>
                      <p className="text-red-500 text-xs mt-1">
                        Please check your microphone permissions and try again.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
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
              <Button 
                onClick={handleStopRecording}
                variant="outline"
                className="flex items-center gap-2 border-red-600 text-red-600 hover:bg-red-50"
              >
                <Square className="w-4 h-4" />
                Stop Recording
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (isMicrophoneEnabled && mediaStream) {
                  // Mute microphone
                  mediaStream.getAudioTracks().forEach(track => {
                    track.enabled = !track.enabled;
                  });
                }
              }}
              className={isMicrophoneEnabled ? "text-green-600" : "text-red-600"}
            >
              {isMicrophoneEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
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
