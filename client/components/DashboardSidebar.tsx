"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Session } from 'next-auth';
import config from '@/lib/config';
import { Button } from '@/components/ui/button';
import { handleSignOut } from '@/lib/actions/auth';
import { DashboardSidebarLinks } from '@/constants';
import { 
  RiHomeSmileFill, 
  RiVideoLine, 
  RiUserLine, 
  RiLogoutBoxRLine,
  RiListUnordered,
  RiAddLine,
  RiPlayCircleLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiArrowLeftLine
} from 'react-icons/ri';

const DashboardSidebar = ({ session }: { session: Session }) => {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const imageUrl = session?.user?.profilePicture
    ? `${config.env.imagekit.urlEndpoint}/tr:h-100,w-100,c-at_max/${session.user.profilePicture}`
    : "";

  // Filter out "My Profile" from main navigation since it's going to the bottom
  const mainNavLinks = DashboardSidebarLinks.filter(link => link.href !== '/my-profile');

  // Icon mapping
  const iconMap = {
    RiHomeSmileFill: RiHomeSmileFill,
    RiVideoLine: RiVideoLine,
    RiUserLine: RiUserLine,
    RiListUnordered: RiListUnordered,
    RiAddLine: RiAddLine,
    RiPlayCircleLine: RiPlayCircleLine,
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap];
    return IconComponent ? <IconComponent className="text-lg" /> : null;
  };

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const isMenuExpanded = (label: string) => expandedMenus.includes(label);
  const isActiveMenu = (link: any) => {
    if (link.href) {
      return pathname === link.href;
    }
    if (link.subMenus) {
      return link.subMenus.some((subMenu: any) => pathname === subMenu.href);
    }
    return false;
  };

  return (
    <div className="w-64 h-[calc(100vh-2rem)] fixed left-4 top-4 bg-white/30 backdrop-blur-md border border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.3)] rounded-2xl p-6 flex flex-col">
      {/* Back to Home Button */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-transparent p-1 h-auto text-xs"
          asChild
        >
          <Link href="/">
            <RiArrowLeftLine className="text-sm mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Logo/Brand */}
      <div className="mb-8">
        <Link href="/">
          <h1 className="text-xl font-bold text-gray-800">Recording Angel</h1>
        </Link>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1">
        <ul className="space-y-2">
          {mainNavLinks.map((link) => (
            <li key={link.label}>
              {link.expandable ? (
                <div>
                  {/* Expandable Menu Header */}
                  <button
                    onClick={() => toggleMenu(link.label)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 relative",
                      isActiveMenu(link)
                        ? "bg-white/20 text-gray-900 shadow-[0_0_10px_rgba(251,191,36,0.5)] border-2 border-amber-400"
                        : "text-gray-700 hover:bg-white/20 hover:text-gray-900"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      {getIcon(link.iconName)}
                      <span>{link.label}</span>
                    </div>
                    {isMenuExpanded(link.label) ? (
                      <RiArrowDownSLine className="text-lg" />
                    ) : (
                      <RiArrowRightSLine className="text-lg" />
                    )}
                  </button>
                  
                  {/* Sub-menus */}
                  {isMenuExpanded(link.label) && (
                    <ul className="mt-2 ml-6 space-y-1">
                      {link.subMenus?.map((subMenu) => (
                        <li key={subMenu.href}>
                          <Link
                            href={subMenu.href}
                            className={cn(
                              "flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative",
                              pathname === subMenu.href
                                ? "bg-white/20 text-gray-900 shadow-[0_0_10px_rgba(251,191,36,0.5)] border-2 border-amber-400"
                                : "text-gray-700 hover:bg-white/20 hover:text-gray-900"
                            )}
                          >
                            {getIcon(subMenu.iconName)}
                            <span>{subMenu.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  href={link.href!}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 relative",
                    pathname === link.href
                      ? "bg-white/20 text-gray-900 shadow-[0_0_10px_rgba(251,191,36,0.5)] border-2 border-amber-400"
                      : "text-gray-700 hover:bg-white/20 hover:text-gray-900"
                  )}
                >
                  {getIcon(link.iconName)}
                  <span>{link.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Separator */}
      <div className="border-t border-white/30 my-4"></div>

      {/* User Section */}
      <div className="space-y-3">
        

        {/* My Profile Link */}
        <Link
          href="/my-profile"
          className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 relative",
            pathname === "/my-profile"
              ? "bg-white/20 text-gray-900 shadow-[0_0_10px_rgba(251,191,36,0.5)] border-2 border-amber-400"
              : "text-gray-700 hover:bg-white/20 hover:text-gray-900"
          )}
        >
          <RiUserLine className="text-lg" />
          <span>My Profile</span>
        </Link>

        {/* Logout */}
        <form action={handleSignOut}>
          <Button 
            variant="outline" 
            className="w-full justify-start bg-white/20 border-white/30 text-gray-700 hover:bg-white/30"
            type="submit"
          >
            <RiLogoutBoxRLine className="text-lg mr-3" />
            Logout
          </Button>
        </form>

        {/* User Profile */}
        <div className="p-4 bg-white/20 rounded-lg">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={session.user.profilePicture} alt="profile picture" />
              <AvatarFallback className="bg-white border-2 border-navy-600 text-navy-600 font-semibold text-sm">
                {session.user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSidebar; 