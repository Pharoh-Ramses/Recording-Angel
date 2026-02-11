"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@gospelsmarts/backend/convex/_generated/api";
import type { Id } from "@gospelsmarts/backend/convex/_generated/dataModel";
import Link from "next/link";

export default function MembershipPage() {
  const memberships = useQuery(api.memberships.myMemberships);
  const leaveWard = useMutation(api.memberships.leaveWard);
  const [leavingWardId, setLeavingWardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = async (wardId: string) => {
    setError(null);
    setLeavingWardId(wardId);
    try {
      await leaveWard({ wardId: wardId as Id<"wards"> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave ward");
    } finally {
      setLeavingWardId(null);
    }
  };

  if (memberships === undefined) {
    return (
      <main className="flex min-h-screen flex-col items-center p-8">
        <div className="w-full max-w-4xl">
          <p>Loading memberships...</p>
        </div>
      </main>
    );
  }

  const wardMemberships = memberships.filter((m) => m.orgType === "ward");
  const stakeMemberships = memberships.filter((m) => m.orgType === "stake");

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-4xl">
        <Link
          href="/dashboard"
          className="text-gray-600 hover:underline mb-4 inline-block"
        >
          &larr; Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Memberships</h1>
          <Link
            href="/dashboard/join"
            className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
          >
            Join a Ward
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {memberships.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              You haven&apos;t joined any wards or stakes yet.
            </p>
            <Link
              href="/dashboard/join"
              className="text-green-600 hover:underline"
            >
              Find and join a ward
            </Link>
          </div>
        ) : (
          <>
            {/* Ward Memberships */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Wards</h2>
              {wardMemberships.length === 0 ? (
                <p className="text-gray-500">No ward memberships.</p>
              ) : (
                <ul className="space-y-3">
                  {wardMemberships.map((m) => (
                    <li
                      key={m._id}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-medium">
                          {m.org?.name ?? "Unknown Ward"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Stake: {m.parentStake?.name ?? "Unknown Stake"}
                        </p>
                        <span
                          className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                            m.role === "leader"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {m.role}
                        </span>
                      </div>
                      {m.role === "member" && (
                        <button
                          onClick={() => handleLeave(m.orgId)}
                          disabled={leavingWardId === m.orgId}
                          className="rounded-md bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 disabled:opacity-50"
                        >
                          {leavingWardId === m.orgId ? "Leaving..." : "Leave"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Stake Memberships */}
            <section>
              <h2 className="text-xl font-semibold mb-4">Stakes</h2>
              {stakeMemberships.length === 0 ? (
                <p className="text-gray-500">No stake memberships.</p>
              ) : (
                <ul className="space-y-3">
                  {stakeMemberships.map((m) => (
                    <li key={m._id} className="border rounded-lg p-4">
                      <div>
                        <h3 className="font-medium">
                          {m.org?.name ?? "Unknown Stake"}
                        </h3>
                        <span
                          className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                            m.role === "leader"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {m.role}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
