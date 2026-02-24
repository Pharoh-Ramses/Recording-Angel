"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";

interface RightSidebarProps {
  wardId?: Id<"wards">;
  stakeId?: Id<"stakes">;
  onShowEvents: () => void;
}

export function RightSidebar({
  wardId,
  stakeId,
  onShowEvents,
}: RightSidebarProps) {
  const events = useQuery(
    api.posts.upcomingEvents,
    wardId ? { wardId } : stakeId ? { stakeId } : "skip"
  );

  return (
    <aside className="hidden lg:block w-72 border-l border-border h-screen sticky top-0 bg-background overflow-y-auto">
      {/* Upcoming Events */}
      <div className="p-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Upcoming Events
        </h2>

        {events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event._id}
                className="rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors cursor-pointer"
              >
                {event.eventDate && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(event.eventDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                )}
                <p className="text-sm font-medium leading-tight">
                  {event.title}
                </p>
                {event.eventLocation && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    {event.eventLocation}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={onShowEvents}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full pt-1"
            >
              See all events
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No upcoming events
          </p>
        )}
      </div>

      {/* Promoted section */}
      <div className="p-4 pt-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Promoted
        </h2>
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm font-medium">Complete your profile</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add a photo and bio to connect with your ward members.
          </p>
          <button className="flex items-center gap-1 text-xs font-medium text-primary mt-3 hover:underline">
            Get started
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </aside>
  );
}
