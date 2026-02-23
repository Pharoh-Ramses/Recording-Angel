import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateClerkWebhook(request);
    if (!event) {
      return new Response("Invalid webhook signature", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const { id, first_name, last_name, email_addresses, image_url } =
          event.data;
        await ctx.runMutation(internal.users.upsertFromClerk, {
          clerkId: id,
          name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || "Anonymous",
          email: email_addresses[0]?.email_address ?? "",
          imageUrl: image_url ?? undefined,
        });
        break;
      }
      case "user.deleted": {
        const clerkId = event.data.id;
        if (clerkId) {
          await ctx.runMutation(internal.users.deleteByClerkId, { clerkId });
        }
        break;
      }
    }

    return new Response(null, { status: 200 });
  }),
});

async function validateClerkWebhook(
  req: Request
): Promise<WebhookEvent | null> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) throw new Error("Missing CLERK_WEBHOOK_SECRET");

  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };

  try {
    return new Webhook(secret).verify(payload, headers) as WebhookEvent;
  } catch {
    return null;
  }
}

export default http;
