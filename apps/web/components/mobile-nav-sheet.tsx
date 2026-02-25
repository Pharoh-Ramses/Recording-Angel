"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  LayoutList,
  Megaphone,
  CalendarDays,
  ShoppingBag,
  Shield,
  Users,
  Globe,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

const FEED_FILTERS = [
  { label: "All", value: undefined, icon: LayoutList },
  { label: "Announcements", value: "announcement", icon: Megaphone },
  { label: "Events", value: "event", icon: CalendarDays },
  { label: "Classifieds", value: "classifieds", icon: ShoppingBag },
] as const;

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  ko: "한국어",
  ja: "日本語",
  tl: "Tagalog",
  to: "Lea fakatonga",
  sm: "Gagana Samoa",
};

interface MobileNavSheetProps {
  typeFilter?: string;
  onTypeFilterChange: (type: string | undefined) => void;
}

export function MobileNavSheet({
  typeFilter,
  onTypeFilterChange,
}: MobileNavSheetProps) {
  const params = useParams<{ stakeSlug: string; wardSlug: string }>();
  const stake = useQuery(api.stakes.getBySlug, { slug: params.stakeSlug });
  const wards = useQuery(
    api.wards.listByStake,
    stake ? { stakeId: stake._id } : "skip",
  );
  const activeWard = useQuery(
    api.wards.getBySlug,
    stake && params.wardSlug
      ? { slug: params.wardSlug, stakeId: stake._id }
      : "skip",
  );
  const permissions = useQuery(
    api.roles.myPermissions,
    activeWard ? { wardId: activeWard._id } : "skip",
  );
  const currentUser = useQuery(api.users.currentUser);
  const setPreferredLanguage = useMutation(api.users.setPreferredLanguage);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs text-muted-foreground transition-colors">
          <Menu className="h-5 w-5" />
          <span>Menu</span>
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        {/* Brand header */}
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-left">
            <span className="font-bold text-lg">ourStake</span>
            <span className="block text-xs font-normal text-muted-foreground truncate">
              {stake?.name}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Feed filters */}
          <div className="px-2 pt-4">
            <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Feed
            </p>
            <nav className="space-y-0.5">
              {FEED_FILTERS.map((filter) => {
                const isActive = typeFilter === filter.value;
                const Icon = filter.icon;
                return (
                  <SheetClose key={filter.label} asChild>
                    <button
                      onClick={() => onTypeFilterChange(filter.value)}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {filter.label}
                    </button>
                  </SheetClose>
                );
              })}
            </nav>
          </div>

          {/* Ward navigation */}
          <div className="px-2 pt-6">
            <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Wards
            </p>
            <nav className="space-y-0.5">
              {wards?.map((ward) => {
                const isActive = ward.slug === params.wardSlug;
                return (
                  <SheetClose key={ward._id} asChild>
                    <Link
                      href={`/stake/${params.stakeSlug}/ward/${ward.slug}`}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          isActive ? "bg-primary" : "bg-border",
                        )}
                      />
                      {ward.name}
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>
          </div>

          {/* Admin links */}
          {(permissions?.includes("member:approve") ||
            permissions?.includes("post:approve")) && (
            <div className="px-2 pt-6">
              <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin
              </p>
              <nav className="space-y-0.5">
                {permissions?.includes("member:approve") && (
                  <SheetClose asChild>
                    <Link
                      href={`/stake/${params.stakeSlug}/ward/${params.wardSlug}/members`}
                      className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                    >
                      <Users className="h-4 w-4" />
                      Members
                    </Link>
                  </SheetClose>
                )}
                {permissions?.includes("post:approve") && activeWard && (
                  <SheetClose asChild>
                    <Link
                      href={`/moderation?ward=${activeWard._id}`}
                      className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      Moderation
                    </Link>
                  </SheetClose>
                )}
              </nav>
            </div>
          )}

          {/* Language selector */}
          {stake?.languages && stake.languages.length > 1 && (
            <div className="px-2 pt-6">
              <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Language
              </p>
              <nav className="space-y-0.5">
                {stake.languages.map((lang) => {
                  const isActive =
                    (currentUser?.preferredLanguage ?? "en") === lang;
                  return (
                    <SheetClose key={lang} asChild>
                      <button
                        onClick={() => setPreferredLanguage({ language: lang })}
                        className={cn(
                          "flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm transition-colors",
                          isActive
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                        )}
                      >
                        <Globe className="h-4 w-4" />
                        {LANGUAGE_LABELS[lang] ?? lang.toUpperCase()}
                      </button>
                    </SheetClose>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Theme toggle */}
          <div className="px-2 pt-6 pb-2">
            <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Appearance
            </p>
            <ThemeToggle />
          </div>
        </div>

        {/* User section */}
        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3">
            <UserButton />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {currentUser?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {currentUser?.email}
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
