import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/database/drizzle';
import { sessions } from '@/database/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid session code' }, { status: 400 });
    }

    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.code, code.toLowerCase()))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session[0].endedAt) {
      return NextResponse.json({ error: 'Session has ended' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      sessionId: session[0].id,
      message: 'Session found and active'
    });
  } catch (error) {
    console.error('Error joining session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
