import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/database/drizzle";
import { transcriptions } from "@/database/schema";
import { auth } from "@/auth";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const sessionId = formData.get("sessionId") as string;

    if (!audioFile || !sessionId) {
      return NextResponse.json(
        { error: "Missing audio file or session ID" },
        { status: 400 },
      );
    }

    // Check if audio file has content
    if (audioFile.size === 0) {
      return NextResponse.json({ text: "" }); // Return empty text for empty audio
    }

    console.log(
      `🎵 Transcribing audio chunk: ${audioFile.size} bytes, type: ${audioFile.type} for session ${sessionId}`,
    );

    // Convert File to Buffer for OpenAI API
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension based on MIME type
    let fileName = "audio.webm";
    let fileType = audioFile.type;

    if (audioFile.type.includes("mp4")) {
      fileName = "audio.mp4";
    } else if (audioFile.type.includes("wav")) {
      fileName = "audio.wav";
    } else if (audioFile.type.includes("webm")) {
      fileName = "audio.webm";
    }

    // Create a File-like object that OpenAI expects
    const audioFileForOpenAI = new File([buffer], fileName, {
      type: fileType,
    });

    console.log(`📤 Sending to OpenAI: ${fileName} (${fileType})`);

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFileForOpenAI,
      model: "whisper-1",
      language: "en", // You can make this configurable
      response_format: "text",
      temperature: 0.2, // Lower temperature for more consistent transcription
    });

    const transcribedText = transcription.trim();

    console.log(`📝 Transcription result: "${transcribedText}"`);

    // Get current user (host)
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Store transcription in database if there's actual content
    if (transcribedText.length > 0) {
      await db.insert(transcriptions).values({
        session_id: sessionId,
        text: transcribedText,
        language: "en",
        timestamp: new Date(),
        speaker_id: session.user.id,
      });
    }

    return NextResponse.json({
      text: transcribedText,
      sessionId,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Transcription error:", error);

    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "OpenAI API key not configured" },
          { status: 500 },
        );
      }
      if (error.message.includes("audio")) {
        return NextResponse.json(
          { error: "Invalid audio format" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 },
    );
  }
}
