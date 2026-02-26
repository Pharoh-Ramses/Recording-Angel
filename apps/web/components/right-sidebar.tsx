"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { PollCard } from "@/components/poll-card";

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

  const pinnedPolls = useQuery(
    api.polls.getPinnedPolls,
    wardId ? { wardId } : "skip"
  );

  const membershipStatus = useQuery(
    api.members.myWardMembershipStatus,
    wardId ? { wardId } : "skip"
  );
  const isMember = membershipStatus?.status === "active";

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

      {/* Pinned Polls */}
      {pinnedPolls && pinnedPolls.length > 0 && (
        <div className="p-4 pt-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Pinned Polls
          </h2>
          <div className="space-y-3">
            {pinnedPolls.map((poll) => (
              <div key={poll._id}>
                <p className="text-sm font-medium leading-tight">
                  {poll.title}
                </p>
                <PollCard
                  postId={poll._id}
                  pollCloseDate={poll.pollCloseDate}
                  isMember={isMember}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
