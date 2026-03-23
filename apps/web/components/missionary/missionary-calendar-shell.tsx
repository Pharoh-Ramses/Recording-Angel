"use client";

import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { MissionaryAnnouncementComposer } from "@/components/missionary/missionary-announcement-composer";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import type { MissionaryAccess } from "@/convex/lib/missionaryAuth";
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

type MissionaryCalendarGroup = {
  _id: Id<"missionaryCalendarGroups">;
  name: string;
  shareToken: string;
  companionshipIds: Id<"companionships">[];
  companionships: Array<Doc<"companionships">>;
  canManageSlots: boolean;
};

type DinnerSlot = Doc<"missionaryDinnerSlots">;

type SlotEditorState = {
  open: boolean;
  slotId?: Id<"missionaryDinnerSlots">;
  date: string;
  mealType: string;
  notes: string;
};

const EMPTY_EDITOR_STATE: SlotEditorState = {
  open: false,
  date: "",
  mealType: "",
  notes: "",
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
    return "Cancelled";
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

export function MissionaryCalendarShell({
  wardId,
  access,
}: {
  wardId: Id<"wards">;
  access: MissionaryAccess;
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
  const assignment = useQuery(api.missionaries.myActiveAssignment, { wardId });
  const groups = useQuery(api.missionaryCalendars.listAccessibleCalendarGroupsForWard, { wardId });
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [editorState, setEditorState] = useState<SlotEditorState>(EMPTY_EDITOR_STATE);
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);
  const saveDinnerSlot = useMutation(api.missionaryCalendars.saveDinnerSlot);
  const deleteDinnerSlot = useMutation(api.missionaryCalendars.deleteDinnerSlot);

  useEffect(() => {
    if (!groups || groups.length === 0) {
      return;
    }

    if (!selectedGroupId || !groups.some((group) => group._id === selectedGroupId)) {
      const firstGroup = groups[0];
      if (firstGroup) {
        setSelectedGroupId(firstGroup._id);
      }
    }
  }, [groups, selectedGroupId]);

  const selectedGroup = groups?.find((group) => group._id === selectedGroupId) as
    | MissionaryCalendarGroup
    | undefined;
  const slots = useQuery(
    api.missionaryCalendars.listSlotsForGroup,
    selectedGroup
      ? {
          calendarGroupId: selectedGroup._id,
          from: range.from,
          to: range.to,
        }
      : "skip",
  );

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

  function replaceUrlState(nextState: Partial<typeof urlState>) {
    const query = buildMissionaryCalendarQuery({
      ...urlState,
      ...nextState,
    });

    router.replace(`${pathname}?${query}`, { scroll: false });
  }

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

  function openNewSlotDialog(date: string) {
    setEditorState({
      open: true,
      date,
      mealType: "",
      notes: "",
    });
  }

  function openEditSlotDialog(slot: DinnerSlot) {
    setEditorState({
      open: true,
      slotId: slot._id,
      date: slot.date,
      mealType: slot.mealType ?? "",
      notes: slot.notes ?? "",
    });
  }

  async function handleSaveSlot() {
    if (!selectedGroup) {
      return;
    }

    if (!editorState.date) {
      toast.error("A slot date is required");
      return;
    }

    setIsSavingSlot(true);

    try {
      await saveDinnerSlot({
        calendarGroupId: selectedGroup._id,
        slotId: editorState.slotId,
        date: editorState.date,
        mealType: editorState.mealType.trim() || undefined,
        notes: editorState.notes.trim() || undefined,
      });
      toast.success(editorState.slotId ? "Dinner slot updated" : "Dinner slot added");
      setEditorState(EMPTY_EDITOR_STATE);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingSlot(false);
    }
  }

  async function handleDeleteSlot(slotId: Id<"missionaryDinnerSlots">) {
    setDeletingSlotId(slotId);

    try {
      await deleteDinnerSlot({ slotId });
      toast.success("Dinner slot removed");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeletingSlotId(null);
    }
  }

  if (assignment === undefined || groups === undefined || (selectedGroup && slots === undefined)) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading missionary calendar...</p>;
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Missionary hub</CardTitle>
            <Badge variant="outline">
              {access.isWardMissionLeader ? "Ward mission leader" : "Missionary"}
            </Badge>
          </div>
          <CardDescription>
            Keep dinner calendars current and share missionary announcements from one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-foreground">Active calendar group</span>
            <span className="text-muted-foreground">
              {selectedGroup?.name ?? "No calendar group is available yet."}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-medium text-foreground">Companionship context</span>
            <span className="text-muted-foreground">
              {selectedGroup && selectedGroup.companionships.length > 0
                ? selectedGroup.companionships.map((companionship) => companionship.name).join(", ")
                : assignment?.missionary?.name
                  ? `${assignment.missionary.name} is assigned to this ward.`
                  : "This view will show companionship mappings once a calendar group is ready."}
            </span>
          </div>
          {selectedGroup ? (
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">Share link</span>
              <span className="text-muted-foreground">
                {`/missionary-calendar/${selectedGroup.shareToken}`}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {access.canCreateMissionaryAnnouncements ? (
        <MissionaryAnnouncementComposer wardId={wardId} />
      ) : null}

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Dinner calendar</CardTitle>
              <CardDescription>
                {urlState.view === "week" ? getWeekLabel(urlState.week) : getMonthLabel(urlState.month)}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {groups.length > 0 ? (
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Select calendar group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group._id} value={group._id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
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
            {selectedGroup?.canManageSlots ? (
              <Button size="sm" onClick={() => openNewSlotDialog(urlState.week)}>
                <Plus className="h-4 w-4" />
                Add slot
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No dinner calendars are available for this ward yet.
            </p>
          ) : urlState.view === "week" ? (
            <div className="space-y-3">
              {calendarDates.map((date) => (
                <CalendarDayList
                  key={date}
                  date={date}
                  month={urlState.month}
                  slots={slotsByDate.get(date) ?? []}
                  canManageSlots={selectedGroup?.canManageSlots ?? false}
                  onAddSlot={openNewSlotDialog}
                  onEditSlot={openEditSlotDialog}
                  onDeleteSlot={handleDeleteSlot}
                  deletingSlotId={deletingSlotId}
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
                  <CalendarDayCell
                    key={date}
                    date={date}
                    month={urlState.month}
                    slots={slotsByDate.get(date) ?? []}
                    canManageSlots={selectedGroup?.canManageSlots ?? false}
                    onAddSlot={openNewSlotDialog}
                    onEditSlot={openEditSlotDialog}
                    onDeleteSlot={handleDeleteSlot}
                    deletingSlotId={deletingSlotId}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editorState.open}
        onOpenChange={(open) => setEditorState(open ? editorState : EMPTY_EDITOR_STATE)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editorState.slotId ? "Edit dinner slot" : "Add dinner slot"}</DialogTitle>
            <DialogDescription>
              Keep the public meal calendar current for volunteers and missionaries.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="missionary-slot-date">Date</Label>
              <Input
                id="missionary-slot-date"
                type="date"
                value={editorState.date}
                onChange={(event) =>
                  setEditorState((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="missionary-slot-meal-type">Meal label</Label>
              <Input
                id="missionary-slot-meal-type"
                placeholder="Dinner"
                value={editorState.mealType}
                onChange={(event) =>
                  setEditorState((current) => ({
                    ...current,
                    mealType: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="missionary-slot-notes">Notes</Label>
              <Textarea
                id="missionary-slot-notes"
                placeholder="Any meal notes or contact details"
                value={editorState.notes}
                onChange={(event) =>
                  setEditorState((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorState(EMPTY_EDITOR_STATE)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSlot} disabled={isSavingSlot}>
              {isSavingSlot ? "Saving..." : editorState.slotId ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarDayCell({
  date,
  month,
  slots,
  canManageSlots,
  onAddSlot,
  onEditSlot,
  onDeleteSlot,
  deletingSlotId,
}: {
  date: string;
  month: string;
  slots: DinnerSlot[];
  canManageSlots: boolean;
  onAddSlot: (date: string) => void;
  onEditSlot: (slot: DinnerSlot) => void;
  onDeleteSlot: (slotId: Id<"missionaryDinnerSlots">) => Promise<void>;
  deletingSlotId: string | null;
}) {
  return (
    <div className="min-h-36 rounded-lg border p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{getWeekdayName(date)}</p>
          <p className={isSameMonth(date, month) ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
            {parseCalendarDate(date).getDate()}
          </p>
        </div>
        {canManageSlots ? (
          <Button variant="ghost" size="sm" onClick={() => onAddSlot(date)}>
            Add
          </Button>
        ) : null}
      </div>
      <div className="space-y-2">
        {slots.length === 0 ? (
          <p className="text-xs text-muted-foreground">No slots</p>
        ) : (
          slots.map((slot) => (
            <SlotCard
              key={slot._id}
              slot={slot}
              canManageSlots={canManageSlots}
              onEditSlot={onEditSlot}
              onDeleteSlot={onDeleteSlot}
              isDeleting={deletingSlotId === slot._id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CalendarDayList({
  date,
  month,
  slots,
  canManageSlots,
  onAddSlot,
  onEditSlot,
  onDeleteSlot,
  deletingSlotId,
}: {
  date: string;
  month: string;
  slots: DinnerSlot[];
  canManageSlots: boolean;
  onAddSlot: (date: string) => void;
  onEditSlot: (slot: DinnerSlot) => void;
  onDeleteSlot: (slotId: Id<"missionaryDinnerSlots">) => Promise<void>;
  deletingSlotId: string | null;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
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
        {canManageSlots ? (
          <Button variant="outline" size="sm" onClick={() => onAddSlot(date)}>
            <Plus className="h-4 w-4" />
            Add slot
          </Button>
        ) : null}
      </div>
      <div className="space-y-2">
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dinner slots scheduled.</p>
        ) : (
          slots.map((slot) => (
            <SlotCard
              key={slot._id}
              slot={slot}
              canManageSlots={canManageSlots}
              onEditSlot={onEditSlot}
              onDeleteSlot={onDeleteSlot}
              isDeleting={deletingSlotId === slot._id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  canManageSlots,
  onEditSlot,
  onDeleteSlot,
  isDeleting,
}: {
  slot: DinnerSlot;
  canManageSlots: boolean;
  onEditSlot: (slot: DinnerSlot) => void;
  onDeleteSlot: (slotId: Id<"missionaryDinnerSlots">) => Promise<void>;
  isDeleting: boolean;
}) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium">{slot.mealType?.trim() || "Dinner slot"}</p>
          <Badge variant={getSlotStatusVariant(slot.status)}>{getSlotStatusLabel(slot.status)}</Badge>
        </div>
        {canManageSlots ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEditSlot(slot)}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void onDeleteSlot(slot._id)}
              disabled={isDeleting}
            >
              {isDeleting ? "Removing..." : "Remove"}
            </Button>
          </div>
        ) : null}
      </div>
      {slot.notes ? <p className="mt-2 text-sm text-muted-foreground">{slot.notes}</p> : null}
    </div>
  );
}
