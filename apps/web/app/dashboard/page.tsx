import { withAuth, getSignInUrl, signOut } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { user } = await withAuth();

  if (!user) {
    redirect(await getSignInUrl());
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-lg text-gray-600">
        Welcome, <span className="font-medium">{user.email}</span>
      </p>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <button
          type="submit"
          className="rounded-md bg-red-600 px-6 py-2 text-white hover:bg-red-700"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
