import { withAuth, signOut } from "@workos-inc/authkit-nextjs";
import Link from "next/link";

export default async function DashboardPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-4xl">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                type="submit"
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Stakes</h2>
            <Link
              href="/dashboard/stakes/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Create Stake
            </Link>
          </div>
          <p className="text-gray-600 mb-4">
            Manage your stakes and wards below.
          </p>
          <Link
            href="/dashboard/stakes"
            className="text-blue-600 hover:underline"
          >
            View all stakes &rarr;
          </Link>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Membership</h2>
          <p className="text-gray-600 mb-4">
            Find a ward to join or view your current memberships.
          </p>
          <div className="flex gap-4">
            <Link
              href="/dashboard/join"
              className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
            >
              Find and Join a Ward
            </Link>
            <Link
              href="/dashboard/membership"
              className="text-green-600 hover:underline flex items-center"
            >
              My Memberships &rarr;
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
