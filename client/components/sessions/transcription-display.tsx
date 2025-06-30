"use client";

import { Card } from "@/components/ui/card";
import { Mic } from "lucide-react";

interface TranscriptionChunk {
  id: string;
  text: string;
  verseNumber: number;
  timestamp: Date;
  speakerId: string;
}

interface TranscriptionDisplayProps {
  chunks: TranscriptionChunk[];
  isRecording: boolean;
  isPaused?: boolean;
  microphoneError?: string | null;
  currentText?: string;
}

export default function TranscriptionDisplay({
  chunks,
  isRecording,
  isPaused = false,
  microphoneError,
  currentText,
}: TranscriptionDisplayProps) {
  const hasContent = chunks.length > 0 || currentText;

  return (
    <Card className="h-full p-6 overflow-y-auto border-0 shadow-none bg-white">
      <div className="space-y-4">
        {hasContent ? (
          <div className="font-palatino text-lg leading-relaxed text-gray-800">
            {/* Render completed chunks */}
            {chunks.map((chunk) => (
              <span key={chunk.id} className="inline">
                <sup className="text-sm font-bold text-amber-700 mr-1">
                  {chunk.verseNumber}
                </sup>
                <span className="mr-2">{chunk.text}</span>
              </span>
            ))}

            {/* Render current text being transcribed */}
            {currentText && (
              <span className="inline">
                <sup className="text-sm font-bold text-amber-700 mr-1">
                  {chunks.length + 1}
                </sup>
                <span className="mr-2">{currentText}</span>
                {isRecording && !isPaused && (
                  <span className="inline-block w-2 h-5 bg-gray-400 ml-1 animate-pulse"></span>
                )}
                {isPaused && (
                  <span className="inline-block w-2 h-5 bg-yellow-500 ml-1"></span>
                )}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Mic className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2 font-palatino">Ready to record</p>
              <p className="text-sm font-palatino">
                Click "Start Recording" to begin transcription
              </p>
              {microphoneError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm font-palatino">
                    🚫 Microphone Error: {microphoneError}
                  </p>
                  <p className="text-red-500 text-xs mt-1 font-palatino">
                    Please check your microphone permissions and try again.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
