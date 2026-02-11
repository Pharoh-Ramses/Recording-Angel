"use client";

import { useQuery } from "convex/react";
import { api } from "@gospelsmarts/backend/convex/_generated/api";
import Link from "next/link";

export default function StakesPage() {
  const stakes = useQuery(api.stakes.listMyStakes);

  if (stakes === undefined) {
    return (
      <main className="flex min-h-screen flex-col items-center p-8">
        <div className="w-full max-w-4xl">
          <p>Loading stakes...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Stakes</h1>
          <Link
            href="/dashboard/stakes/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Create Stake
          </Link>
        </div>

        {stakes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              You haven&apos;t created any stakes yet.
            </p>
            <Link
              href="/dashboard/stakes/new"
              className="text-blue-600 hover:underline"
            >
              Create your first stake
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {stakes.map(
              (stake) =>
                stake && (
                  <li
                    key={stake._id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <Link href={`/dashboard/stakes/${stake._id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-medium">{stake.name}</h2>
                          <p className="text-sm text-gray-500">
                            Languages:{" "}
                            {stake.supportedLanguages.join(", ")}
                          </p>
                        </div>
                        <span className="text-gray-400">&rarr;</span>
                      </div>
                    </Link>
                  </li>
                ),
            )}
          </ul>
        )}

        <Link
          href="/dashboard"
          className="inline-block mt-6 text-gray-600 hover:underline"
        >
          &larr; Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
