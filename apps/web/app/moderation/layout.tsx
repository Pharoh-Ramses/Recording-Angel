"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ModerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="font-semibold">Moderation</span>
            <Link href="/moderation">
              <Button variant="ghost" size="sm">
                Queue
              </Button>
            </Link>
            <Link href="/moderation/polls">
              <Button variant="ghost" size="sm">
                Polls
              </Button>
            </Link>
            <Link href="/moderation/settings">
              <Button variant="ghost" size="sm">
                Settings
              </Button>
            </Link>
          </div>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
