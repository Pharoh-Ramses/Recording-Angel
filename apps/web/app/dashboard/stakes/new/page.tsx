"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@gospelsmarts/backend/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Language = "en" | "es";

export default function NewStakePage() {
  const router = useRouter();
  const createStake = useMutation(api.stakes.create);

  const [name, setName] = useState("");
  const [languages, setLanguages] = useState<Language[]>(["en"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleLanguage = (lang: Language) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Stake name is required");
      return;
    }
    if (languages.length === 0) {
      setError("At least one language must be selected");
      return;
    }

    setIsSubmitting(true);
    try {
      const stakeId = await createStake({
        name: name.trim(),
        supportedLanguages: languages,
      });
      router.push(`/dashboard/stakes/${stakeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create stake");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Create New Stake</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Stake Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Salt Lake City Stake"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Supported Languages
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={languages.includes("en")}
                  onChange={() => toggleLanguage("en")}
                  disabled={isSubmitting}
                  className="rounded"
                />
                English
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={languages.includes("es")}
                  onChange={() => toggleLanguage("es")}
                  disabled={isSubmitting}
                  className="rounded"
                />
                Spanish
              </label>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Stake"}
            </button>
            <Link
              href="/dashboard/stakes"
              className="px-4 py-2 text-gray-600 hover:underline"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
