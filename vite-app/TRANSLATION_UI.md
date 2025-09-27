# Translation UI Implementation

This document describes the frontend changes made to support real-time translation in the Recording Angel Vite app.

## New Features Added

### 1. Language Selection Dropdown
- **Location**: Left sidebar, below Display Mode controls
- **Languages**: 20 common languages including Spanish, French, German, Chinese, Japanese, Arabic, etc.
- **Default**: "No Translation" (disabled)
- **Real-time**: Changing language reconnects WebSocket with new target language

### 2. Translation Display Options
- **Side-by-side**: Shows original text with translation below (default)
- **Translation-first**: Shows translated text prominently with original text below
- **Toggle**: Checkbox to switch between display modes

### 3. Translation Status Indicator
- **Header Badge**: Shows target language in the header when translation is enabled
- **Status Panel**: Shows detected source language and translation status
- **Visual Feedback**: Color-coded status (green=success, red=failed, gray=disabled)

## Files Modified

### `/app/constants/languages.ts` (New)
- Defines 20+ supported languages with native names
- Helper functions for language code lookup
- Configurable default language setting

### `/app/hooks/useWebSocketTranscription.ts`
- Added `targetLanguage` parameter to connection interface
- Updated WebSocket URL to include `target_language` parameter
- Enhanced `LiveTranscript` interface with translation fields
- Added `liveTranscriptData` state for full translation info

### `/app/components/AudioTranscription.tsx`
- Added language selection dropdown with all supported languages
- Added translation display toggle (original vs translated first)
- Enhanced live transcript display with dual-language support
- Added translation status indicators in header and controls
- Real-time language switching (reconnects WebSocket)

## UI Layout Changes

```
┌─────────────────────────────────────────────────────────┐
│ Live Audio Transcription                               │
│ Session 123 · User ABC → Spanish                      │
│ [🟢 connected] [Disconnect]                           │
├─────────────────┬───────────────────────────────────────┤
│ Role            │ Live Transcription                    │
│ ☑ Speaker       │ ┌─────────────────────────────────────┐ │
│ ☐ Reader        │ │ Hello everyone, welcome...          │ │
│                 │ │ Spanish: Hola a todos, bienvenidos... │ │
│ Display Mode    │ └─────────────────────────────────────┘ │
│ ☑ Live Stream   │                                       │
│ ☐ Paragraphs    │                                       │
│                 │                                       │
│ Translation     │                                       │
│ Translate to:   │                                       │
│ [Spanish ▼]     │                                       │
│ ☐ Show trans... │                                       │
│ Target: Spanish │                                       │
│ Status: success │                                       │
│                 │                                       │
│ Recording       │                                       │
│ [Start Recording]│                                      │
│ [Stop]          │                                       │
└─────────────────┴───────────────────────────────────────┘
```

## Usage Instructions

### For Users
1. **Select Language**: Choose target language from dropdown
2. **Start Recording**: Begin speaking (if you're the speaker)
3. **View Translation**: See translated text below original text
4. **Switch Display**: Check "Show translation instead of original" to prioritize translated text
5. **Monitor Status**: Watch for translation status indicators

### For Developers
1. **Language Support**: Add new languages to `constants/languages.ts`
2. **Custom Styling**: Modify translation display styling in `AudioTranscription.tsx`
3. **WebSocket Protocol**: Translation data comes in `live_transcript` messages
4. **State Management**: Language selection triggers WebSocket reconnection

## Message Format

The WebSocket now receives enhanced live transcript messages:

```typescript
interface LiveTranscript {
  text: string;                           // Original text
  text_translated?: string;               // Translated text  
  target_language?: string;               // Target language code
  source_language_detected?: string;      // Detected source language
  translation_status?: 'success' | 'failed' | 'disabled';
  timestamp: string;
  session_id: string;
  is_final?: boolean;
}
```

## Testing

### Manual Testing
1. Start the Vite app: `npm run dev`
2. Select a target language from dropdown
3. Observe WebSocket URL includes `target_language` parameter
4. Start recording and speak to see translation appear
5. Toggle display modes to test UI functionality

### Browser Network Tab
```
ws://localhost:8080/ws?session_id=session-123&user_id=test&api_token=token&sample_rate=16000&encoding=pcm_s16le&target_language=es
```

## Supported Languages

- **European**: Spanish, French, German, Italian, Portuguese, Dutch, Polish, Swedish, Danish, Norwegian, Russian
- **Asian**: Chinese (Simplified/Traditional), Japanese, Korean, Hindi, Thai, Vietnamese  
- **Other**: Arabic

Languages display with both English and native names for better user experience.

## Future Enhancements

1. **Language Detection Display**: Show confidence scores for detected languages
2. **Translation History**: Save and display translation history per session
3. **Multi-language Support**: Translate to multiple languages simultaneously
4. **Offline Mode**: Cache translations for offline review
5. **Export Functionality**: Export transcriptions with translations