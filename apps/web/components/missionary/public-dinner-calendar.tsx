"use client";

import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import type { PublicMissionaryCalendarSummary } from "@/convex/lib/publicMissionaryCalendar";
import {
  addDays,
  addMonths,
  getCalendarRange,
  getMonthLabel,
  getStartOfWeek,
  getWeekLabel,
  getWeekdayName,
  isSameMonth,
  listDatesInRange,
  parseCalendarDate,
} from "@/lib/missionary-calendar";
import {
  buildMissionaryCalendarQuery,
  parseMissionaryCalendarQuery,
} from "@/lib/missionary-calendar-url-state";

type DinnerSlot = Doc<"missionaryDinnerSlots">;

type ClaimDialogState = {
  open: boolean;
  slotId?: Id<"missionaryDinnerSlots">;
  slotLabel: string;
  volunteerName: string;
  volunteerPhone: string;
};

const EMPTY_CLAIM_DIALOG_STATE: ClaimDialogState = {
  open: false,
  slotLabel: "",
  volunteerName: "",
  volunteerPhone: "",
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong";
}

function getSlotStatusLabel(status: DinnerSlot["status"]) {
  if (status === "reserved") {
    return "Reserved";
  }

  if (status === "cancelled") {
    return "Unavailable";
  }

  return "Open";
}

function getSlotStatusVariant(status: DinnerSlot["status"]) {
  if (status === "reserved") {
    return "secondary" as const;
  }

  if (status === "cancelled") {
    return "outline" as const;
  }

  return "default" as const;
}

