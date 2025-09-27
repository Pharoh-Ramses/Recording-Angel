import React, { useEffect, useRef, useState } from 'react';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { useWebSocketTranscription } from '../hooks/useWebSocketTranscription';
import { DEFAULT_LANGUAGE_CODE, getLanguageName } from '../constants/languages';
import { LanguageSelect } from './LanguageSelect';

// Add fadeIn animation keyframes
const fadeInKeyframes = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .loading-bubble-fade-in {
    animation: fadeIn 0.3s ease-in-out;
    opacity: 0;
    animation-fill-mode: forwards;
  }
`;

// Inject keyframes into document head
if (typeof document !== 'undefined' && !document.getElementById('loading-bubble-keyframes')) {
  const style = document.createElement('style');
  style.id = 'loading-bubble-keyframes';
  style.textContent = fadeInKeyframes;
  document.head.appendChild(style);
}

// Loading Bubble Component
const LoadingBubble: React.FC<{ message?: string; variant?: 'translation' | 'listening' }> = ({
  message = "Traduciendo...",
  variant = 'translation'
}) => {
  const bgColor = variant === 'translation' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
  const dotColor = variant === 'translation' ? 'bg-blue-400' : 'bg-green-400';
  const textColor = variant === 'translation' ? 'text-blue-600' : 'text-green-600';
  const positioning = variant === 'translation' ? 'ml-auto mr-4 mb-2' : 'mx-auto mb-4';

  return (
    <div className={`flex items-center space-x-2 ${bgColor} border rounded-2xl px-4 py-3 max-w-xs ${positioning} shadow-sm loading-bubble-fade-in`}>
      <div className="flex space-x-1">
        <div className={`w-2 h-2 ${dotColor} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
        <div className={`w-2 h-2 ${dotColor} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
        <div className={`w-2 h-2 ${dotColor} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
      </div>
      <span className={`${textColor} text-sm font-medium`}>{message}</span>
    </div>
  );
};

interface AudioTranscriptionProps {
  sessionId: string;
  userId: string;
  serverUrl?: string;
}

