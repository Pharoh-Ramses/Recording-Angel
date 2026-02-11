"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@gospelsmarts/backend/convex/_generated/api";
import type { Id } from "@gospelsmarts/backend/convex/_generated/dataModel";
import Link from "next/link";

export default function JoinPage() {
  const [stakeSearch, setStakeSearch] = useState("");
  const [selectedStakeId, setSelectedStakeId] = useState<Id<"stakes"> | null>(
    null,
  );
  const [joinedWard, setJoinedWard] = useState<{
    wardName: string;
    stakeName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joiningWardId, setJoiningWardId] = useState<Id<"wards"> | null>(null);

  const stakes = useQuery(api.stakes.search, { query: stakeSearch });
  const wards = useQuery(
    api.wards.searchByStake,
    selectedStakeId
      ? { stakeId: selectedStakeId, query: "" }
      : "skip",
  );
  const joinWard = useMutation(api.memberships.joinWard);
  const myMemberships = useQuery(api.memberships.myMemberships);

  const selectedStake = stakes?.find((s) => s._id === selectedStakeId);

  // Build a set of ward IDs the user already belongs to, with their role
  const wardMembershipMap = new Map<string, string>();
  if (myMemberships) {
    for (const m of myMemberships) {
      if (m.orgType === "ward") {
        wardMembershipMap.set(m.orgId, m.role);
      }
    }
  }

  const handleJoin = async (wardId: Id<"wards">, wardName: string) => {
    setError(null);
    setJoiningWardId(wardId);
    try {
      await joinWard({ wardId });
      setJoinedWard({
        wardName,
        stakeName: selectedStake?.name ?? "Unknown Stake",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join ward");
    } finally {
      setJoiningWardId(null);
    }
  };

  // Show success confirmation
  if (joinedWard) {
    return (
      <main className="flex min-h-screen flex-col items-center p-8">
        <div className="w-full max-w-2xl">
          <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
            <h1 className="text-2xl font-bold text-green-800 mb-4">
              Welcome!
            </h1>
            <p className="text-green-700 mb-2">
              You have joined <strong>{joinedWard.wardName}</strong>
            </p>
            <p className="text-green-600 text-sm mb-6">
              in {joinedWard.stakeName}
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/dashboard/membership"
                className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
              >
                View My Memberships
              </Link>
              <button
                onClick={() => {
                  setJoinedWard(null);
                  setSelectedStakeId(null);
                  setStakeSearch("");
                }}
                className="px-4 py-2 text-green-600 hover:underline text-sm"
              >
                Join Another Ward
              </button>
            </div>
          </div>

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

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-2xl">
        <Link
          href="/dashboard"
          className="text-gray-600 hover:underline mb-4 inline-block"
        >
          &larr; Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-6">Find and Join a Ward</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Search for a stake */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">
            {selectedStakeId ? "1. Stake Selected" : "1. Search for a Stake"}
          </h2>

          {!selectedStakeId ? (
            <>
              <input
                type="text"
                value={stakeSearch}
                onChange={(e) => setStakeSearch(e.target.value)}
                placeholder="Type a stake name to search..."
                className="w-full border rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {stakes === undefined ? (
                <p className="text-gray-500">Loading stakes...</p>
              ) : stakes.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">
                    {stakeSearch
                      ? "No stakes found matching your search."
                      : "No stakes have been created yet."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {stakes.map((stake) => (
                    <li key={stake._id}>
                      <button
                        onClick={() => {
                          setSelectedStakeId(stake._id);
                          setError(null);
                        }}
                        className="w-full text-left border rounded-lg p-4 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <h3 className="font-medium">{stake.name}</h3>
                        <p className="text-sm text-gray-500">
                          Languages:{" "}
                          {stake.supportedLanguages.join(", ")}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="font-medium">{selectedStake?.name}</span>
              <button
                onClick={() => {
                  setSelectedStakeId(null);
                  setError(null);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Change
              </button>
            </div>
          )}
        </section>

        {/* Step 2: Select a ward */}
        {selectedStakeId && (
          <section>
            <h2 className="text-lg font-semibold mb-3">
              2. Choose a Ward to Join
            </h2>

            {wards === undefined ? (
              <p className="text-gray-500">Loading wards...</p>
            ) : wards.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">
                  No wards in this stake yet.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {wards.map((ward) => (
                  <li
                    key={ward._id}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-medium">{ward.name}</h3>
                      <p className="text-sm text-gray-500">
                        Languages:{" "}
                        {(
                          ward.supportedLanguages ??
                          selectedStake?.supportedLanguages ??
                          []
                        ).join(", ")}
                        {!ward.supportedLanguages && " (inherited)"}
                      </p>
                    </div>
                    {wardMembershipMap.has(ward._id) ? (
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          wardMembershipMap.get(ward._id) === "leader"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {wardMembershipMap.get(ward._id) === "leader"
                          ? "Leader"
                          : "Joined"}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoin(ward._id, ward.name)}
                        disabled={joiningWardId === ward._id}
                        className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {joiningWardId === ward._id ? "Joining..." : "Join"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
