"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <AdminSettingsContent />
    </Suspense>
  );
}

function AdminSettingsContent() {
  const searchParams = useSearchParams();
  const wardId = searchParams.get("ward") as Id<"wards"> | null;

  if (!wardId) {
    return <p className="text-muted-foreground">No ward selected.</p>;
  }

  return <SettingsContent wardId={wardId} />;
}

function SettingsContent({ wardId }: { wardId: Id<"wards"> }) {
  const settings = useQuery(api.moderation.getSettings, { wardId });
  const updateSettings = useMutation(api.moderation.updateSettings);
  const permissions = useQuery(api.roles.myPermissions, { wardId });

  const [aiPrompt, setAiPrompt] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings?.aiPrompt) {
      setAiPrompt(settings.aiPrompt);
    }
  }, [settings?.aiPrompt]);

  if (!permissions?.includes("moderation:configure")) {
    return (
      <p className="text-muted-foreground">
        You don&apos;t have permission to configure settings.
      </p>
    );
  }

  async function handleSave() {
    await updateSettings({ wardId: wardId!, aiPrompt });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>AI Review Prompt</CardTitle>
          <CardDescription>
            Customize how the AI reviews posts before they enter the manual
            moderation queue. The AI will use this prompt to evaluate each post.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={8}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Enter AI moderation instructions..."
          />
          <div className="flex items-center gap-3">
            <Button onClick={handleSave}>Save</Button>
            {saved && (
              <span className="text-sm text-green-600">Saved!</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
