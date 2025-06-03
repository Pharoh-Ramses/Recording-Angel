import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SessionCard, Session } from "@/components/sessions/session-card";

// Mock data for testing
const mockSessions: Session[] = [
  {
    id: "1",
    title: "Sunday Service",
    wardId: "ward1",
    wardName: "First Ward",
    date: "2024-03-24",
    time: "10:00",
    status: "scheduled",
    participants: 0,
    languages: ["English", "Spanish"],
    hymns: ["How Firm a Foundation", "I Stand All Amazed"],
    notes: "Regular Sunday service with special musical number",
    createdAt: "2024-03-20T08:00:00Z",
    updatedAt: "2024-03-20T08:00:00Z",
  },
  {
    id: "2",
    title: "Stake Conference",
    wardId: "ward2",
    wardName: "Second Ward",
    date: "2024-03-17",
    time: "14:00",
    status: "completed",
    participants: 150,
    languages: ["English"],
    hymns: ["The Spirit of God", "Come, Come, Ye Saints"],
    notes: "Stake conference with visiting general authority",
    createdAt: "2024-03-15T10:00:00Z",
    updatedAt: "2024-03-17T16:00:00Z",
    startedAt: "2024-03-17T14:00:00Z",
    endedAt: "2024-03-17T16:00:00Z",
  },
];

export default function SessionsPage() {
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">Manage your recording sessions</p>
        </div>
        <Button asChild>
          <Link href="/sessions/new">Create New Session</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockSessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}