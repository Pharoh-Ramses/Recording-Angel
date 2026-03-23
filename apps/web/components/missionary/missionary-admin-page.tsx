"use client";

import DOMPurify from "isomorphic-dompurify";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { MissionaryAccess } from "@/convex/lib/missionaryAuth";

type WardId = Id<"wards">;

type ProfileFormState = {
  missionaryId: Id<"missionaries"> | null;
  userId: Id<"users"> | "";
  name: string;
  email: string;
  phoneNumber: string;
};

type CompanionshipFormState = {
  companionshipId: Id<"companionships"> | null;
  name: string;
  phoneNumber: string;
  status: "active" | "inactive";
  missionaryIds: Id<"missionaries">[];
};

type CalendarGroupFormState = {
  calendarGroupId: Id<"missionaryCalendarGroups"> | null;
  name: string;
  shareToken: string;
  status: "active" | "inactive";
  companionshipIds: Id<"companionships">[];
};

const EMPTY_PROFILE_FORM: ProfileFormState = {
  missionaryId: null,
  userId: "",
  name: "",
  email: "",
  phoneNumber: "",
};

const EMPTY_COMPANIONSHIP_FORM: CompanionshipFormState = {
  companionshipId: null,
  name: "",
  phoneNumber: "",
  status: "active",
  missionaryIds: [],
};

const EMPTY_CALENDAR_GROUP_FORM: CalendarGroupFormState = {
  calendarGroupId: null,
  name: "",
  shareToken: "",
  status: "active",
  companionshipIds: [],
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong";
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString();
}

