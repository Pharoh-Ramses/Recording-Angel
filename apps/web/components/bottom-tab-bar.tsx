"use client";

import { useParams, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Home, LayoutList, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomTabBar() {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const pathname = usePathname();

  const stake = useQuery(
    api.stakes.getBySlug,
    params.stakeSlug ? { slug: params.stakeSlug } : "skip"
  );
  const ward = useQuery(
    api.wards.getBySlug,
    params.wardSlug && stake
      ? { slug: params.wardSlug, stakeId: stake._id }
      : "skip"
  );
  const permissions = useQuery(
    api.roles.myPermissions,
    ward ? { wardId: ward._id } : "skip"
  );

  const tabs = [
    {
      label: "Feed",
      icon: Home,
      href: params.wardSlug
        ? `/stake/${params.stakeSlug}/ward/${params.wardSlug}`
        : `/stake/${params.stakeSlug}`,
      active: pathname?.includes("/ward/") && !pathname?.includes("/members"),
    },
    {
      label: "Wards",
      icon: LayoutList,
      href: `/stake/${params.stakeSlug}`,
      active: pathname === `/stake/${params.stakeSlug}`,
    },
    ...(permissions?.includes("post:approve") && ward
      ? [
          {
            label: "Moderate",
            icon: Shield,
            href: `/moderation?ward=${ward._id}`,
            active: pathname?.startsWith("/moderation"),
          },
        ]
      : []),
    {
      label: "Profile",
      icon: User,
      href: "/settings",
      active: pathname === "/settings",
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                tab.active
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
