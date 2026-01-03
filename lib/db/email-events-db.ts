/**
 * Email Events Database Client
 * Supabase operations for email event storage and querying
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalEmailEvent, EmailEventRow } from '@/types/email-analytics';

// Lazy-initialized Supabase client
let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client
 * Uses service role key for server-side operations
 */
function getSupabaseClient(): SupabaseClient {
    if (supabaseClient) return supabaseClient;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return supabaseClient;
}

/**
 * Insert an email event with idempotency protection
 * 
 * Uses ON CONFLICT DO NOTHING to silently ignore duplicates.
 * Returns true if inserted, false if duplicate.
 * 
 * @param event - Canonical email event
 * @param idempotencyKey - Pre-computed idempotency key
 * @returns Object with success status and optional error
 */
export async function insertEmailEvent(
    event: CanonicalEmailEvent,
    idempotencyKey: string
): Promise<{ inserted: boolean; error?: string }> {
    try {
        const client = getSupabaseClient();

        const { error, status } = await client
            .from('email_events')
            .insert({
                provider: event.provider,
                event_type: event.eventType,
                email: event.email,
                message_id: event.messageId,
                campaign_id: event.campaignId,
                template_id: event.templateId,
                occurred_at: event.occurredAt.toISOString(),
                raw_payload: event.rawPayload,
                idempotency_key: idempotencyKey,
            })
            .single();

        // 409 Conflict = duplicate (idempotency key exists)
        if (status === 409 || error?.code === '23505') {
            return { inserted: false };
        }

        if (error) {
            console.error('[email-events-db] Insert error:', error);
            return { inserted: false, error: error.message };
        }

        return { inserted: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[email-events-db] Insert exception:', message);
        return { inserted: false, error: message };
    }
}

/**
 * Upsert email message record for denormalized tracking
 * 
 * @param messageId - Provider message ID
 * @param event - Canonical email event
 */
export async function upsertEmailMessage(
    messageId: string,
    event: CanonicalEmailEvent
): Promise<void> {
    try {
        const client = getSupabaseClient();

        await client
            .from('email_messages')
            .upsert(
                {
                    message_id: messageId,
                    provider: event.provider,
                    email: event.email,
                    campaign_id: event.campaignId,
                    template_id: event.templateId,
                    sent_at: event.eventType === 'sent' ? event.occurredAt.toISOString() : null,
                },
                {
                    onConflict: 'message_id',
                }
            );
    } catch (err) {
        // Non-critical: log but don't fail
        console.error('[email-events-db] Upsert message error:', err);
    }
}

/**
 * Query events by time range for analytics/alerting
 * 
 * @param start - Start of time range
 * @param end - End of time range
 * @param eventType - Optional filter by event type
 * @param campaignId - Optional filter by campaign
 * @returns Array of email event rows
 */
export async function getEventsByTimeRange(
    start: Date,
    end: Date,
    eventType?: string,
    campaignId?: string
): Promise<EmailEventRow[]> {
    try {
        const client = getSupabaseClient();

        let query = client
            .from('email_events')
            .select('*')
            .gte('occurred_at', start.toISOString())
            .lte('occurred_at', end.toISOString())
            .order('occurred_at', { ascending: false });

        if (eventType) {
            query = query.eq('event_type', eventType);
        }

        if (campaignId) {
            query = query.eq('campaign_id', campaignId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[email-events-db] Query error:', error);
            return [];
        }

        return (data ?? []) as EmailEventRow[];
    } catch (err) {
        console.error('[email-events-db] Query exception:', err);
        return [];
    }
}

/**
 * Count events by type in a time window
 * Used for alert calculations
 * 
 * @param start - Start of time window
 * @param end - End of time window
 * @returns Map of event type to count
 */
export async function getEventCountsByType(
    start: Date,
    end: Date
): Promise<Map<string, number>> {
    const counts = new Map<string, number>();

    try {
        const client = getSupabaseClient();

        const { data, error } = await client
            .from('email_events')
            .select('event_type')
            .gte('occurred_at', start.toISOString())
            .lte('occurred_at', end.toISOString());

        if (error) {
            console.error('[email-events-db] Count query error:', error);
            return counts;
        }

        for (const row of data ?? []) {
            const type = row.event_type;
            counts.set(type, (counts.get(type) ?? 0) + 1);
        }
    } catch (err) {
        console.error('[email-events-db] Count query exception:', err);
    }

    return counts;
}

/**
 * Track ingestion failures for alerting
 * Stored as a special event type
 */
export async function recordIngestionFailure(
    reason: string,
    rawPayload: unknown
): Promise<void> {
    try {
        const client = getSupabaseClient();

        await client.from('email_events').insert({
            provider: 'internal',
            event_type: 'ingestion_failure',
            email: 'system@internal',
            message_id: `ingestion-failure-${Date.now()}`,
            campaign_id: null,
            template_id: null,
            occurred_at: new Date().toISOString(),
            raw_payload: { reason, original: rawPayload },
            idempotency_key: `ingestion-failure-${Date.now()}-${Math.random()}`,
        });
    } catch (err) {
        console.error('[email-events-db] Record failure error:', err);
    }
}

/**
 * Track authentication failures for alerting
 */
export async function recordAuthFailure(
    sourceIp: string,
    details: Record<string, unknown>
): Promise<void> {
    try {
        const client = getSupabaseClient();

        await client.from('email_events').insert({
            provider: 'internal',
            event_type: 'auth_failure',
            email: 'system@internal',
            message_id: `auth-failure-${Date.now()}`,
            campaign_id: null,
            template_id: null,
            occurred_at: new Date().toISOString(),
            raw_payload: { source_ip: sourceIp, ...details },
            idempotency_key: `auth-failure-${Date.now()}-${Math.random()}`,
        });
    } catch (err) {
        console.error('[email-events-db] Record auth failure error:', err);
    }
}
