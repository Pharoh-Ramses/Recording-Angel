"use server";

interface ArchivedSession {
  id: string;
  sourceLang: string;
  targetLangs: string[];
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  listenerCount: number;
}

interface TranscriptSegment {
  id: string;
  sequence: number;
  sourceText: string;
  language: string;
  text: string;
  isFinal: boolean;
  createdAt: string;
}

export async function listArchivedSessions(
  wardId: string,
  stakeId: string,
): Promise<ArchivedSession[]> {
  const apiUrl = process.env.RECORDING_ANGEL_URL;
  const apiKey = process.env.RECORDING_ANGEL_API_KEY;
  if (!apiUrl || !apiKey) return [];

  const res = await fetch(
    `${apiUrl}/sessions?wardId=${encodeURIComponent(wardId)}&stakeId=${encodeURIComponent(stakeId)}&status=ended`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 60 },
    },
  );
  if (!res.ok) return [];

  const data = await res.json();
  return data.sessions;
}

export async function getSessionTranscript(
  sessionId: string,
  wardId: string,
  stakeId: string,
): Promise<TranscriptSegment[]> {
  const apiUrl = process.env.RECORDING_ANGEL_URL;
  const apiKey = process.env.RECORDING_ANGEL_API_KEY;
  if (!apiUrl || !apiKey) return [];

  const res = await fetch(
    `${apiUrl}/sessions/${sessionId}/transcript?wardId=${encodeURIComponent(wardId)}&stakeId=${encodeURIComponent(stakeId)}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
  );
  if (!res.ok) return [];

  const data = await res.json();
  return data.segments;
}
