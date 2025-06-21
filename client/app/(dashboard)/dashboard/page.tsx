import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div
      className={cn(
        "min-h-screen w-full flex flex-col items-center justify-center",
        "bg-gradient-to-br from-[#e8eaec] to-[#8892aa]"
      )}
    >
      <div className="w-full max-w-6xl mx-auto my-8 rounded-3xl shadow-xl bg-white/50 flex flex-col min-h-[80vh]">
        {/* Header */}
        <header className="w-full px-8 py-6 flex items-center justify-between backdrop-blur-md rounded-t-3xl">
          {/* Logo and nav */}
          <div className="flex items-center gap-8">
            <div className="text-2xl font-bold tracking-tight text-orange-600 flex items-center gap-2">
              <span className="bg-orange-100 rounded-full p-2">
                {/* Placeholder for logo icon */}
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#FF6A00" /></svg>
              </span>
              TWISTY
            </div>
            <nav className="hidden md:flex gap-6 text-gray-700 font-medium">
              <a href="#" className="hover:text-orange-600 transition-colors">Home</a>
              <a href="#" className="hover:text-orange-600 transition-colors">Messages</a>
              <a href="#" className="hover:text-orange-600 transition-colors">Discover</a>
              <a href="#" className="hover:text-orange-600 transition-colors">Wallet</a>
              <a href="#" className="hover:text-orange-600 transition-colors">Projects</a>
            </nav>
          </div>
          {/* Create Session button and user */}
          <div className="flex items-center gap-6">
            <Button asChild variant="default" size="lg">
              <Link href="/sessions/new">Create a Session</Link>
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="w-9 h-9">
                {/* Placeholder for user avatar */}
              </Avatar>
            </Button>
          </div>
        </header>
        {/* Main content placeholder */}
        <main className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          {/* Content will go here */}
        </main>
      </div>
    </div>
  );
}