export function MissionaryAdminPage({ wardId }: { wardId: WardId }) {
  const access = useQuery(api.missionaries.myWardAccess, { wardId });

  if (access === undefined) {
    return <p className="text-muted-foreground">Loading missionary admin...</p>;
  }

  if (!access.canAccessMissionaryAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Missionaries</CardTitle>
          <CardDescription>
            Ward mission leader access is required for this admin page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <MissionaryAdminManager wardId={wardId} access={access} />;
}

function MissionaryAdminManager({
  wardId,
  access,
}: {
  wardId: WardId;
  access: MissionaryAccess;
}) {
  const ward = useQuery(api.wards.getById, { wardId });
  const canCreateMissionaries =
    access.canManageMissionaries && access.canManageAssignments;
  const canShowProfilesSection = access.canViewMissionaries || canCreateMissionaries;
  const canShowTransfersSection =
    access.canViewMissionaries && access.canManageAssignments;
  const canShowCompanionshipSection =
    access.isWardMissionLeader && access.canManageCompanionships && access.canViewMissionaries;
  const canShowCalendarGroupsSection =
    access.isWardMissionLeader && access.canManageCalendars;
  const canShowAnnouncementsSection =
    access.isWardMissionLeader && access.canApproveMissionaryAnnouncements;
  const shouldLoadMissionaries =
    access.canViewMissionaries || canShowCompanionshipSection || canShowTransfersSection;
  const shouldLoadCompanionships =
    canShowCompanionshipSection || canShowCalendarGroupsSection;

  const missionaries = useQuery(
    api.missionaries.listForWard,
    shouldLoadMissionaries ? { wardId } : "skip",
  );
  const candidateMembers = useQuery(
    api.missionaries.listCandidateMembersForWard,
    canCreateMissionaries ? { wardId } : "skip",
  );
  const companionships = useQuery(
    api.missionaryCalendars.listCompanionshipsForWard,
    shouldLoadCompanionships ? { wardId } : "skip",
  );
  const calendarGroups = useQuery(
    api.missionaryCalendars.listCalendarGroupsForWard,
    canShowCalendarGroupsSection ? { wardId } : "skip",
  );
  const transferDestinations = useQuery(
    api.missionaries.listTransferDestinationsForWard,
    canShowTransfersSection ? { wardId } : "skip",
  );

  const createMissionary = useMutation(api.missionaries.createMissionary);
  const updateMissionaryProfile = useMutation(api.missionaries.updateMissionaryProfile);
  const transferMissionary = useMutation(api.missionaries.transferMissionary);
  const saveCompanionship = useMutation(api.missionaryCalendars.saveCompanionship);
  const setCompanionshipMissionaries = useMutation(
    api.missionaryCalendars.setCompanionshipMissionaries,
  );
  const saveCalendarGroup = useMutation(api.missionaryCalendars.saveCalendarGroup);
  const setCalendarGroupCompanionships = useMutation(
    api.missionaryCalendars.setCalendarGroupCompanionships,
  );
  const [profileForm, setProfileForm] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
  const [companionshipForm, setCompanionshipForm] = useState<CompanionshipFormState>(
    EMPTY_COMPANIONSHIP_FORM,
  );
  const [calendarGroupForm, setCalendarGroupForm] = useState<CalendarGroupFormState>(
    EMPTY_CALENDAR_GROUP_FORM,
  );
  const [transferWardByMissionaryId, setTransferWardByMissionaryId] = useState<
    Record<string, string>
  >({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingCompanionship, setIsSavingCompanionship] = useState(false);
  const [isSavingCalendarGroup, setIsSavingCalendarGroup] = useState(false);
  const [transferingMissionaryId, setTransferingMissionaryId] = useState<string | null>(null);

  const missionaryById = useMemo(
    () =>
      new Map(
        (missionaries ?? []).map((missionary) => [missionary._id, missionary]),
      ),
    [missionaries],
  );

  if (
    ward === undefined ||
    (shouldLoadMissionaries && missionaries === undefined) ||
    (canCreateMissionaries && candidateMembers === undefined) ||
    (shouldLoadCompanionships && companionships === undefined) ||
    (canShowCalendarGroupsSection && calendarGroups === undefined) ||
    (canShowTransfersSection && transferDestinations === undefined)
  ) {
    return <p className="text-muted-foreground">Loading missionary admin...</p>;
  }

  const safeMissionaries = missionaries ?? [];
  const safeCandidateMembers = candidateMembers ?? [];
  const safeCompanionships = companionships ?? [];
  const safeCalendarGroups = calendarGroups ?? [];
  const safeTransferDestinations = transferDestinations ?? [];

  const handleMemberSelection = (userId: string) => {
    const selectedMember = safeCandidateMembers.find((member) => member.userId === userId);

    setProfileForm({
      missionaryId: null,
      userId: userId as Id<"users">,
      name: selectedMember?.name ?? "",
      email: selectedMember?.email ?? "",
      phoneNumber: "",
    });
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = profileForm.name.trim();
    const trimmedEmail = profileForm.email.trim();
    const trimmedPhoneNumber = profileForm.phoneNumber.trim();

    if (!trimmedName || !trimmedEmail) {
      toast.error("Name and email are required");
      return;
    }

    setIsSavingProfile(true);

    try {
      if (profileForm.missionaryId) {
        await updateMissionaryProfile({
          missionaryId: profileForm.missionaryId,
          name: trimmedName,
          email: trimmedEmail,
          phoneNumber: trimmedPhoneNumber,
        });
        toast.success("Missionary profile updated");
      } else {
        if (!profileForm.userId) {
          toast.error("Select a ward member first");
          return;
        }

        await createMissionary({
          wardId,
          userId: profileForm.userId,
          name: trimmedName,
          email: trimmedEmail,
          phoneNumber: trimmedPhoneNumber || undefined,
        });
        toast.success("Missionary created");
      }

      setProfileForm(EMPTY_PROFILE_FORM);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCompanionshipSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSavingCompanionship(true);

    try {
      const companionshipId = await saveCompanionship({
        wardId,
        companionshipId: companionshipForm.companionshipId ?? undefined,
        name: companionshipForm.name,
        phoneNumber: companionshipForm.phoneNumber.trim() || undefined,
        status: companionshipForm.status,
      });

      await setCompanionshipMissionaries({
        companionshipId,
        missionaryIds: companionshipForm.missionaryIds,
      });

      toast.success(
        companionshipForm.companionshipId
          ? "Companionship updated"
          : "Companionship created",
      );
      setCompanionshipForm(EMPTY_COMPANIONSHIP_FORM);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingCompanionship(false);
    }
  };

  const handleCalendarGroupSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSavingCalendarGroup(true);

    try {
      const calendarGroupId = await saveCalendarGroup({
        wardId,
        calendarGroupId: calendarGroupForm.calendarGroupId ?? undefined,
        name: calendarGroupForm.name,
        shareToken: calendarGroupForm.shareToken,
        status: calendarGroupForm.status,
      });

      await setCalendarGroupCompanionships({
        calendarGroupId,
        companionshipIds: calendarGroupForm.companionshipIds,
      });

      toast.success(
        calendarGroupForm.calendarGroupId
          ? "Calendar group updated"
          : "Calendar group created",
      );
      setCalendarGroupForm(EMPTY_CALENDAR_GROUP_FORM);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingCalendarGroup(false);
    }
  };

  const handleTransferMissionary = async (missionaryId: Id<"missionaries">) => {
    const destinationWardId = transferWardByMissionaryId[missionaryId];
    if (!destinationWardId) {
      toast.error("Select a destination ward");
      return;
    }

    setTransferingMissionaryId(missionaryId);

    try {
      await transferMissionary({
        missionaryId,
        wardId: destinationWardId as Id<"wards">,
      });
      toast.success("Missionary transferred");
      setTransferWardByMissionaryId((current) => {
        const next = { ...current };
        delete next[missionaryId];
        return next;
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setTransferingMissionaryId(null);
    }
  };

  const companionshipNameById = new Map(
    safeCompanionships.map((companionship) => [companionship._id, companionship.name]),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Missionaries</h1>
        <p className="text-sm text-muted-foreground">
          Manage missionary records, companionships, calendar groups, and pending
          announcements for {ward?.name ?? "this ward"}.
        </p>
      </div>

      {canShowProfilesSection ? (
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Missionary profiles</h2>
          <p className="text-sm text-muted-foreground">
            Create missionary records from active ward members and keep profile details
            current.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {profileForm.missionaryId ? "Edit missionary" : "Add missionary"}
              </CardTitle>
              <CardDescription>
                {canCreateMissionaries
                  ? "Reuse an existing ward member account for the missionary profile."
                  : "You can review missionary profiles available in this ward."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {access.canManageMissionaries ? (
              <form className="space-y-4" onSubmit={handleProfileSubmit}>
                {!profileForm.missionaryId && canCreateMissionaries ? (
                  <div className="space-y-2">
                    <Label htmlFor="missionary-user">Ward member</Label>
                    <Select
                      value={profileForm.userId || undefined}
                      onValueChange={handleMemberSelection}
                    >
                      <SelectTrigger id="missionary-user">
                        <SelectValue placeholder="Select a ward member" />
                      </SelectTrigger>
                      <SelectContent>
                        {safeCandidateMembers.length === 0 ? (
                          <SelectItem value="no-members" disabled>
                            No eligible ward members
                          </SelectItem>
                        ) : (
                          safeCandidateMembers.map((member) => (
                            <SelectItem key={member.userId} value={member.userId}>
                              {member.name ?? member.email ?? "Unnamed member"}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="missionary-name">Name</Label>
                  <Input
                    id="missionary-name"
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="missionary-email">Email</Label>
                  <Input
                    id="missionary-email"
                    type="email"
                    value={profileForm.email}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="missionary-phone">Phone number</Label>
                  <Input
                    id="missionary-phone"
                    value={profileForm.phoneNumber}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        phoneNumber: event.target.value,
                      }))
                    }
                  />
                </div>

                {!canCreateMissionaries && !profileForm.missionaryId ? (
                  <p className="text-sm text-muted-foreground">
                    Creating a missionary also requires missionary assignment management
                    access.
                  </p>
                ) : null}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={
                      isSavingProfile ||
                      (!canCreateMissionaries && profileForm.missionaryId === null)
                    }
                  >
                    {isSavingProfile
                      ? "Saving..."
                      : profileForm.missionaryId
                        ? "Save changes"
                        : "Create missionary"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setProfileForm(EMPTY_PROFILE_FORM)}
                  >
                    Clear
                  </Button>
                </div>
              </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You can view missionary profiles here, but profile updates require
                  missionary management access.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active missionaries</CardTitle>
              <CardDescription>
                {safeMissionaries.length} {safeMissionaries.length === 1 ? "missionary" : "missionaries"} in the current ward.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!access.canViewMissionaries ? (
                <p className="text-sm text-muted-foreground">
                  Missionary viewing permission is required to review current profiles.
                </p>
              ) : safeMissionaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No missionaries assigned.</p>
              ) : (
                <div className="space-y-3">
                  {safeMissionaries.map((missionary) => (
                    <div
                      key={missionary._id}
                      className="flex items-start justify-between gap-4 rounded-lg border p-4"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{missionary.name}</p>
                          <Badge variant="secondary">Active</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{missionary.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {missionary.phoneNumber || "No phone number"}
                        </p>
                      </div>
                      {access.canManageMissionaries ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setProfileForm({
                              missionaryId: missionary._id,
                              userId: "",
                              name: missionary.name,
                              email: missionary.email,
                              phoneNumber: missionary.phoneNumber ?? "",
                            })
                          }
                        >
                          Edit
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
      ) : null}

      {canShowTransfersSection ? (
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Transfers / active assignments</h2>
          <p className="text-sm text-muted-foreground">
            Review active assignments and transfer missionaries to another ward in the
            same stake.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            {safeMissionaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active assignments.</p>
            ) : (
              <div className="space-y-3">
                {safeTransferDestinations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You can only transfer missionaries into wards where you also have
                    missionary assignment management access.
                  </p>
                ) : null}
                {safeMissionaries.map((missionary) => (
                  <div
                    key={missionary._id}
                    className="grid gap-3 rounded-lg border p-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-center"
                  >
                    <div>
                      <p className="font-medium">{missionary.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Assigned to {ward?.name ?? "this ward"}
                        {missionary.activeAssignment
                          ? ` since ${formatDate(missionary.activeAssignment.startedAt)}`
                          : ""}
                      </p>
                    </div>
                    <Select
                      value={transferWardByMissionaryId[missionary._id]}
                      onValueChange={(value) =>
                        setTransferWardByMissionaryId((current) => ({
                          ...current,
                          [missionary._id]: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination ward" />
                      </SelectTrigger>
                      <SelectContent>
                        {safeTransferDestinations.length === 0 ? (
                          <SelectItem value="no-transfer-wards" disabled>
                            No authorized destination wards
                          </SelectItem>
                        ) : (
                          safeTransferDestinations.map((stakeWard) => (
                            <SelectItem key={stakeWard._id} value={stakeWard._id}>
                              {stakeWard.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        transferingMissionaryId === missionary._id ||
                        safeTransferDestinations.length === 0
                      }
                      onClick={() => handleTransferMissionary(missionary._id)}
                    >
                      {transferingMissionaryId === missionary._id
                        ? "Transferring..."
                        : "Transfer"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      ) : null}

      {canShowCompanionshipSection ? (
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Companionships and phone numbers</h2>
          <p className="text-sm text-muted-foreground">
            Maintain companionship records and keep missionary assignments grouped with
            the right contact number.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {companionshipForm.companionshipId
                  ? "Edit companionship"
                  : "Add companionship"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCompanionshipSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="companionship-name">Name</Label>
                  <Input
                    id="companionship-name"
                    value={companionshipForm.name}
                    onChange={(event) =>
                      setCompanionshipForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companionship-phone">Phone number</Label>
                  <Input
                    id="companionship-phone"
                    value={companionshipForm.phoneNumber}
                    onChange={(event) =>
                      setCompanionshipForm((current) => ({
                        ...current,
                        phoneNumber: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={companionshipForm.status}
                    onValueChange={(value: "active" | "inactive") =>
                      setCompanionshipForm((current) => ({
                        ...current,
                        status: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Missionaries</Label>
                  <div className="space-y-2 rounded-lg border p-3">
                    {safeMissionaries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Add missionaries before creating companionships.
                      </p>
                    ) : (
                      safeMissionaries.map((missionary) => {
                        const checked = companionshipForm.missionaryIds.includes(
                          missionary._id,
                        );

                        return (
                          <label
                            key={missionary._id}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span>{missionary.name}</span>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(nextChecked) =>
                                setCompanionshipForm((current) => ({
                                  ...current,
                                  missionaryIds: nextChecked
                                    ? [...current.missionaryIds, missionary._id]
                                    : current.missionaryIds.filter(
                                        (currentId) => currentId !== missionary._id,
                                      ),
                                }))
                              }
                            />
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSavingCompanionship}>
                    {isSavingCompanionship
                      ? "Saving..."
                      : companionshipForm.companionshipId
                        ? "Save changes"
                        : "Create companionship"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCompanionshipForm(EMPTY_COMPANIONSHIP_FORM)}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current companionships</CardTitle>
            </CardHeader>
            <CardContent>
              {safeCompanionships.length === 0 ? (
                <p className="text-sm text-muted-foreground">No companionships yet.</p>
              ) : (
                <div className="space-y-3">
                  {safeCompanionships.map((companionship) => (
                    <div key={companionship._id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{companionship.name}</p>
                            <Badge
                              variant={
                                companionship.status === "active" ? "secondary" : "outline"
                              }
                            >
                              {companionship.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {companionship.phoneNumber || "No phone number"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {companionship.missionaryIds.length === 0
                              ? "No missionaries assigned"
                              : companionship.missionaryIds
                                  .map(
                                    (missionaryId) =>
                                      missionaryById.get(missionaryId)?.name ?? "Unknown missionary",
                                  )
                                  .join(", ")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCompanionshipForm({
                              companionshipId: companionship._id,
                              name: companionship.name,
                              phoneNumber: companionship.phoneNumber ?? "",
                              status: companionship.status,
                              missionaryIds: companionship.missionaryIds,
                            })
                          }
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
      ) : null}

      {canShowCalendarGroupsSection || canShowAnnouncementsSection ? (
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            {canShowCalendarGroupsSection && canShowAnnouncementsSection
              ? "Calendar groups plus pending missionary announcements"
              : canShowCalendarGroupsSection
                ? "Calendar groups"
                : "Pending missionary announcements"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {canShowCalendarGroupsSection && canShowAnnouncementsSection
              ? "Configure consolidated calendars and work through the missionary review queue."
              : canShowCalendarGroupsSection
                ? "Configure consolidated calendars for missionary companionships."
                : "Review missionary announcements before they reach the ward feed."}
          </p>
        </div>

        {canShowCalendarGroupsSection ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {calendarGroupForm.calendarGroupId
                  ? "Edit calendar group"
                  : "Add calendar group"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCalendarGroupSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="calendar-group-name">Name</Label>
                  <Input
                    id="calendar-group-name"
                    value={calendarGroupForm.name}
                    onChange={(event) =>
                      setCalendarGroupForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calendar-group-token">Share token</Label>
                  <Input
                    id="calendar-group-token"
                    value={calendarGroupForm.shareToken}
                    onChange={(event) =>
                      setCalendarGroupForm((current) => ({
                        ...current,
                        shareToken: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={calendarGroupForm.status}
                    onValueChange={(value: "active" | "inactive") =>
                      setCalendarGroupForm((current) => ({
                        ...current,
                        status: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Included companionships</Label>
                  <div className="space-y-2 rounded-lg border p-3">
                    {safeCompanionships.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Create companionships before building a calendar group.
                      </p>
                    ) : (
                      safeCompanionships.map((companionship) => {
                        const checked = calendarGroupForm.companionshipIds.includes(
                          companionship._id,
                        );

                        return (
                          <label
                            key={companionship._id}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span>{companionship.name}</span>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(nextChecked) =>
                                setCalendarGroupForm((current) => ({
                                  ...current,
                                  companionshipIds: nextChecked
                                    ? [...current.companionshipIds, companionship._id]
                                    : current.companionshipIds.filter(
                                        (currentId) => currentId !== companionship._id,
                                      ),
                                }))
                              }
                            />
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSavingCalendarGroup}>
                    {isSavingCalendarGroup
                      ? "Saving..."
                      : calendarGroupForm.calendarGroupId
                        ? "Save changes"
                        : "Create group"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCalendarGroupForm(EMPTY_CALENDAR_GROUP_FORM)}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calendar groups</CardTitle>
            </CardHeader>
            <CardContent>
              {safeCalendarGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No calendar groups yet.</p>
              ) : (
                <div className="space-y-3">
                  {safeCalendarGroups.map((group) => (
                    <div key={group._id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{group.name}</p>
                            <Badge
                              variant={group.status === "active" ? "secondary" : "outline"}
                            >
                              {group.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Share token: <span className="font-mono">{group.shareToken}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {group.companionshipIds.length === 0
                              ? "No companionships included"
                              : group.companionshipIds
                                  .map(
                                    (companionshipId) =>
                                      companionshipNameById.get(companionshipId) ??
                                      "Unknown companionship",
                                  )
                                  .join(", ")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCalendarGroupForm({
                              calendarGroupId: group._id,
                              name: group.name,
                              shareToken: group.shareToken,
                              status: group.status,
                              companionshipIds: group.companionshipIds,
                            })
                          }
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        ) : null}

        {canShowAnnouncementsSection ? (
          <PendingMissionaryAnnouncementsSection wardId={wardId} />
        ) : null}
      </section>
      ) : null}
    </div>
  );
}

function PendingMissionaryAnnouncementsSection({ wardId }: { wardId: WardId }) {
  const pendingAnnouncements = usePaginatedQuery(
    api.missionaries.listPendingAnnouncements,
    { wardId },
    { initialNumItems: 10 },
  );
  const approveAnnouncement = useMutation(api.missionaries.approveAnnouncement);
  const rejectAnnouncement = useMutation(api.missionaries.rejectAnnouncement);
  const [approvalNotesByPostId, setApprovalNotesByPostId] = useState<Record<string, string>>(
    {},
  );
  const [rejectionNotesByPostId, setRejectionNotesByPostId] = useState<Record<string, string>>(
    {},
  );
  const [actingAnnouncementId, setActingAnnouncementId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pending missionary announcements</CardTitle>
        <CardDescription>
          Approve or reject missionary announcements before they reach the ward feed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingAnnouncements.status === "LoadingFirstPage" ? (
          <p className="text-sm text-muted-foreground">Loading announcements...</p>
        ) : pendingAnnouncements.results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No missionary announcements are pending review.
          </p>
        ) : (
          <div className="space-y-4">
            {pendingAnnouncements.results.map((post) => (
              <div key={post._id} className="rounded-lg border p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{post.title}</p>
                    <Badge variant="secondary">Pending review</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    By {post.author?.name ?? "Unknown"} on {formatDate(post._creationTime)}
                  </p>
                </div>
                <div
                  className="prose prose-sm mt-3 max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(post.content),
                  }}
                />
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`approve-${post._id}`}>Approval note</Label>
                    <Textarea
                      id={`approve-${post._id}`}
                      value={approvalNotesByPostId[post._id] ?? ""}
                      onChange={(event) =>
                        setApprovalNotesByPostId((current) => ({
                          ...current,
                          [post._id]: event.target.value,
                        }))
                      }
                      placeholder="Optional approval note"
                    />
                    <Button
                      type="button"
                      disabled={actingAnnouncementId === post._id}
                      onClick={async () => {
                        setActingAnnouncementId(post._id);

                        try {
                          await approveAnnouncement({
                            postId: post._id,
                            notes: approvalNotesByPostId[post._id]?.trim() || undefined,
                          });
                          toast.success("Announcement approved");
                        } catch (error) {
                          toast.error(getErrorMessage(error));
                        } finally {
                          setActingAnnouncementId(null);
                        }
                      }}
                    >
                      Approve
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`reject-${post._id}`}>Rejection reason</Label>
                    <Textarea
                      id={`reject-${post._id}`}
                      value={rejectionNotesByPostId[post._id] ?? ""}
                      onChange={(event) =>
                        setRejectionNotesByPostId((current) => ({
                          ...current,
                          [post._id]: event.target.value,
                        }))
                      }
                      placeholder="Required when rejecting"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={
                        actingAnnouncementId === post._id ||
                        !rejectionNotesByPostId[post._id]?.trim()
                      }
                      onClick={async () => {
                        const rejectionNotes =
                          rejectionNotesByPostId[post._id]?.trim() ?? "";

                        if (!rejectionNotes) {
                          return;
                        }

                        setActingAnnouncementId(post._id);

                        try {
                          await rejectAnnouncement({
                            postId: post._id,
                            notes: rejectionNotes,
                          });
                          toast.success("Announcement rejected");
                        } catch (error) {
                          toast.error(getErrorMessage(error));
                        } finally {
                          setActingAnnouncementId(null);
                        }
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {pendingAnnouncements.status === "CanLoadMore" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => pendingAnnouncements.loadMore(10)}
              >
                Load more
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
