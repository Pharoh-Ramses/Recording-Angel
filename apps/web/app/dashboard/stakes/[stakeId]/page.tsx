"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@gospelsmarts/backend/convex/_generated/api";
import type { Id } from "@gospelsmarts/backend/convex/_generated/dataModel";
import Link from "next/link";
import { useParams } from "next/navigation";

type Language = "en" | "es";

export default function StakeDetailPage() {
  const params = useParams();
  const stakeId = params.stakeId as Id<"stakes">;

  const stake = useQuery(api.stakes.get, { stakeId });
  const wards = useQuery(api.wards.listByStake, { stakeId });
  const createWard = useMutation(api.wards.create);
  const setStakeLanguages = useMutation(api.stakes.setLanguages);

  const [showNewWardForm, setShowNewWardForm] = useState(false);
  const [newWardName, setNewWardName] = useState("");
  const [isCreatingWard, setIsCreatingWard] = useState(false);
  const [wardError, setWardError] = useState<string | null>(null);

  const [showLanguageForm, setShowLanguageForm] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>([]);
  const [isSavingLanguages, setIsSavingLanguages] = useState(false);

  if (stake === undefined || wards === undefined) {
    return (
      <main className="flex min-h-screen flex-col items-center p-8">
        <div className="w-full max-w-4xl">
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  if (stake === null) {
    return (
      <main className="flex min-h-screen flex-col items-center p-8">
        <div className="w-full max-w-4xl">
          <p>Stake not found</p>
          <Link
            href="/dashboard/stakes"
            className="text-blue-600 hover:underline"
          >
            Back to stakes
          </Link>
        </div>
      </main>
    );
  }

  const handleCreateWard = async (e: React.FormEvent) => {
    e.preventDefault();
    setWardError(null);

    if (!newWardName.trim()) {
      setWardError("Ward name is required");
      return;
    }

    setIsCreatingWard(true);
    try {
      await createWard({
        stakeId,
        name: newWardName.trim(),
      });
      setNewWardName("");
      setShowNewWardForm(false);
    } catch (err) {
      setWardError(
        err instanceof Error ? err.message : "Failed to create ward",
      );
    } finally {
      setIsCreatingWard(false);
    }
  };

  const handleSaveLanguages = async () => {
    if (selectedLanguages.length === 0) return;

    setIsSavingLanguages(true);
    try {
      await setStakeLanguages({
        stakeId,
        languages: selectedLanguages,
      });
      setShowLanguageForm(false);
    } catch (err) {
      console.error("Failed to save languages:", err);
    } finally {
      setIsSavingLanguages(false);
    }
  };

  const toggleLanguage = (lang: Language) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-4xl">
        <Link
          href="/dashboard/stakes"
          className="text-gray-600 hover:underline mb-4 inline-block"
        >
          &larr; Back to Stakes
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-bold mb-2">{stake.name}</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Languages: {stake.supportedLanguages.join(", ")}
            </span>
            <button
              onClick={() => {
                setSelectedLanguages(
                  [...stake.supportedLanguages] as Language[],
                );
                setShowLanguageForm(true);
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Edit
            </button>
          </div>
        </header>

        {showLanguageForm && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-medium mb-3">Update Supported Languages</h3>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedLanguages.includes("en")}
                  onChange={() => toggleLanguage("en")}
                  className="rounded"
                />
                English
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedLanguages.includes("es")}
                  onChange={() => toggleLanguage("es")}
                  className="rounded"
                />
                Spanish
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveLanguages}
                disabled={
                  selectedLanguages.length === 0 || isSavingLanguages
                }
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingLanguages ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setShowLanguageForm(false)}
                className="px-3 py-1 text-gray-600 text-sm hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Wards</h2>
            <button
              onClick={() => setShowNewWardForm(true)}
              className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
            >
              Add Ward
            </button>
          </div>

          {showNewWardForm && (
            <form
              onSubmit={handleCreateWard}
              className="mb-4 p-4 border rounded-lg bg-gray-50"
            >
              <h3 className="font-medium mb-3">Create New Ward</h3>
              <input
                type="text"
                value={newWardName}
                onChange={(e) => setNewWardName(e.target.value)}
                placeholder="Ward name"
                className="w-full border rounded-md px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isCreatingWard}
              />
              {wardError && (
                <p className="text-red-600 text-sm mb-3">{wardError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isCreatingWard}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {isCreatingWard ? "Creating..." : "Create Ward"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewWardForm(false);
                    setNewWardName("");
                    setWardError(null);
                  }}
                  className="px-3 py-1 text-gray-600 text-sm hover:underline"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {wards.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No wards in this stake yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {wards.map((ward) => (
                <li key={ward._id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{ward.name}</h3>
                      <p className="text-sm text-gray-500">
                        Languages:{" "}
                        {(
                          ward.supportedLanguages ?? stake.supportedLanguages
                        ).join(", ")}
                        {!ward.supportedLanguages && " (inherited)"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
