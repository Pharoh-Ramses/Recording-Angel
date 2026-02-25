"use client";

import { Id } from "@/convex/_generated/dataModel";
import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { BottomTabBar } from "./bottom-tab-bar";

interface AppShellProps {
  wardId?: Id<"wards">;
  stakeId?: Id<"stakes">;
  typeFilter?: string;
  onTypeFilterChange: (type: string | undefined) => void;
  children: React.ReactNode;
}

export function AppShell({
  wardId,
  stakeId,
  typeFilter,
  onTypeFilterChange,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen bg-background">
      <LeftSidebar
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
      />

      {/* Center feed column */}
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>

      <RightSidebar
        wardId={wardId}
        stakeId={stakeId}
        onShowEvents={() => onTypeFilterChange("event")}
      />

      <BottomTabBar
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
      />
    </div>
  );
}
