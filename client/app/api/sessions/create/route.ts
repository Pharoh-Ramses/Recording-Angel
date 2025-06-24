//This endpoint needs to generate a unique, user-friendly session ID
//It must associate the session with the host user
//Store session details in the database
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/database/drizzle"
import { sessions } from "@/database/schema"
import { nanoid } from "nanoid"

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sessionCode = nanoid(6).toLowerCase();

        const [newSession] = await db
            .insert(sessions)
            .values({
                code: sessionCode,
                host_id: session.user.id,
            })
            .returning();

        return NextResponse.json({
            id: newSession.id,
            code: newSession.code,
            createdAt: newSession.createdAt,
        });
    } catch (error) {
        console.error("Error creating session:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

