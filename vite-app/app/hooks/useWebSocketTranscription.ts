import { useEffect, useRef, useState, useCallback } from 'react';
import { config } from '../config';

export interface Verse {
  verse_number: number;
  text: string;
  timestamp: string;
  speaker_id: string;
}

export interface Paragraph {
  session_id: string;
  paragraph_number: number;
  verses: Verse[];
  completed_at: string;
}

export interface RefinedParagraph {
  session_id: string;
  paragraph_number: number;
  refined_text: string;
  completed_at: string;
}

export interface LiveTranscript {
  text: string;
  text_translated?: string;
  target_language?: string;
  source_language_detected?: string;
  translation_status?: 'success' | 'failed' | 'disabled';
  timestamp: string;
  session_id: string;
  is_final?: boolean;
}

export interface BufferedText {
  session_id: string;
  paragraph_number: number;
  buffered_text: string;
  completed_at: string;
}

export interface TranscriptionConnection {
  sessionId: string;
  userId: string;
  serverUrl?: string;
  sampleRate?: number;
  encoding?: string;
  targetLanguage?: string;
}

export function useWebSocketTranscription({
  sessionId,
  userId,
  serverUrl = config.wsUrl,
  sampleRate = 16000,
  encoding = 'pcm_s16le',
  targetLanguage = 'disabled'
}: TranscriptionConnection) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [liveTranscriptData, setLiveTranscriptData] = useState<LiveTranscript | null>(null);
  const [bufferedTexts, setBufferedTexts] = useState<BufferedText[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Persistent text accumulation
  const [nativeTranscriptHistory, setNativeTranscriptHistory] = useState<string[]>([]);
  const [translatedTranscriptHistory, setTranslatedTranscriptHistory] = useState<string[]>([]);
  const lastNativeTextRef = useRef<string>('');
  const lastTranslatedTextRef = useRef<string>('');

  // Debug and performance tracking
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    connectionTime: 0,
    messagesReceived: 0,
    lastMessageTime: 0,
    averageLatency: 0
  });
  const connectionStartTime = useRef<number>(0);
  const messageLatencies = useRef<number[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const addDebugMessage = useCallback((message: string) => {
    setDebugMessages(prev => [...prev.slice(-99), message]); // Keep last 100 messages
  }, []);

  // Simple text similarity calculation to detect near-duplicate translations
  const calculateSimilarity = useCallback((text1: string, text2: string): number => {
    if (text1 === text2) return 1.0;

    const words1 = text1.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const words2 = text2.toLowerCase().split(/\s+/).filter(word => word.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    const commonWords = words1.filter(word => words2.includes(word));
    const maxWords = Math.max(words1.length, words2.length);

    return commonWords.length / maxWords;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionStatus('connecting');
    setError(null);
    connectionStartTime.current = Date.now();

    // Simplified for testing - no API token required
    const wsUrl = `${serverUrl}/ws?session_id=${encodeURIComponent(sessionId)}&user_id=${encodeURIComponent(userId)}&sample_rate=${sampleRate}&encoding=${encoding}&target_language=${encodeURIComponent(targetLanguage)}`;

    addDebugMessage(`🔌 Connecting to: ${wsUrl}`);

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        const connectionTime = Date.now() - connectionStartTime.current;
        addDebugMessage(`✅ WebSocket connected in ${connectionTime}ms`);
        setConnectionStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
        setPerformanceMetrics(prev => ({ ...prev, connectionTime }));
      };

      wsRef.current.onmessage = (event) => {
        const messageTime = Date.now();
        try {
          const message = JSON.parse(event.data);
          const messageSize = event.data.length;

          // Update performance metrics
          setPerformanceMetrics(prev => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1,
            lastMessageTime: messageTime
          }));

          addDebugMessage(`📨 ${message.type} (${messageSize} bytes)`);

          switch (message.type) {
            case 'live_transcript': {
              const liveData: LiveTranscript = message.data;
              setLiveTranscript(liveData.text);
              setLiveTranscriptData(liveData);

              // Accumulate native transcript if it's new content
              if (liveData.text && liveData.text !== lastNativeTextRef.current) {
                setNativeTranscriptHistory(prev => {
                  const newHistory = [...prev];
                  if (newHistory.length === 0 || !newHistory[newHistory.length - 1].includes(liveData.text)) {
                    newHistory.push(liveData.text);
                  } else {
                    // Update the last entry if it's continuing
                    newHistory[newHistory.length - 1] = liveData.text;
                  }
                  return newHistory.slice(-50); // Keep last 50 entries
                });
                lastNativeTextRef.current = liveData.text;
              }

              addDebugMessage(`📝 Live transcript: "${liveData.text.substring(0, 50)}${liveData.text.length > 50 ? '...' : ''}"`);
              break;
            }

            case 'translation_update': {
              // Update the live transcript data with translation
              const translationData = message.data;
              setLiveTranscriptData(prev => prev ? {
                ...prev,
                text_translated: translationData.text_translated,
                target_language: translationData.target_language,
                translation_status: translationData.translation_status
              } : null);

              // Only add to history if this is a final translation and it's not a duplicate
              if (translationData.is_final && translationData.text_translated) {
                const translatedText = translationData.text_translated.trim();

                // Check if this translation is already in history (avoid duplicates)
                setTranslatedTranscriptHistory(prev => {
                  // Skip if this exact translation already exists
                  if (prev.includes(translatedText)) {
                    addDebugMessage(`🚫 Duplicate translation skipped: "${translatedText.substring(0, 30)}..."`);
                    return prev;
                  }

                  // Skip if this is very similar to the last translation (basic similarity check)
                  if (prev.length > 0) {
                    const lastTranslation = prev[prev.length - 1];
                    const similarity = calculateSimilarity(lastTranslation, translatedText);
                    if (similarity > 0.6) { // 60% similarity threshold (matches backend)
                      addDebugMessage(`🚫 Similar translation skipped (${Math.round(similarity * 100)}% similar): "${translatedText.substring(0, 30)}..."`);
                      return prev;
                    }
                  }

                  const newHistory = [...prev, translatedText];
                  return newHistory.slice(-50); // Keep last 50 entries
                });

                lastTranslatedTextRef.current = translatedText;
              }

              addDebugMessage(`🌍 Translation ${translationData.is_final ? '(FINAL)' : '(INTERMEDIATE)'}: "${translationData.text_translated?.substring(0, 50)}${translationData.text_translated?.length > 50 ? '...' : ''}"`);
              break;
            }

            case 'text_buffer_complete': {
              const bufferedData: BufferedText = message.data;
              setBufferedTexts(prev => [...prev, bufferedData]);
              addDebugMessage(`📄 Buffered text: ${bufferedData.paragraph_number}`);
              break;
            }

            case 'paragraph_refined': {
              const refined: RefinedParagraph = message.data;
              // Update the corresponding buffered text with refined content
              setBufferedTexts(prev => prev.map(bt => {
                if (bt.paragraph_number === refined.paragraph_number) {
                  return {
                    ...bt,
                    buffered_text: refined.refined_text,
                    completed_at: refined.completed_at
                  };
                }
                return bt;
              }));
              addDebugMessage(`✨ Paragraph refined: ${refined.paragraph_number}`);
              break;
            }

            // Legacy support for existing verse/paragraph system
            case 'verse':
              setVerses(prev => [...prev, message.data]);
              addDebugMessage(`📖 Verse: ${message.data.text?.substring(0, 30)}...`);
              break;

            case 'paragraph_complete':
              setParagraphs(prev => [...prev, message.data]);
              setVerses([]); // Clear verses for new paragraph
              addDebugMessage(`📑 Paragraph complete: ${message.data.paragraph_number}`);
              break;

            case 'error':
              console.error('Server error:', message.message);
              setError(message.message);
              addDebugMessage(`❌ Server error: ${message.message}`);
              break;

            default:
              addDebugMessage(`❓ Unknown message type: ${message.type}`);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setError('Failed to parse server message');
          addDebugMessage(`❌ Parse error: ${error}`);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setError('WebSocket connection error');
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setConnectionStatus('error');
      setError('Failed to create WebSocket connection');
    }
  }, [sessionId, userId, serverUrl, sampleRate, encoding, targetLanguage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setConnectionStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  const sendAudio = useCallback((audioData: ArrayBuffer) => {
    console.log('sendAudio called with', audioData.byteLength, 'bytes');
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioData);
      console.log('Audio data sent to WebSocket');
    } else {
      console.warn('WebSocket not connected, cannot send audio data');
    }
  }, []);

  // Auto-connect on mount and when connection params change
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    verses,
    paragraphs,
    liveTranscript,
    liveTranscriptData,
    bufferedTexts,
    connectionStatus,
    error,
    sendAudio,
    connect,
    disconnect,
    isConnected: connectionStatus === 'connected',
    debugMessages,
    performanceMetrics,
    nativeTranscriptHistory,
    translatedTranscriptHistory,
  };
}
