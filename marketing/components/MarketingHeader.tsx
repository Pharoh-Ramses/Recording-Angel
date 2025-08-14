"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { navigationLinks } from "@/constants";

const Header = () => {
  const pathname = usePathname();

  return (
    <header className="my-10 flex justify-between gap-5">
      <Link href="/">
        <h1 className="text-2xl font-semibold text-white">Recording Angel</h1>
      </Link>
      <ul className="flex flex-row items-center gap-8">
        {navigationLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                "text-base cursor-pointer capitalize",
                pathname === link.href ? "text-light-200" : "text-light-100",
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
        <li>
          <Button className="bg-primary text-dark-100 hover:bg-primary/90">
            Get Started
          </Button>
        </li>
      </ul>
    </header>
  );
};

export default Header;
