import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">ourStake</h1>
      <p className="text-muted-foreground text-center max-w-md">
        A community platform for your stake and ward. Stay connected with
        announcements, events, and more.
      </p>
      <SignedOut>
        <SignInButton mode="modal">
          <Button size="lg">Sign In to Get Started</Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <Link href="/join">
          <Button size="lg">Go to My Ward</Button>
        </Link>
      </SignedIn>
    </div>
  );
}
