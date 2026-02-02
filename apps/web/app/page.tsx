import {
  withAuth,
  getSignInUrl,
  getSignUpUrl,
  signOut,
} from "@workos-inc/authkit-nextjs";

export default async function Home() {
  const { user } = await withAuth();

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-3xl font-bold">Welcome to GospelSmarts</h1>
        <p className="text-lg text-gray-600">Please sign in to continue</p>
        <div className="flex gap-4">
          <a
            href={await getSignInUrl()}
            className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Log in
          </a>
          <a
            href={await getSignUpUrl()}
            className="rounded-md border border-gray-300 px-6 py-2 hover:bg-gray-100"
          >
            Sign up
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Welcome, {user.email}</h1>
      <p className="text-lg text-gray-600">You are signed in</p>
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
