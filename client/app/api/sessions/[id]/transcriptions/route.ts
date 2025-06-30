import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { transcriptions } from "@/database/schema";
import { eq, gt, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    // Build query to get transcriptions for this session
    let sessionTranscriptions;

    if (since) {
      const sinceDate = new Date(parseInt(since));
      sessionTranscriptions = await db
        .select()
        .from(transcriptions)
        .where(
          and(
            eq(transcriptions.session_id, sessionId),
            gt(transcriptions.timestamp, sinceDate),
          ),
        )
        .orderBy(transcriptions.timestamp);
    } else {
      sessionTranscriptions = await db
        .select()
        .from(transcriptions)
        .where(eq(transcriptions.session_id, sessionId))
        .orderBy(transcriptions.timestamp);
    }
    // Format transcriptions for client
    const formattedTranscriptions = sessionTranscriptions.map((t) => ({
      id: t.id,
      text: t.text,
      timestamp: t.timestamp.getTime(),
      language: t.language,
    }));

    return NextResponse.json({
      transcriptions: formattedTranscriptions,
      currentTimestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error fetching transcriptions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