export function PublicDinnerCalendar({
  token,
  calendar,
}: {
  token: string;
  calendar: PublicMissionaryCalendarSummary;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlState = useMemo(
    () => parseMissionaryCalendarQuery(searchParams),
    [searchParams],
  );
  const range = useMemo(
    () => getCalendarRange(urlState.view, urlState.month, urlState.week),
    [urlState.month, urlState.view, urlState.week],
  );
  const slots = useQuery(api.missionaryCalendars.listPublicSlots, {
    token,
    from: range.from,
    to: range.to,
  });
  const claimPublicDinnerSlot = useMutation(api.missionaryCalendars.claimPublicDinnerSlot);
  const [dialogState, setDialogState] = useState<ClaimDialogState>(EMPTY_CLAIM_DIALOG_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slotsByDate = useMemo(() => {
    const byDate = new Map<string, DinnerSlot[]>();

    for (const slot of slots ?? []) {
      const current = byDate.get(slot.date) ?? [];
      current.push(slot);
      current.sort((left, right) => {
        const leftMealType = left.mealType ?? "";
        const rightMealType = right.mealType ?? "";
        return leftMealType.localeCompare(rightMealType);
      });
      byDate.set(slot.date, current);
    }

    return byDate;
  }, [slots]);

  const calendarDates = useMemo(() => listDatesInRange(range), [range]);

  const replaceUrlState = useCallback((nextState: Partial<typeof urlState>) => {
    const query = buildMissionaryCalendarQuery({
      ...urlState,
      group: token,
      ...nextState,
    });

    router.replace(`${pathname}?${query}`, { scroll: false });
  }, [pathname, router, token, urlState]);

  useEffect(() => {
    if (urlState.group === token) {
      return;
    }

    replaceUrlState({ group: token });
  }, [replaceUrlState, token, urlState.group]);

  function handleMove(direction: "previous" | "next") {
    if (urlState.view === "week") {
      const amount = direction === "previous" ? -7 : 7;
      const nextWeek = addDays(getStartOfWeek(urlState.week), amount);
      replaceUrlState({
        week: nextWeek,
        month: nextWeek.slice(0, 7),
      });
      return;
    }

    const amount = direction === "previous" ? -1 : 1;
    const nextMonth = addMonths(urlState.month, amount);
    replaceUrlState({
      month: nextMonth,
      week: `${nextMonth}-01`,
    });
  }

  function handleToday() {
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const week = `${month}-${String(today.getDate()).padStart(2, "0")}`;

    replaceUrlState({ month, week });
  }

  function openClaimDialog(slot: DinnerSlot) {
    setDialogState({
      open: true,
      slotId: slot._id,
      slotLabel: `${slot.mealType?.trim() || "Dinner slot"} on ${parseCalendarDate(slot.date).toLocaleDateString()}`,
      volunteerName: "",
      volunteerPhone: "",
    });
  }

  async function handleClaimSlot() {
    if (!dialogState.slotId) {
      return;
    }

    if (!dialogState.volunteerName.trim() || !dialogState.volunteerPhone.trim()) {
      toast.error("Your name and phone are required");
      return;
    }

    setIsSubmitting(true);

    try {
      await claimPublicDinnerSlot({
        token,
        slotId: dialogState.slotId,
        volunteerName: dialogState.volunteerName,
        volunteerPhone: dialogState.volunteerPhone,
      });
      toast.success("Dinner slot claimed");
      setDialogState(EMPTY_CLAIM_DIALOG_STATE);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (slots === undefined) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading dinner calendar...</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <Card>
        <CardHeader className="gap-3">
          <CardTitle>{calendar.name}</CardTitle>
          <CardDescription>
            Choose an open dinner slot and leave a name and phone number so the missionaries can follow up if needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Shared meal calendar</span>
          <span>-</span>
          <span>{urlState.view === "week" ? getWeekLabel(urlState.week) : getMonthLabel(urlState.month)}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Schedule</CardTitle>
              <CardDescription>
                Open slots can be claimed right from this page.
              </CardDescription>
            </div>
            <Tabs
              value={urlState.view}
              onValueChange={(view) => replaceUrlState({ view: view as "month" | "week" })}
            >
              <TabsList>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleMove("previous")}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleMove("next")}>
              Forward
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {urlState.view === "week" ? (
            <div className="space-y-3">
              {calendarDates.map((date) => (
                <PublicCalendarDayList
                  key={date}
                  date={date}
                  month={urlState.month}
                  slots={slotsByDate.get(date) ?? []}
                  onClaimSlot={openClaimDialog}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="hidden grid-cols-7 gap-2 text-xs font-medium text-muted-foreground md:grid">
                {[
                  "Sun",
                  "Mon",
                  "Tue",
                  "Wed",
                  "Thu",
                  "Fri",
                  "Sat",
                ].map((dayName) => (
                  <div key={dayName} className="px-2">
                    {dayName}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
                {calendarDates.map((date) => (
                  <PublicCalendarDayCell
                    key={date}
                    date={date}
                    month={urlState.month}
                    slots={slotsByDate.get(date) ?? []}
                    onClaimSlot={openClaimDialog}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState(open ? dialogState : EMPTY_CLAIM_DIALOG_STATE)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim dinner slot</DialogTitle>
            <DialogDescription>{dialogState.slotLabel}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="public-volunteer-name">Name</Label>
              <Input
                id="public-volunteer-name"
                value={dialogState.volunteerName}
                onChange={(event) =>
                  setDialogState((current) => ({
                    ...current,
                    volunteerName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="public-volunteer-phone">Phone</Label>
              <Input
                id="public-volunteer-phone"
                value={dialogState.volunteerPhone}
                onChange={(event) =>
                  setDialogState((current) => ({
                    ...current,
                    volunteerPhone: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogState(EMPTY_CLAIM_DIALOG_STATE)}>
              Cancel
            </Button>
            <Button onClick={handleClaimSlot} disabled={isSubmitting}>
              {isSubmitting ? "Claiming..." : "Claim slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PublicCalendarDayCell({
  date,
  month,
  slots,
  onClaimSlot,
}: {
  date: string;
  month: string;
  slots: DinnerSlot[];
  onClaimSlot: (slot: DinnerSlot) => void;
}) {
  return (
    <div className="min-h-36 rounded-lg border p-2">
      <div className="mb-2">
        <p className="text-xs text-muted-foreground">{getWeekdayName(date)}</p>
        <p className={isSameMonth(date, month) ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
          {parseCalendarDate(date).getDate()}
        </p>
      </div>
      <div className="space-y-2">
        {slots.length === 0 ? (
          <p className="text-xs text-muted-foreground">No slots</p>
        ) : (
          slots.map((slot) => <PublicSlotCard key={slot._id} slot={slot} onClaimSlot={onClaimSlot} compact />)
        )}
      </div>
    </div>
  );
}

function PublicCalendarDayList({
  date,
  month,
  slots,
  onClaimSlot,
}: {
  date: string;
  month: string;
  slots: DinnerSlot[];
  onClaimSlot: (slot: DinnerSlot) => void;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-3">
        <p className="text-sm font-medium">
          {parseCalendarDate(date).toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </p>
        {!isSameMonth(date, month) ? (
          <p className="text-xs text-muted-foreground">Outside the selected month</p>
        ) : null}
      </div>
      <div className="space-y-2">
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dinner slots scheduled.</p>
        ) : (
          slots.map((slot) => <PublicSlotCard key={slot._id} slot={slot} onClaimSlot={onClaimSlot} />)
        )}
      </div>
    </div>
  );
}

function PublicSlotCard({
  slot,
  onClaimSlot,
  compact = false,
}: {
  slot: DinnerSlot;
  onClaimSlot: (slot: DinnerSlot) => void;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className={compact ? "text-xs font-medium" : "text-sm font-medium"}>
            {slot.mealType?.trim() || "Dinner slot"}
          </p>
          <Badge variant={getSlotStatusVariant(slot.status)}>{getSlotStatusLabel(slot.status)}</Badge>
        </div>
        {slot.status === "open" ? (
          <Button size="sm" onClick={() => onClaimSlot(slot)}>
            Claim
          </Button>
        ) : null}
      </div>
      {slot.notes ? (
        <p className={compact ? "mt-2 text-xs text-muted-foreground" : "mt-2 text-sm text-muted-foreground"}>
          {slot.notes}
        </p>
      ) : null}
    </div>
  );
}
