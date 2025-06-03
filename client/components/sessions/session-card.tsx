import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Define the session type
export interface Session {
  id: string;
  title: string;
  wardId: string;
  wardName: string;
  date: string;
  time: string;
  status: "scheduled" | "active" | "completed";
  participants: number;
  languages: string[];
  hymns: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  endedAt?: string;
}

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  // Format the date and time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{session.title}</CardTitle>
            <CardDescription>{session.wardName}</CardDescription>
          </div>
          <Badge className={getStatusColor(session.status)}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date:</span>
            <span>{formatDate(session.date)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Time:</span>
            <span>{formatTime(session.time)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Languages:</span>
            <span>{session.languages.join(", ")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Participants:</span>
            <span>{session.participants}</span>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/sessions/${session.id}`}>View</Link>
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/sessions/${session.id}/manage`}>Manage</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 