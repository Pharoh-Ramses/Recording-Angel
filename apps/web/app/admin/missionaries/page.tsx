"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { MissionaryAdminPage } from "@/components/missionary/missionary-admin-page";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminMissionariesPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <AdminMissionariesContent />
    </Suspense>
  );
}

function AdminMissionariesContent() {
  const searchParams = useSearchParams();
  const wardId = searchParams.get("ward") as Id<"wards"> | null;

  if (!wardId) {
    return <p className="text-muted-foreground">No ward selected.</p>;
  }

  return <MissionaryAdminPage wardId={wardId} />;
}
