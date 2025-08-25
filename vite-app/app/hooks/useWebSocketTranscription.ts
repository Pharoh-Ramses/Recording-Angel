import { useEffect, useRef, useState, useCallback } from 'react';

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
}

export function useWebSocketTranscription({
  sessionId,
  userId,
  serverUrl = 'ws://localhost:8080',
  sampleRate = 16000,
  encoding = 'pcm_s16le'
}: TranscriptionConnection) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [bufferedTexts, setBufferedTexts] = useState<BufferedText[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionStatus('connecting');
    setError(null);

    const wsUrl = `${serverUrl}/ws?session_id=${encodeURIComponent(sessionId)}&user_id=${encodeURIComponent(userId)}&sample_rate=${sampleRate}&encoding=${encoding}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received message:', message);

          switch (message.type) {
            case 'live_transcript': {
              const liveData: LiveTranscript = message.data;
              setLiveTranscript(liveData.text);
              break;
            }
            
            case 'text_buffer_complete': {
              const bufferedData: BufferedText = message.data;
              setBufferedTexts(prev => [...prev, bufferedData]);
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
              break;
            }
            
            // Legacy support for existing verse/paragraph system
            case 'verse':
              setVerses(prev => [...prev, message.data]);
              break;
              
            case 'paragraph_complete':
              setParagraphs(prev => [...prev, message.data]);
              setVerses([]); // Clear verses for new paragraph
              break;
              
            case 'error':
              console.error('Server error:', message.message);
              setError(message.message);
              break;
              
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setError('Failed to parse server message');
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
  }, [sessionId, userId, serverUrl, sampleRate, encoding]);

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
    bufferedTexts,
    connectionStatus,
    error,
    sendAudio,
    connect,
    disconnect,
    isConnected: connectionStatus === 'connected',
  };
}
