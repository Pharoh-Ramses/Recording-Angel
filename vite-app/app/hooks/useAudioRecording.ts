import { useRef, useState, useCallback, useEffect } from 'react';

export interface AudioRecordingConfig {
  sampleRate?: number;
  channelCount?: 1;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  chunkSizeMs?: number; // milliseconds per chunk (100-450ms optimal for AssemblyAI)
}

export function useAudioRecording(config: AudioRecordingConfig = {}) {
  const {
    sampleRate = 16000,
    channelCount = 1,
    echoCancellation = true,
    noiseSuppression = true,
    chunkSizeMs = 200, // 200ms chunks for optimal transcription
  } = config;

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  
  const onAudioDataRef = useRef<((data: ArrayBuffer) => void) | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const silenceStreakRef = useRef<number>(0);

  const startRecording = useCallback(async (onAudioData: (data: ArrayBuffer) => void) => {
    try {
      setError(null);
      
      // Store callback and set recording state FIRST
      onAudioDataRef.current = onAudioData;
      setIsRecording(true);
      isRecordingRef.current = true;

      // Get user media with specific constraints for AssemblyAI
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount,
          echoCancellation,
          noiseSuppression,
          autoGainControl: true,
        }
      });

      mediaStreamRef.current = stream;

      // Create audio context with specified sample rate
      audioContextRef.current = new AudioContext({ sampleRate });
      
      // Resume audio context if suspended (required for user interaction)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Create source from media stream
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);

      // Calculate buffer size for desired chunk duration
      // ScriptProcessorNode buffer sizes must be power of 2
      const samplesPerChunk = Math.round((chunkSizeMs / 1000) * sampleRate);
      let bufferSize = 256; // minimum
      while (bufferSize < samplesPerChunk && bufferSize < 16384) {
        bufferSize *= 2;
      }

      console.log(`Creating ScriptProcessorNode with buffer size: ${bufferSize}`);

      // Create script processor for PCM16 conversion
      processorNodeRef.current = audioContextRef.current.createScriptProcessor(
        bufferSize,
        channelCount,
        channelCount
      );

      processorNodeRef.current.onaudioprocess = (event) => {
        console.log('onaudioprocess fired, isRecordingRef:', isRecordingRef.current, 'hasCallback:', !!onAudioDataRef.current);
        
        if (!isRecordingRef.current || !onAudioDataRef.current) return;

        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0); // Get mono channel

        // Check if we have actual audio data (RMS threshold)
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
          const s = inputData[i];
          sumSquares += s * s;
        }
        const rms = Math.sqrt(sumSquares / inputData.length);
        if (rms < 0.005) {
          // During silence, send an occasional zeroed frame so ASR can detect end-of-turn
          silenceStreakRef.current += 1;
          if (silenceStreakRef.current % 6 !== 0) {
            return; // drop most silent frames
          }
        } else {
          silenceStreakRef.current = 0;
        }

        // Convert Float32Array to PCM16 (Int16Array)
        const pcm16 = new Int16Array(inputData.length);
        if (rms < 0.005) {
          // zeroed silence frame
          // pcm16 already zero-initialized
        } else {
          for (let i = 0; i < inputData.length; i++) {
            // Clamp to [-1, 1] and convert to 16-bit integer
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = sample * 32767;
          }
        }

        // Send as ArrayBuffer
        console.log('Audio processed:', pcm16.buffer.byteLength, 'bytes (rms:', rms.toFixed(4), ')');
        onAudioDataRef.current(pcm16.buffer);
      };

      // Connect audio graph - CRITICAL: ScriptProcessorNode must be connected to destination to work
      sourceNodeRef.current.connect(processorNodeRef.current);
      processorNodeRef.current.connect(audioContextRef.current.destination);

      console.log(`Started recording: ${sampleRate}Hz, ${channelCount} channel(s), ${chunkSizeMs}ms chunks`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error starting recording:', error);
      cleanup();
    }
  }, [sampleRate, channelCount, echoCancellation, noiseSuppression, chunkSizeMs]);

  const stopRecording = useCallback(() => {
    console.log('Stopping recording...');
    setIsRecording(false);
    isRecordingRef.current = false;
    cleanup();
  }, []);

  const cleanup = useCallback(() => {
    // Stop all tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    // Disconnect and cleanup audio nodes
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Ensure recording flag is cleared
    isRecordingRef.current = false;
    onAudioDataRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    error,
    config: {
      sampleRate,
      channelCount,
      chunkSizeMs,
    }
  };
}
