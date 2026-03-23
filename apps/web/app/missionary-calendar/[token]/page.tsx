"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";

import { PublicDinnerCalendar } from "@/components/missionary/public-dinner-calendar";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

export default function MissionaryCalendarPage() {
  const params = useParams<{ token: string }>();
  const calendar = useQuery(api.missionaryCalendars.getPublicCalendarByToken, {
    token: params.token,
  });

  if (calendar === undefined) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading dinner calendar...</p>;
  }

  if (!calendar) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar unavailable</CardTitle>
            <CardDescription>
              This missionary calendar link is no longer active or may have been entered incorrectly.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <PublicDinnerCalendar token={params.token} calendar={calendar} />;
}
