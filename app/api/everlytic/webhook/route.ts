/**
 * Everlytic Webhook Handler
 * Receives webhook callbacks from Everlytic for email events
 * 
 * RELIABILITY REQUIREMENTS:
 * - Respond in < 200ms
 * - Never fail on malformed payloads
 * - Deduplicate with idempotency keys
 * - Log everything for debugging
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    normalizeEverlyticEvent,
    generateIdempotencyKey,
    logRawPayload,
} from '@/lib/webhooks/everlytic-normalizer';
import {
    insertEmailEvent,
    upsertEmailMessage,
    recordIngestionFailure,
    recordAuthFailure,
} from '@/lib/db/email-events-db';

/**
 * Verify HTTP Basic Auth credentials
 * Returns true if valid, false otherwise
 */
function verifyBasicAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return false;
    }

    try {
        const expectedUsername = process.env.EVERLYTIC_WEBHOOK_USERNAME || process.env.EVERLYTIC_USERNAME;
        const expectedPassword = process.env.EVERLYTIC_WEBHOOK_PASSWORD || process.env.EVERLYTIC_PASSWORD;

        if (!expectedUsername || !expectedPassword) {
            console.error('[everlytic-webhook] Missing webhook auth credentials in environment');
            return false;
        }

        const base64Credentials = authHeader.slice(6); // Remove "Basic "
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');

        return username === expectedUsername && password === expectedPassword;
    } catch {
        return false;
    }
}

/**
 * Get client IP for logging/alerting
 */
function getClientIp(request: NextRequest): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
    );
}

/**
 * POST /api/everlytic/webhook
 * 
 * Handles incoming Everlytic webhook events:
 * - Verifies Basic Auth
 * - Logs raw payload
 * - Normalizes to canonical format
 * - Inserts with idempotency protection
 * - Returns 200 immediately (never blocks on slow operations)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    const clientIp = getClientIp(request);

    // 1. Verify authentication
    if (!verifyBasicAuth(request)) {
        console.warn('[everlytic-webhook] Auth failed from IP:', clientIp);

        // Record auth failure asynchronously (don't await)
        recordAuthFailure(clientIp, { reason: 'invalid_credentials' }).catch(() => { });

        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        // 2. Parse and log raw payload
        const rawPayload = await request.json();
        logRawPayload(rawPayload, 'everlytic');

        // 3. Normalize payload (never throws)
        const event = normalizeEverlyticEvent(rawPayload);

        // 4. Generate idempotency key
        const idempotencyKey = generateIdempotencyKey(event);

        // 5. Insert event with deduplication
        const { inserted, error } = await insertEmailEvent(event, idempotencyKey);

        if (error) {
            console.error('[everlytic-webhook] Insert error:', error);
            // Record failure but still return 200 to prevent retries
            recordIngestionFailure(error, rawPayload).catch(() => { });
        }

        // 6. Update message record (async, non-blocking)
        if (inserted) {
            upsertEmailMessage(event.messageId, event).catch(() => { });
        }

        // 7. Log processing time
        const processingTime = Date.now() - startTime;
        if (processingTime > 200) {
            console.warn('[everlytic-webhook] Slow processing:', processingTime, 'ms');
        }

        return NextResponse.json({
            success: true,
            inserted,
            processingTimeMs: processingTime,
        });
    } catch (err) {
        // Catch-all: log error, record failure, but still return 200
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[everlytic-webhook] Unexpected error:', message);

        // Record failure asynchronously
        recordIngestionFailure(message, { error: message }).catch(() => { });

        // Return 200 to prevent Everlytic from retrying
        // The event is lost but logged for manual recovery
        return NextResponse.json({
            success: false,
            error: 'Internal error (logged for recovery)',
        });
    }
}

/**
 * GET /api/everlytic/webhook
 * Health check endpoint for monitoring
 */
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        status: 'ok',
        provider: 'everlytic',
        timestamp: new Date().toISOString(),
    });
}
