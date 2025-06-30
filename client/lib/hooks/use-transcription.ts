"use client";

import { useState, useCallback } from "react";

export interface TranscriptionChunk {
  id: string;
  text: string;
  verseNumber: number;
  timestamp: Date;
  speakerId: string;
}

export function useTranscription() {
  const [chunks, setChunks] = useState<TranscriptionChunk[]>([]);
  const [currentText, setCurrentText] = useState<string>("");
  const [nextVerseNumber, setNextVerseNumber] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const addChunk = useCallback(
    (text: string, speakerId: string) => {
      if (!text.trim()) return;

      const newChunk: TranscriptionChunk = {
        id: `chunk-${Date.now()}-${Math.random()}`,
        text: text.trim(),
        verseNumber: nextVerseNumber,
        timestamp: new Date(),
        speakerId,
      };

      setChunks((prev) => [...prev, newChunk]);
      setNextVerseNumber((prev) => prev + 1);
      setCurrentText(""); // Clear current text when chunk is finalized
    },
    [nextVerseNumber],
  );

  const updateCurrentText = useCallback(
    (text: string | ((prev: string) => string)) => {
      setCurrentText(text);
    },
    [],
  );

  const clearCurrentText = useCallback(() => {
    setCurrentText("");
  }, []);

  const reset = useCallback(() => {
    setChunks([]);
    setCurrentText("");
    setNextVerseNumber(1);
  }, []);

  const startRecording = useCallback(() => {
    reset();
  }, [reset]);

  const stopRecording = useCallback(
    (speakerId: string) => {
      // Finalize any remaining current text as a chunk
      if (currentText.trim()) {
        addChunk(currentText, speakerId);
      }
    },
    [currentText, addChunk],
  );

  const finalizeCurrentText = useCallback(
    (speakerId: string) => {
      if (currentText.trim()) {
        addChunk(currentText, speakerId);
      }
    },
    [currentText, addChunk],
  );

  const pauseRecording = useCallback(
    (speakerId: string) => {
      console.log("🔄 Pausing recording, currentText:", currentText);
      // Finalize current text as a verse when pausing
      if (currentText.trim()) {
        addChunk(currentText, speakerId);
      }
      setIsPaused(true);
    },
    [currentText, addChunk],
  );

  const resumeRecording = useCallback(() => {
    console.log("🔄 Resuming recording");
    setIsPaused(false);
  }, []);

  const endSession = useCallback(
    (speakerId: string) => {
      // Finalize any remaining text and reset everything
      if (currentText.trim()) {
        addChunk(currentText, speakerId);
      }
      // Don't reset here - let the parent component handle session end
    },
    [currentText, addChunk],
  );

  return {
    chunks,
    currentText,
    nextVerseNumber,
    isPaused,
    addChunk,
    updateCurrentText,
    clearCurrentText,
    reset,
    startRecording,
    stopRecording,
    finalizeCurrentText,
    pauseRecording,
    resumeRecording,
    endSession,
  };
}
