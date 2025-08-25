import type { ActionFunctionArgs } from "react-router";
import { eq } from "drizzle-orm";
import { db, webhookEvents } from "~/lib";
import { webhookHandlers, verifyWebhookSignature } from "~/lib/webhooks/sync";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-webhook-signature');
    const webhookSecret = process.env.WEBHOOK_SECRET || 'default-secret';

    // Verify webhook signature
    if (!signature || !verifyWebhookSignature(body, signature, webhookSecret)) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const payload = JSON.parse(body);
    const { eventType, data, source = 'python_api' } = payload;

    // Store webhook event
    const [webhookEvent] = await db.insert(webhookEvents).values({
      source,
      eventType,
      payload: data,
      signature,
      processed: false,
    }).returning();

    // Process webhook if we have a handler
    const handler = webhookHandlers[eventType as keyof typeof webhookHandlers];
    
    if (handler) {
      try {
        await handler(data);
        
        // Mark as processed
        await db.update(webhookEvents)
          .set({
            processed: true,
            processedAt: new Date(),
          })
          .where(eq(webhookEvents.id, webhookEvent.id));

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Processing failed';
        
        // Mark with error
        await db.update(webhookEvents)
          .set({
            processed: false,
            processingError: errorMessage,
            processedAt: new Date(),
          })
          .where(eq(webhookEvents.id, webhookEvent.id));

        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      console.warn(`No handler for webhook event type: ${eventType}`);
      return new Response(JSON.stringify({ error: `Unknown event type: ${eventType}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle health check
export async function loader() {
  return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' }
  });
}