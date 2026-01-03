/**
 * Email Analytics Type Definitions
 * Provider-agnostic types for email event tracking
 */

// Event types supported by email providers
export type EmailEventType =
    | 'sent'
    | 'delivered'
    | 'open'
    | 'click'
    | 'bounce'
    | 'unsubscribe'
    | 'resubscribe'
    | 'failed';

// Supported email providers
export type EmailProvider = 'everlytic' | 'mailgun' | 'ses' | 'postmark';

/**
 * Canonical email event format (provider-agnostic)
 * This is the normalized internal format used across the system
 */
export interface CanonicalEmailEvent {
    provider: EmailProvider;
    eventType: EmailEventType;
    email: string;
    messageId: string;
    campaignId: string | null;
    templateId: string | null;
    occurredAt: Date;
    rawPayload: Record<string, unknown>;
}

/**
 * Database row representation of an email event
 */
export interface EmailEventRow {
    id: string;
    provider: string;
    event_type: string;
    email: string;
    message_id: string;
    campaign_id: string | null;
    template_id: string | null;
    occurred_at: string;
    raw_payload: Record<string, unknown>;
    created_at: string;
    idempotency_key: string;
}

/**
 * Raw Everlytic webhook payload structure (standard field_set)
 */
export interface EverlyticWebhookPayload {
    id?: string;
    type?: string;
    timestamp?: string;
    data?: Array<{
        transaction?: {
            id?: string;
            message_id?: string;
            method?: string;
            group?: {
                id?: string;
                name?: string;
            };
            sent_timestamp?: string;
            subject?: string;
            message_size_bytes?: number;
        };
        recipient?: {
            name?: string;
            email?: string;
        };
        // Additional fields may be present for specific event types
        link_url?: string; // For click events
        bounce_type?: string; // For bounce events
        bounce_reason?: string;
    }>;
}

/**
 * Alert definition for threshold-based monitoring
 */
export interface AlertRule {
    name: string;
    metric: 'bounce_rate' | 'delivery_failure' | 'open_rate_drop' | 'ingestion_failures' | 'auth_failures';
    threshold: number;
    windowMinutes: number;
    severity: 'warning' | 'critical';
}

/**
 * Alert event emitted when a rule threshold is breached
 */
export interface AlertEvent {
    rule: string;
    severity: 'warning' | 'critical';
    metricValue: number;
    threshold: number;
    timeWindow: {
        start: Date;
        end: Date;
    };
    campaignId?: string;
    provider?: string;
    triggeredAt: Date;
}
