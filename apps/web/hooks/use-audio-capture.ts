"use client";

import { useCallback, useRef, useState } from "react";

export type MicStatus = "inactive" | "requesting" | "active" | "error";

interface UseAudioCaptureOptions {
  onAudioChunk: (chunk: ArrayBuffer) => void;
}

export function useAudioCapture({ onAudioChunk }: UseAudioCaptureOptions) {
  const [micStatus, setMicStatus] = useState<MicStatus>("inactive");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const onAudioChunkRef = useRef(onAudioChunk);
  onAudioChunkRef.current = onAudioChunk;

  const start = useCallback(async () => {
    setMicStatus("requesting");
    setErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      contextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Use ScriptProcessorNode for broad compatibility
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const float32 = event.inputBuffer.getChannelData(0);
        // Convert float32 to int16 PCM for Deepgram
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]!));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        onAudioChunkRef.current(int16.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setMicStatus("active");
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access was denied. Please allow microphone access in your browser settings."
          : "Failed to access microphone. Please check your device settings.";
      setErrorMessage(message);
      setMicStatus("error");
    }
  }, []);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    contextRef.current?.close();
    contextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setMicStatus("inactive");
  }, []);

  return { micStatus, errorMessage, start, stop };
}
