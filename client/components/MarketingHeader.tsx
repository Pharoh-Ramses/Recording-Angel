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
import { navigationLinks } from "@/constants";

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
        {navigationLinks
          .filter((link) => !link.img) // Exclude profile link which is handled separately
          .map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "text-base cursor-pointer capitalize",
                  pathname === link.href
                    ? "text-light-200"
                    : "text-light-100"
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}

        {session ? (
          <>
            <li>
              <Link
                href="/dashboard"
                className={cn(
                  "text-base cursor-pointer capitalize",
                  pathname === "/dashboard"
                    ? "text-light-200"
                    : "text-light-100"
                )}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/my-profile">
                <Avatar>
                  <AvatarImage src={session.user.profilePicture} alt="profile picture" />
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
