"use server";

import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface CreateSessionResult {
  sessionId: string;
  joinCode: string;
  hostToken: string;
}

export async function createLiveSession(
  wardId: Id<"wards">,
  stakeId: Id<"stakes">,
): Promise<CreateSessionResult> {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) throw new Error("Not authenticated");

  convex.setAuth(token);

  // Verify user has live:manage permission
  const permissions = await convex.query(api.roles.myPermissions, { wardId });
  if (!permissions.includes("live:manage")) {
    throw new Error("You don't have permission to manage live sessions");
  }

  // Get stake to read configured languages
  const stake = await convex.query(api.stakes.get, { id: stakeId });
  if (!stake) throw new Error("Stake not found");

  const languages = stake.languages.filter((lang: string) => lang !== "en");
  if (languages.length === 0) {
    throw new Error("No target languages configured for this stake");
  }

  // Call recording-angel API
  const apiUrl = process.env.RECORDING_ANGEL_URL;
  const apiKey = process.env.RECORDING_ANGEL_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new Error("Recording Angel API not configured");
  }

  const res = await fetch(`${apiUrl}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      wardId,
      stakeId,
      languages,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to create live session");
  }

  return (await res.json()) as CreateSessionResult;
}
