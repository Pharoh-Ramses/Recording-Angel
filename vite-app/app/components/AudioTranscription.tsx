import React, { useEffect, useRef, useState } from 'react';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { useWebSocketTranscription } from '../hooks/useWebSocketTranscription';

interface AudioTranscriptionProps {
  sessionId: string;
  userId: string;
  serverUrl?: string;
}

export function AudioTranscription({ 
  sessionId, 
  userId, 
  serverUrl = 'ws://localhost:8080' 
}: AudioTranscriptionProps) {
  const [userType, setUserType] = useState<'speaker' | 'reader'>('speaker');
  const [displayMode, setDisplayMode] = useState<'live' | 'paragraphs'>('live');

  const {
    startRecording,
    stopRecording,
    isRecording,
    error: recordingError,
    config
  } = useAudioRecording({
    sampleRate: 16000,
    chunkSizeMs: 200, // 200ms chunks for optimal AssemblyAI performance
  });

  const {
    verses,
    paragraphs,
    liveTranscript,
    bufferedTexts,
    connectionStatus,
    error: connectionError,
    sendAudio,
    connect,
    disconnect,
    isConnected,
  } = useWebSocketTranscription({
    sessionId,
    userId,
    serverUrl,
    sampleRate: config.sampleRate,
  });

  const handleStartRecording = async () => {
    if (!isConnected) {
      alert('WebSocket not connected. Please wait for connection.');
      return;
    }

    try {
      await startRecording(sendAudio);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const error = recordingError || connectionError;

  // Auto-scroll for live transcript and paragraphs
  const liveRef = useRef<HTMLDivElement | null>(null);
  const paraRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (liveRef.current && displayMode === 'live') {
      liveRef.current.scrollTop = liveRef.current.scrollHeight;
    }
  }, [liveTranscript, displayMode]);

  useEffect(() => {
    if (paraRef.current && displayMode === 'paragraphs') {
      paraRef.current.scrollTop = paraRef.current.scrollHeight;
    }
  }, [bufferedTexts, paragraphs, displayMode]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Top Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Live Audio Transcription</h1>
          <p className="text-sm text-gray-500">Session {sessionId} · User {userId}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            connectionStatus === 'connected'
              ? 'bg-green-100 text-green-800'
              : connectionStatus === 'connecting'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {connectionStatus}
          </span>
          {isConnected ? (
            <button
              onClick={disconnect}
              className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connect}
              className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="space-y-6">
          {/* Role */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Role</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => setUserType('speaker')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  userType === 'speaker'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Speaker
              </button>
              <button
                onClick={() => setUserType('reader')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  userType === 'reader'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Reader
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {userType === 'speaker' 
                ? 'Your microphone audio will stream to the session.'
                : 'You will see live text as the speaker talks.'}
            </p>
          </div>

          {/* Display Mode */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Display Mode</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => setDisplayMode('live')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  displayMode === 'live'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Live Stream
              </button>
              <button
                onClick={() => setDisplayMode('paragraphs')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  displayMode === 'paragraphs'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Paragraphs
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {displayMode === 'live' 
                ? 'Real-time transcription as it happens - perfect for fast readers.'
                : 'AI-organized paragraphs updated every 10 seconds.'}
            </p>
          </div>

          {/* Recording Controls (Speaker Only) */}
          {userType === 'speaker' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Recording</h2>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleStartRecording}
                  disabled={isRecording || !isConnected}
                  className={`px-5 py-2.5 rounded-md font-medium transition-colors ${
                    isRecording || !isConnected
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                  title={!isConnected ? 'Connect first to start streaming' : ''}
                >
                  {isRecording ? 'Recording…' : 'Start Recording'}
                </button>

                <button
                  onClick={handleStopRecording}
                  disabled={!isRecording}
                  className={`px-5 py-2.5 rounded-md font-medium transition-colors ${
                    !isRecording
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 text-white hover:bg-gray-800'
                  }`}
                >
                  Stop
                </button>

                {isRecording && (
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium">LIVE</span>
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs text-gray-600 space-y-1">
                <p><strong>Format:</strong> {config.sampleRate}Hz PCM16 · {config.channelCount}ch</p>
                <p><strong>Chunk:</strong> {config.chunkSizeMs}ms segments</p>
              </div>
            </div>
          )}

          {/* Help */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-700">
              Tip: For best accuracy, use a quiet environment and keep the mic close.
            </p>
          </div>
        </div>

        {/* Right: Transcripts */}
        <div className="lg:col-span-2 space-y-6">
          {displayMode === 'live' ? (
            /* Live Stream Mode */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">Live Transcription</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500">Real-time</span>
                </div>
              </div>
              <div ref={liveRef} className="bg-green-50/60 rounded-md p-6 min-h-96 max-h-96 overflow-y-auto">
                {liveTranscript ? (
                  <div className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap">
                    {liveTranscript}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 text-sm py-12">
                    {userType === 'speaker' ? 'Start recording to see live transcription…' : 'Waiting for speaker to begin…'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Paragraph Mode */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">AI-Organized Paragraphs</h2>
                <span className="text-xs text-gray-500">Updated every 10 seconds</span>
              </div>
              <div ref={paraRef} className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {bufferedTexts.map((buffered) => (
                  <div key={`${buffered.session_id}-${buffered.paragraph_number}`} className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-blue-700">Paragraph {buffered.paragraph_number}</span>
                      <span className="text-[11px] text-gray-500">{new Date(buffered.completed_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-sm text-gray-800 leading-relaxed">
                      {buffered.buffered_text}
                    </div>
                  </div>
                ))}
                
                {/* Legacy paragraph support */}
                {paragraphs.map((paragraph) => {
                  const isRefined = paragraph.verses.length === 1 && paragraph.verses[0]?.speaker_id === 'ai';
                  return (
                  <div key={`legacy-${paragraph.session_id}-${paragraph.paragraph_number}`} className={`${isRefined ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'} rounded-md p-3`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-700">{isRefined ? 'Refined Paragraph' : 'Legacy Paragraph'}</span>
                      <span className="text-[11px] text-gray-500">{new Date(paragraph.completed_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="space-y-0.5">
                      {paragraph.verses.map((verse, idx) => (
                        <div key={`${idx}-${verse.timestamp}`} className="text-sm text-gray-800">
                          <span>{verse.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );})}
                
                {bufferedTexts.length === 0 && paragraphs.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-12">
                    {userType === 'speaker' ? 'Start recording and speak for at least 10 seconds to see organized paragraphs…' : 'Waiting for content to be organized…'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legacy Current Paragraph (for verse-based display) - only show if we have verses but no new data */}
          {verses.length > 0 && bufferedTexts.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">Current Paragraph (Legacy)</h2>
                <span className="text-xs text-gray-500">Auto-updating</span>
              </div>
              <div className="bg-blue-50/60 rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                {verses.map((verse) => (
                  <div key={`${verse.timestamp}-${verse.speaker_id}`} className="text-gray-800">
                    <span>{verse.text}</span>
                    <span className="ml-2 text-[11px] text-gray-500">
                      {new Date(verse.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