export function AudioTranscription({
  sessionId,
  userId,
  serverUrl = 'ws://localhost:8000'
}: AudioTranscriptionProps) {
  const [userType, setUserType] = useState<'speaker' | 'reader'>('speaker');
  const [displayMode, setDisplayMode] = useState<'live' | 'paragraphs'>('live');
  const [targetLanguage, setTargetLanguage] = useState<string>('es'); // Default to Spanish for testing
  const [showTranslation, setShowTranslation] = useState<boolean>(true); // Show translation by default
  const [testMode, setTestMode] = useState<'microphone' | 'sample'>('microphone');
  const [showDebug, setShowDebug] = useState<boolean>(false);

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
    liveTranscriptData,
    bufferedTexts,
    connectionStatus,
    error: connectionError,
    sendAudio,
    connect,
    disconnect,
    isConnected,
    debugMessages,
    performanceMetrics,
    nativeTranscriptHistory,
    translatedTranscriptHistory,
  } = useWebSocketTranscription({
    sessionId,
    userId,
    serverUrl,
    sampleRate: config.sampleRate,
    targetLanguage,
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

  // Auto-scroll refs for both columns
  const nativeRef = useRef<HTMLDivElement | null>(null);
  const translationRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll native transcription
  useEffect(() => {
    if (nativeRef.current) {
      nativeRef.current.scrollTop = nativeRef.current.scrollHeight;
    }
  }, [liveTranscript]);

  // Auto-scroll translation
  useEffect(() => {
    if (translationRef.current) {
      translationRef.current.scrollTop = translationRef.current.scrollHeight;
    }
  }, [translatedTranscriptHistory]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Testing Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🎙️ Recording Angel - Testing Mode</h1>
            <p className="text-blue-100 mt-1">
              Session: <code className="bg-blue-700 px-2 py-1 rounded text-sm">{sessionId}</code>
              {targetLanguage !== 'disabled' && (
                <span className="ml-3">🌍 Translation: {getLanguageName(targetLanguage)}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
              }`}></div>
              <span className="text-sm font-medium capitalize">{connectionStatus}</span>
            </div>

            {/* Recording Status */}
            {isRecording && (
              <div className="flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">RECORDING</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Test Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setTargetLanguage('es')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              targetLanguage === 'es' ? 'bg-white text-blue-600' : 'bg-blue-500 hover:bg-blue-400 text-white'
            }`}
          >
            🇪🇸 Spanish
          </button>
          <button
            onClick={() => setTargetLanguage('fr')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              targetLanguage === 'fr' ? 'bg-white text-blue-600' : 'bg-blue-500 hover:bg-blue-400 text-white'
            }`}
          >
            🇫🇷 French
          </button>
          <button
            onClick={() => setTargetLanguage('de')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              targetLanguage === 'de' ? 'bg-white text-blue-600' : 'bg-blue-500 hover:bg-blue-400 text-white'
            }`}
          >
            🇩🇪 German
          </button>
          <button
            onClick={() => setTargetLanguage('disabled')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              targetLanguage === 'disabled' ? 'bg-white text-blue-600' : 'bg-blue-500 hover:bg-blue-400 text-white'
            }`}
          >
            🚫 No Translation
          </button>
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Quick Controls */}
        <div className="space-y-4">
          {/* Recording Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🎙️ Recording
            </h2>

            <div className="space-y-3">
              <button
                onClick={handleStartRecording}
                disabled={isRecording || !isConnected}
                className={`w-full px-6 py-3 rounded-lg font-semibold text-lg transition-all ${
                  isRecording || !isConnected
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700 hover:scale-105 shadow-lg'
                }`}
                title={!isConnected ? 'Connect to WebSocket first' : ''}
              >
                {isRecording ? '🔴 Recording…' : '🎤 Start Recording'}
              </button>

              <button
                onClick={handleStopRecording}
                disabled={!isRecording}
                className={`w-full px-6 py-3 rounded-lg font-semibold text-lg transition-all ${
                  !isRecording
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 text-white hover:bg-gray-800 hover:scale-105 shadow-lg'
                }`}
              >
                ⏹️ Stop Recording
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-600 space-y-1">
              <p><strong>Format:</strong> {config.sampleRate}Hz PCM16</p>
              <p><strong>Chunk:</strong> {config.chunkSizeMs}ms segments</p>
              <p><strong>Status:</strong> {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
            </div>
          </div>

          {/* Connection Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Connection</h3>
            <div className="flex gap-2">
              {isConnected ? (
                <button
                  onClick={disconnect}
                  className="flex-1 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={connect}
                  className="flex-1 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          </div>

          {/* Sample Audio Test */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-purple-900 mb-3">🎵 Sample Audio Test</h3>
            <p className="text-xs text-purple-800 mb-3">
              Test transcription without microphone - plays sample audio
            </p>
            <button
              onClick={() => {
                // Generate sample audio data (sine wave)
                const sampleRate = 16000;
                const duration = 3; // 3 seconds
                const frequency = 440; // A4 note
                const samples = sampleRate * duration;
                const audioData = new Int16Array(samples);

                for (let i = 0; i < samples; i++) {
                  const t = i / sampleRate;
                  const sample = Math.sin(2 * Math.PI * frequency * t) * 0.3; // 30% volume
                  audioData[i] = sample * 32767;
                }

                // Send as ArrayBuffer
                if (isConnected) {
                  sendAudio(audioData.buffer);
                  console.log('Sent sample audio data');
                } else {
                  alert('Please connect to WebSocket first');
                }
              }}
              disabled={!isConnected}
              className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                !isConnected
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105'
              }`}
            >
              🎵 Play Sample Audio
            </button>
          </div>

          {/* Test Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">🧪 Testing Tips</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Speak clearly and at normal pace</li>
              <li>• Use a quiet environment</li>
              <li>• Keep microphone close to your mouth</li>
              <li>• Try different languages above</li>
              <li>• Use sample audio for quick testing</li>
            </ul>
          </div>
        </div>

        {/* Right: Transcripts */}
        <div className="lg:col-span-3 space-y-6">
          {/* Status Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                📝 Live Transcription
                {isRecording && <span className="text-red-500 animate-pulse">●</span>}
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-gray-600 capitalize">{connectionStatus}</span>
                </div>
                {targetLanguage !== 'disabled' && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    🌍 {getLanguageName(targetLanguage)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Native Language Transcription */}
            <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    🇺🇸 Native Transcription
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Fast</span>
                  </h3>
                  <p className="text-sm text-gray-600">Real-time transcription with minimal latency</p>
                </div>
                {nativeTranscriptHistory.length > 0 && (
                  <button
                    onClick={() => {
                      // This would need to be implemented in the hook
                      // For now, we'll just show the button
                    }}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                    title="Clear transcription history"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div ref={nativeRef} className="p-4 min-h-96 max-h-96 overflow-y-auto">
                {liveTranscript ? (
                  <div className="space-y-3">
                    <div className="text-gray-900 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                      {liveTranscript}
                    </div>
                    {liveTranscriptData?.source_language_detected && (
                      <div className="text-xs text-gray-500 border-t pt-2 mt-3">
                        Detected: {getLanguageName(liveTranscriptData.source_language_detected)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-16">
                    {isRecording ? (
                      <LoadingBubble message="Escuchando..." variant="listening" />
                    ) : isConnected ? (
                      <div>
                        <div className="text-4xl mb-4">🎙️</div>
                        <p className="text-gray-600">Waiting for speech...</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-4">🔌</div>
                        <p className="text-gray-600">Connect to start</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Translated Text */}
            <div className="bg-white rounded-lg shadow-lg border-2 border-blue-200">
              <div className="p-4 border-b border-blue-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                    {targetLanguage === 'es' ? '🇪🇸' : targetLanguage === 'fr' ? '🇫🇷' : targetLanguage === 'de' ? '🇩🇪' : '🌍'}
                    Translation
                    {targetLanguage !== 'disabled' && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {getLanguageName(targetLanguage)}
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {targetLanguage === 'disabled'
                      ? 'Translation disabled'
                      : 'AI-powered translation with context awareness'
                    }
                  </p>
                </div>
                {translatedTranscriptHistory.length > 0 && (
                  <button
                    onClick={() => {
                      // This would need to be implemented in the hook
                      // For now, we'll just show the button
                    }}
                    className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                    title="Clear translation history"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div ref={translationRef} className="p-4 min-h-96 max-h-96 overflow-y-auto">
                {targetLanguage === 'disabled' ? (
                  <div className="text-center text-gray-500 py-16">
                    <div className="text-4xl mb-4">🌍</div>
                    <p className="text-gray-600">Translation disabled</p>
                    <p className="text-sm text-gray-500 mt-2">Select a language above to enable</p>
                  </div>
                ) : liveTranscriptData?.text_translated || translatedTranscriptHistory.length > 0 || liveTranscriptData?.translation_status === 'translating' ? (
                  <div className="space-y-3">
                    {/* Show translation loading bubble when translating */}
                    {liveTranscriptData?.translation_status === 'translating' && !liveTranscriptData?.text_translated && (
                      <LoadingBubble />
                    )}

                    {/* Show all translations as individual bubbles */}
                    {translatedTranscriptHistory.map((text, index) => {
                      const isMostRecent = index === translatedTranscriptHistory.length - 1;
                      return (
                        <div
                          key={index}
                          className={`flex items-center space-x-2 rounded-2xl px-4 py-3 shadow-sm border ml-auto mr-4 mb-2 max-w-lg ${
                            isMostRecent
                              ? 'bg-blue-100 border-blue-300 text-blue-900'
                              : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          <span className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${
                            isMostRecent ? 'text-blue-900' : 'text-gray-700'
                          }`}>
                            {text}
                          </span>
                        </div>
                      );
                    })}

                    {/* Show current live translation as a bubble */}
                    {liveTranscriptData?.text_translated && (
                      <div className="flex items-center space-x-2 rounded-2xl px-4 py-3 shadow-sm border bg-blue-100 border-blue-300 text-blue-900 ml-auto mr-4 mb-2 max-w-lg">
                        <span className="text-sm leading-relaxed whitespace-pre-wrap font-medium text-blue-900">
                          {liveTranscriptData.text_translated}
                        </span>
                      </div>
                    )}

                    {/* Status indicator */}
                    <div className="text-xs text-blue-600 border-t pt-2 flex items-center gap-2">
                      <span>Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        liveTranscriptData?.translation_status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : liveTranscriptData?.translation_status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : liveTranscriptData?.translation_status === 'translating'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {liveTranscriptData?.translation_status === 'translating'
                          ? 'Translating...'
                          : liveTranscriptData?.translation_status === 'ready'
                          ? 'Ready'
                          : liveTranscriptData?.translation_status || 'Processing'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-16">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-gray-600">
                      {nativeTranscriptHistory.length > 0
                        ? 'Translating...'
                        : 'Waiting for transcription...'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-white">🐛 Debug Panel</h3>
            <button
              onClick={() => setDebugMessages([])}
              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="text-white font-semibold mb-2">Connection</h4>
              <p>Status: <span className={connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>{connectionStatus}</span></p>
              <p>WebSocket: {serverUrl}</p>
              <p>Session: {sessionId}</p>
            </div>

            <div className="bg-gray-800 p-3 rounded">
              <h4 className="text-white font-semibold mb-2">Performance</h4>
              <p>Messages: {performanceMetrics.messagesReceived}</p>
              <p>Connection Time: {performanceMetrics.connectionTime}ms</p>
              <p>Avg Latency: {performanceMetrics.averageLatency}ms</p>
            </div>

            <div className="bg-gray-800 p-3 rounded">
              <h4 className="text-white font-semibold mb-2">Audio</h4>
              <p>Recording: {isRecording ? 'Yes' : 'No'}</p>
              <p>Sample Rate: {config.sampleRate}Hz</p>
              <p>Chunk Size: {config.chunkSizeMs}ms</p>
            </div>
          </div>

          <div className="bg-gray-800 p-3 rounded max-h-48 overflow-y-auto">
            <h4 className="text-white font-semibold mb-2">Message Log</h4>
            <div className="space-y-1">
              {debugMessages.slice(-20).map((msg, idx) => (
                <div key={idx} className="text-xs">
                  <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {msg}
                </div>
              ))}
              {debugMessages.length === 0 && (
                <div className="text-gray-500 italic">No messages yet...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Debug Toggle */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            showDebug
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          {showDebug ? '🐛 Hide Debug' : '🐛 Show Debug'}
        </button>
      </div>
    </div>
  );
}
