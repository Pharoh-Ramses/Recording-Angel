#!/bin/bash

# ADDED: Script to create test audio for API testing
# This helps users create a test audio file for the Whisper API test

echo "This script will help you create a test audio file for testing the Whisper API."
echo "You'll need to have ffmpeg installed for this to work."

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg is not installed. Please install it first."
    exit 1
fi

# Set output file
OUTPUT_FILE="test-audio.webm"

echo "Recording 5 seconds of audio. Please speak a test phrase..."
echo "Recording will start in 3 seconds..."
sleep 3
echo "Recording now! Speak clearly..."

# Record 5 seconds of audio
ffmpeg -f alsa -i default -t 5 -c:a libopus "$OUTPUT_FILE" -y

echo "Recording complete. Test audio saved to $OUTPUT_FILE"
echo "You can now run the Whisper API test with:"
echo "ENABLE_WHISPER_TEST=true go test -run TestRealWhisperAPI"
