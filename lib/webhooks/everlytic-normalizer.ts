/**
 * Everlytic Webhook Payload Normalizer
 * Safely converts raw Everlytic webhook payloads to canonical format
 * 
 * DESIGN PRINCIPLES:
 * - Never throws exceptions
 * - Gracefully handles missing/malformed fields
 * - Always preserves raw payload for debugging
 */

import crypto from 'crypto';
import type {
    CanonicalEmailEvent,
    EmailEventType,
    EverlyticWebhookPayload,
} from '@/types/email-analytics';

// Valid event types from Everlytic
const VALID_EVENT_TYPES: Set<string> = new Set([
    'sent',
    'delivered',
    'open',
    'click',
    'bounce',
    'unsubscribe',
    'resubscribe',
    'failed',
]);

/**
 * Safely extract a string value from an unknown object
 */
function safeString(value: unknown, fallback: string = ''): string {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return fallback;
    return String(value);
}

/**
 * Parse event type with fallback to 'unknown' stored as 'failed'
 */
function parseEventType(rawType: unknown): EmailEventType {
    const typeStr = safeString(rawType).toLowerCase();
    if (VALID_EVENT_TYPES.has(typeStr)) {
        return typeStr as EmailEventType;
    }
    // Unknown events are treated as failures for alerting purposes
    return 'failed';
}

/**
 * Parse timestamp with fallback to current time
 */
function parseTimestamp(rawTimestamp: unknown): Date {
    if (!rawTimestamp) return new Date();

    const timestamp = safeString(rawTimestamp);
    const parsed = new Date(timestamp);

    // Return current time if parsing failed
    if (isNaN(parsed.getTime())) {
        return new Date();
    }

    return parsed;
}

/**
 * Normalize raw Everlytic webhook payload to canonical format
 * 
 * This function NEVER throws. All missing/malformed fields are
 * handled gracefully with sensible defaults.
 * 
 * @param raw - The raw webhook payload (unknown structure)
 * @returns Normalized CanonicalEmailEvent
 */
export function normalizeEverlyticEvent(raw: unknown): CanonicalEmailEvent {
    const payload = (raw ?? {}) as EverlyticWebhookPayload;
    const data = payload.data?.[0] ?? {};
    const transaction = data.transaction ?? {};
    const recipient = data.recipient ?? {};

    return {
        provider: 'everlytic',
        eventType: parseEventType(payload.type),
        email: safeString(recipient.email, 'unknown@unknown.com'),
        messageId: safeString(transaction.message_id || transaction.id || payload.id, `unknown-${Date.now()}`),
        campaignId: transaction.group?.id ? safeString(transaction.group.id) : null,
        templateId: null, // Everlytic doesn't provide template ID in standard webhooks
        occurredAt: parseTimestamp(payload.timestamp),
        rawPayload: typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : { original: raw },
    };
}

/**
 * Generate a deterministic idempotency key for deduplication
 * 
 * Key is SHA-256 hash of: provider + eventType + messageId + occurredAt
 * This ensures identical events produce identical keys
 * 
 * @param event - Canonical email event
 * @returns SHA-256 hash string
 */
export function generateIdempotencyKey(event: CanonicalEmailEvent): string {
    const components = [
        event.provider,
        event.eventType,
        event.messageId,
        event.occurredAt.toISOString(),
    ].join('|');

    return crypto.createHash('sha256').update(components).digest('hex');
}

/**
 * Log raw webhook payload for debugging
 * Structured log format for production observability
 */
export function logRawPayload(payload: unknown, source: string = 'everlytic'): void {
    console.log(JSON.stringify({
        type: 'webhook_received',
        source,
        timestamp: new Date().toISOString(),
        payload,
    }));
}
