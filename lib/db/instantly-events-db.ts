import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabase(): SupabaseClient {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export interface CanonicalInstantlyEvent {
    eventType: string;
    email: string | null;
    campaignId: string | null;
    campaignName: string | null;
    workspaceId: string | null;
    emailAccount: string | null;
    step: number | null;
    variant: number | null;
    isFirst: boolean | null;
    occurredAt: Date;
    rawPayload: Record<string, unknown>;
}

const KNOWN_EVENT_TYPES = new Set([
    // Email
    "email_sent",
    "email_opened",
    "reply_received",
    "auto_reply_received",
    "link_clicked",
    "email_bounced",
    "lead_unsubscribed",
    "account_error",
    "campaign_completed",
    // Lead status
    "lead_neutral",
    "lead_interested",
    "lead_not_interested",
    // Meetings
    "lead_meeting_booked",
    "lead_meeting_completed",
    // Other lead
    "lead_closed",
    "lead_out_of_office",
    "lead_wrong_person",
]);

export function isCustomLabel(eventType: string): boolean {
    return !KNOWN_EVENT_TYPES.has(eventType);
}

export async function insertInstantlyEvent(
    event: CanonicalInstantlyEvent,
    idempotencyKey: string,
): Promise<{ inserted: boolean; reason?: string }> {
    const supabase = getSupabase();

    const { error } = await supabase.from("instantly_events").insert({
        event_type: event.eventType,
        email: event.email,
        campaign_id: event.campaignId,
        campaign_name: event.campaignName,
        workspace_id: event.workspaceId,
        email_account: event.emailAccount,
        step: event.step,
        variant: event.variant,
        is_first: event.isFirst,
        occurred_at: event.occurredAt.toISOString(),
        raw_payload: event.rawPayload,
        idempotency_key: idempotencyKey,
    });

    if (error) {
        if (error.code === "23505") return { inserted: false, reason: "duplicate" };
        console.error("[instantly-events-db] Insert error:", error);
        return { inserted: false, reason: error.message };
    }
    return { inserted: true };
}

interface MessageRow {
    sent_at: string | null;
    first_opened_at: string | null;
    first_clicked_at: string | null;
    first_replied_at: string | null;
    bounced_at: string | null;
    unsubscribed_at: string | null;
    open_count: number;
    click_count: number;
    reply_count: number;
    interest_status: string | null;
    meeting_booked_at: string | null;
    meeting_completed_at: string | null;
    closed_at: string | null;
    is_out_of_office: boolean;
    is_wrong_person: boolean;
    custom_label: string | null;
}

/**
 * Apply a webhook event to the per-prospect snapshot table. First-occurrence
 * timestamps are preserved (a later open doesn't move first_opened_at);
 * counters are incremented; lead-status flags are set.
 *
 * No-ops when campaign_id or lead_email is missing (e.g. account_error,
 * campaign_completed) — those are recorded only in the immutable event log.
 */
export async function applyEventToMessage(
    event: CanonicalInstantlyEvent,
): Promise<void> {
    if (!event.campaignId || !event.email) return;

    const supabase = getSupabase();

    const { data: existing } = await supabase
        .from("instantly_messages")
        .select(
            "sent_at, first_opened_at, first_clicked_at, first_replied_at, bounced_at, unsubscribed_at, open_count, click_count, reply_count, interest_status, meeting_booked_at, meeting_completed_at, closed_at, is_out_of_office, is_wrong_person, custom_label",
        )
        .eq("campaign_id", event.campaignId)
        .eq("lead_email", event.email)
        .maybeSingle<MessageRow>();

    const occurred = event.occurredAt.toISOString();
    const previous: MessageRow = existing ?? {
        sent_at: null,
        first_opened_at: null,
        first_clicked_at: null,
        first_replied_at: null,
        bounced_at: null,
        unsubscribed_at: null,
        open_count: 0,
        click_count: 0,
        reply_count: 0,
        interest_status: null,
        meeting_booked_at: null,
        meeting_completed_at: null,
        closed_at: null,
        is_out_of_office: false,
        is_wrong_person: false,
        custom_label: null,
    };

    const next: MessageRow = { ...previous };

    switch (event.eventType) {
        case "email_sent":
            next.sent_at = previous.sent_at ?? occurred;
            break;
        case "email_opened":
            next.first_opened_at = previous.first_opened_at ?? occurred;
            next.open_count = previous.open_count + 1;
            break;
        case "link_clicked":
            next.first_clicked_at = previous.first_clicked_at ?? occurred;
            next.click_count = previous.click_count + 1;
            break;
        case "reply_received":
        case "auto_reply_received":
            next.first_replied_at = previous.first_replied_at ?? occurred;
            next.reply_count = previous.reply_count + 1;
            break;
        case "email_bounced":
            next.bounced_at = previous.bounced_at ?? occurred;
            break;
        case "lead_unsubscribed":
            next.unsubscribed_at = previous.unsubscribed_at ?? occurred;
            break;
        case "lead_interested":
            next.interest_status = "interested";
            break;
        case "lead_not_interested":
            next.interest_status = "not_interested";
            break;
        case "lead_neutral":
            next.interest_status = "neutral";
            break;
        case "lead_meeting_booked":
            next.meeting_booked_at = previous.meeting_booked_at ?? occurred;
            break;
        case "lead_meeting_completed":
            next.meeting_completed_at = previous.meeting_completed_at ?? occurred;
            break;
        case "lead_closed":
            next.closed_at = previous.closed_at ?? occurred;
            break;
        case "lead_out_of_office":
            next.is_out_of_office = true;
            break;
        case "lead_wrong_person":
            next.is_wrong_person = true;
            break;
        case "account_error":
        case "campaign_completed":
            // Workspace/campaign-level — not tied to a specific lead lifecycle
            return;
        default:
            // Custom workspace label — store the label name for filtering
            next.custom_label = event.eventType;
            break;
    }

    const { error } = await supabase.from("instantly_messages").upsert(
        {
            campaign_id: event.campaignId,
            lead_email: event.email,
            ...next,
            last_event_type: event.eventType,
            last_event_at: occurred,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "campaign_id,lead_email" },
    );

    if (error) {
        console.error("[instantly-events-db] Upsert message error:", error);
    }
}

export interface CampaignMetricsAggregate {
    totalCounts: Map<string, number>;
    uniqueLeadCounts: Map<string, number>;
    uniqueRepliers: number;
    opportunityLeads: number;
}

/**
 * Aggregates events into the metric set Instantly's GET
 * /api/v2/campaigns/analytics/daily exposes. One scan of the events table
 * yields both raw counts and per-lead unique counts, plus the union of leads
 * who reached any positive lifecycle state (interested / meeting / closed) =
 * total_opportunities.
 */
export async function getCampaignMetrics(
    startDate: Date,
    endDate: Date,
): Promise<CampaignMetricsAggregate> {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from("instantly_events")
        .select("event_type, email")
        .gte("occurred_at", startDate.toISOString())
        .lte("occurred_at", endDate.toISOString())
        .limit(50000);

    if (error) {
        console.error("[instantly-events-db] Metrics query error:", error);
        return {
            totalCounts: new Map(),
            uniqueLeadCounts: new Map(),
            uniqueRepliers: 0,
            opportunityLeads: 0,
        };
    }

    const totalCounts = new Map<string, number>();
    const uniqueLeads = new Map<string, Set<string>>();
    const replierLeads = new Set<string>();
    const opportunityLeads = new Set<string>();
    const OPPORTUNITY_EVENTS = new Set([
        "lead_interested",
        "lead_meeting_booked",
        "lead_meeting_completed",
        "lead_closed",
    ]);
    const REPLY_EVENTS = new Set(["reply_received", "auto_reply_received"]);

    for (const row of data ?? []) {
        const type = row.event_type as string;
        totalCounts.set(type, (totalCounts.get(type) ?? 0) + 1);

        const email = row.email as string | null;
        if (email) {
            let leadSet = uniqueLeads.get(type);
            if (!leadSet) {
                leadSet = new Set<string>();
                uniqueLeads.set(type, leadSet);
            }
            leadSet.add(email);
            if (OPPORTUNITY_EVENTS.has(type)) opportunityLeads.add(email);
            if (REPLY_EVENTS.has(type)) replierLeads.add(email);
        }
    }

    const uniqueLeadCounts = new Map<string, number>();
    for (const [type, set] of uniqueLeads) uniqueLeadCounts.set(type, set.size);

    return {
        totalCounts,
        uniqueLeadCounts,
        uniqueRepliers: replierLeads.size,
        opportunityLeads: opportunityLeads.size,
    };
}

export async function getEventCountsByType(
    startDate: Date,
    endDate: Date,
): Promise<Map<string, number>> {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from("instantly_events")
        .select("event_type")
        .gte("occurred_at", startDate.toISOString())
        .lte("occurred_at", endDate.toISOString())
        .limit(50000);

    if (error) {
        console.error("[instantly-events-db] Count error:", error);
        return new Map();
    }

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
        counts.set(row.event_type, (counts.get(row.event_type) ?? 0) + 1);
    }
    return counts;
}

