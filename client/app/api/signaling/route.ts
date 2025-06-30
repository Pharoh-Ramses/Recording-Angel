import { NextRequest, NextResponse } from "next/server";

// Simple in-memory signaling store
// In production, use Redis or a proper message broker
interface SignalingMessage {
  id: string;
  sessionId: string;
  fromUserId: string;
  toUserId?: string; // undefined means broadcast to all
  type: "offer" | "answer" | "ice-candidate" | "user-joined" | "user-left";
  data: any;
  timestamp: number;
}

const signalingMessages = new Map<string, SignalingMessage[]>();
const sessionParticipants = new Map<string, Set<string>>();

// POST: Send a signaling message
export async function POST(request: NextRequest) {
  try {
    const { sessionId, fromUserId, toUserId, type, data } =
      await request.json();

    if (!sessionId || !fromUserId || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const message: SignalingMessage = {
      id: crypto.randomUUID(),
      sessionId,
      fromUserId,
      toUserId,
      type,
      data,
      timestamp: Date.now(),
    };

    // Store the message
    if (!signalingMessages.has(sessionId)) {
      signalingMessages.set(sessionId, []);
    }
    signalingMessages.get(sessionId)!.push(message);

    // Track participants
    if (!sessionParticipants.has(sessionId)) {
      sessionParticipants.set(sessionId, new Set());
    }
    sessionParticipants.get(sessionId)!.add(fromUserId);

    // Clean up old messages (keep only last 100 per session)
    const messages = signalingMessages.get(sessionId)!;
    if (messages.length > 100) {
      signalingMessages.set(sessionId, messages.slice(-100));
    }

    console.log(
      `📡 Signaling message: ${type} from ${fromUserId} to ${toUserId || "all"}`,
    );

    return NextResponse.json({ success: true, messageId: message.id });
  } catch (error) {
    console.error("Signaling POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET: Poll for new signaling messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId");
    const since = parseInt(searchParams.get("since") || "0");

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: "Missing sessionId or userId" },
        { status: 400 },
      );
    }

    const messages = signalingMessages.get(sessionId) || [];

    // Filter messages for this user (either addressed to them or broadcast)
    const relevantMessages = messages.filter(
      (msg) =>
        msg.timestamp > since &&
        msg.fromUserId !== userId && // Don't send back own messages
        (!msg.toUserId || msg.toUserId === userId), // Either broadcast or specifically for this user
    );

    const participants = Array.from(sessionParticipants.get(sessionId) || []);

    return NextResponse.json({
      messages: relevantMessages,
      participants,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Signaling GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
