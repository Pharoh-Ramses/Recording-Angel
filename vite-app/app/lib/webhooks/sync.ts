import { db, syncEvents, users } from "../index";
import { eq } from "drizzle-orm";
import { createHmac, randomUUID } from "crypto";

// Types for webhook payloads
export interface UserWebhookPayload {
  id: string;
  email: string;
  fullName: string;
  status?: string;
  role?: string;
  ward?: number;
  stake?: number;
}

export interface WebhookResponse {
  success: boolean;
  error?: string;
}

// Webhook signature verification
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

// Outbound webhook functions (React → Python API)
export async function sendUserCreatedWebhook(user: UserWebhookPayload): Promise<void> {
  // Store sync event in database
  const [syncEvent] = await db.insert(syncEvents).values({
    id: randomUUID(),
    entityType: 'user',
    entityId: user.id,
    action: 'create',
    payload: user,
    status: 'pending',
    createdAt: new Date(),
  }).returning();

  // Process the webhook
  await processWebhookEvent(syncEvent.id);
}

export async function sendUserUpdatedWebhook(
  userId: string, 
  updates: Partial<UserWebhookPayload>
): Promise<void> {
  const [syncEvent] = await db.insert(syncEvents).values({
    id: randomUUID(),
    entityType: 'user',
    entityId: userId,
    action: 'update',
    payload: updates,
    status: 'pending',
    createdAt: new Date(),
  }).returning();

  await processWebhookEvent(syncEvent.id);
}

// Process webhook with retry logic
async function processWebhookEvent(eventId: string): Promise<void> {
  const event = await db.query.syncEvents.findFirst({
    where: eq(syncEvents.id, eventId),
  });

  if (!event) {
    console.error('Sync event not found:', eventId);
    return;
  }

  try {
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
    const webhookSecret = process.env.PYTHON_API_WEBHOOK_SECRET || 'default-secret';

    // Create webhook payload
    const webhookPayload = {
      eventType: `${event.entityType}.${event.action}`,
      data: event.payload,
      timestamp: event.createdAt,
      source: 'react_app',
    };

    const payloadString = JSON.stringify(webhookPayload);
    
    // Generate signature
    const signature = createHmac('sha256', webhookSecret)
      .update(payloadString)
      .digest('hex');

    // Send webhook to Python API
    const response = await fetch(`${pythonApiUrl}/webhooks/from-react`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
      },
      body: payloadString,
    });

    if (response.ok) {
      // Mark as successful
      await db.update(syncEvents)
        .set({
          status: 'success',
          processedAt: new Date(),
        })
        .where(eq(syncEvents.id, eventId));
    } else {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const retryCount = (event.retryCount || 0) + 1;
    const maxRetries = 5;

    if (retryCount >= maxRetries) {
      // Mark as permanently failed
      await db.update(syncEvents)
        .set({
          status: 'failed',
          error: errorMessage,
          processedAt: new Date(),
        })
        .where(eq(syncEvents.id, eventId));
    } else {
      // Schedule retry with exponential backoff
      const backoffMs = 1000 * Math.pow(2, retryCount); // 2s, 4s, 8s, 16s, 32s
      const nextRetryAt = new Date(Date.now() + backoffMs);

      await db.update(syncEvents)
        .set({
          status: 'retrying',
          retryCount,
          nextRetryAt,
          error: errorMessage,
        })
        .where(eq(syncEvents.id, eventId));

      // Schedule retry (in production, use a job queue)
      setTimeout(() => processWebhookEvent(eventId), backoffMs);
    }

    console.error(`Webhook failed for event ${eventId}:`, errorMessage);
  }
}

// Inbound webhook handlers (Python API → React)
export const webhookHandlers = {
  // Removed approval/rejection handlers - no approval process needed

  'user.role_changed': async (payload: any) => {
    await db.update(users)
      .set({
        role: payload.newRole,
        syncedAt: new Date(),
        lastSyncVersion: payload.version || Date.now(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, payload.userId));
  },

  'user.profile_updated': async (payload: any) => {
    const updates: any = {
      syncedAt: new Date(),
      lastSyncVersion: payload.version || Date.now(),
      updatedAt: new Date(),
    };

    if (payload.fullName) updates.fullName = payload.fullName;
    if (payload.ward) updates.ward = payload.ward;
    if (payload.stake) updates.stake = payload.stake;

    await db.update(users)
      .set(updates)
      .where(eq(users.id, payload.userId));
  },
};

// Process retry queue (call this periodically)
export async function processRetryQueue(): Promise<void> {
  const pendingRetries = await db.query.syncEvents.findMany({
    where: (syncEvents, { eq, and, lte }) => and(
      eq(syncEvents.status, 'retrying'),
      lte(syncEvents.nextRetryAt, new Date())
    ),
  });

  for (const event of pendingRetries) {
    await processWebhookEvent(event.id);
  }
}