export async function getEventsByTimeRange(
    startDate: Date,
    endDate: Date,
    eventType?: string,
): Promise<
    Array<{
        email: string | null;
        campaign_id: string | null;
        event_type: string;
        occurred_at: string;
        raw_payload: Record<string, unknown>;
    }>
> {
    const supabase = getSupabase();

    let query = supabase
        .from("instantly_events")
        .select("email, campaign_id, event_type, occurred_at, raw_payload")
        .gte("occurred_at", startDate.toISOString())
        .lte("occurred_at", endDate.toISOString())
        .order("occurred_at", { ascending: false })
        .limit(500);

    if (eventType) query = query.eq("event_type", eventType);

    const { data, error } = await query;
    if (error) {
        console.error("[instantly-events-db] Query error:", error);
        return [];
    }
    return data ?? [];
}

export async function getDailyEventCounts(
    days: number,
): Promise<Array<{ date: string; sent: number; opened: number; replied: number }>> {
    const supabase = getSupabase();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
        .from("instantly_events")
        .select("event_type, occurred_at")
        .gte("occurred_at", startDate.toISOString())
        .lte("occurred_at", endDate.toISOString())
        .in("event_type", [
            "email_sent",
            "email_opened",
            "reply_received",
            "auto_reply_received",
        ])
        .limit(50000);

    if (error) {
        console.error("[instantly-events-db] Daily query error:", error);
        return [];
    }

    const buckets = new Map<string, { sent: number; opened: number; replied: number }>();
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        buckets.set(key, { sent: 0, opened: 0, replied: 0 });
    }

    for (const row of data ?? []) {
        const day = row.occurred_at.slice(0, 10);
        const bucket = buckets.get(day);
        if (!bucket) continue;
        if (row.event_type === "email_sent") bucket.sent += 1;
        else if (row.event_type === "email_opened") bucket.opened += 1;
        else if (
            row.event_type === "reply_received" ||
            row.event_type === "auto_reply_received"
        )
            bucket.replied += 1;
    }

    return Array.from(buckets.entries())
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));
}
