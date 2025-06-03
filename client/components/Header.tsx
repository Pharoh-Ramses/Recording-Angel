"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Session } from "next-auth";
import config from "@/lib/config";
import { Button } from "@/components/ui/button";

const Header = ({ session }: { session: Session | null }) => {
  const pathname = usePathname();
  const imageUrl = session?.user?.profilePicture
    ? `${config.env.imagekit.urlEndpoint}/tr:h-100,w-100,c-at_max/${session.user.profilePicture}`
    : "";

  return (
    <header className="my-10 flex justify-between gap-5">
      <Link href="/">
        <h1 className="text-2xl font-semibold text-white">Recording Angel</h1>
      </Link>
      <ul className="flex flex-row items-center gap-8">
        <li>
          <Link
            href="/how"
            className={cn(
              "text-base cursor-pointer capitalize",
              pathname === "/how" ? "text-light-200" : "text-light-100",
            )}
          >
            How It Works
          </Link>
        </li>
        <li>
          <Link
            href="/features"
            className={cn(
              "text-base cursor-pointer capitalize",
              pathname === "/features" ? "text-light-200" : "text-light-100",
            )}
          >
            Features
          </Link>
        </li>
        <li>
          <Link
            href="/missions"
            className={cn(
              "text-base cursor-pointer capitalize",
              pathname === "/missions" ? "text-light-200" : "text-light-100",
            )}
          >
            For Missions
          </Link>
        </li>

        {session ? (
          <>
            <li>
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  className="text-light-100 hover:text-light-200"
                >
                  Dashboard
                </Button>
              </Link>
            </li>
            <li>
              <Link href="/my-profile">
                <Avatar>
                  <AvatarImage src={imageUrl} alt="profile picture" />
                  <AvatarFallback>{session.user.name}</AvatarFallback>
                </Avatar>
              </Link>
            </li>
          </>
        ) : (
          <li>
            <Link href="/sign-in">
              <Button className="bg-primary text-dark-100 hover:bg-primary/90">
                Sign In
              </Button>
            </Link>
          </li>
        )}
      </ul>
    </header>
  );
};

export default Header;
