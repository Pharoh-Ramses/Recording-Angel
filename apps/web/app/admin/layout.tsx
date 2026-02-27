"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  Users,
  Shield,
  FileText,
  BarChart3,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { Suspense } from "react";

const navItems = [
  {
    href: "/admin/members",
    label: "Members",
    icon: Users,
    permissions: ["member:approve", "member:view"],
  },
  {
    href: "/admin/moderation",
    label: "Moderation",
    icon: Shield,
    permissions: ["post:approve"],
  },
  {
    href: "/admin/posts",
    label: "Posts",
    icon: FileText,
    permissions: ["post:approve"],
  },
  {
    href: "/admin/polls",
    label: "Polls",
    icon: BarChart3,
    permissions: ["post:approve"],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    permissions: ["moderation:configure"],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </Suspense>
  );
}

function AdminLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const wardId = searchParams.get("ward") as Id<"wards"> | null;

  const ward = useQuery(api.wards.getById, wardId ? { wardId } : "skip");
  const permissions = useQuery(
    api.roles.myPermissions,
    wardId ? { wardId } : "skip"
  );

  if (!wardId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No ward selected.</p>
      </div>
    );
  }

  const backHref = ward?.stake
    ? `/stake/${ward.stake.slug}/ward/${ward.slug}`
    : "/";

  const visibleNav = navItems.filter((item) =>
    item.permissions.some((p) => permissions?.includes(p as any))
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-background flex flex-col h-screen sticky top-0">
        <div className="p-4 border-b border-border">
          <Link
            href={backHref}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to ward
          </Link>
          <h1 className="font-semibold text-lg truncate">
            {ward?.name ?? "Admin"}
          </h1>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {visibleNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={`${item.href}?ward=${wardId}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <UserButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
