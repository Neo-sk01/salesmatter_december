import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
    insertInstantlyEvent,
    applyEventToMessage,
    type CanonicalInstantlyEvent,
} from "@/lib/db/instantly-events-db";

// Instantly v2 doesn't HMAC-sign payloads; auth is via a shared secret on the
// webhook URL set at registration time. timingSafeEqual avoids leaking length.
function verifySecret(provided: string | null): boolean {
    const expected = process.env.INSTANTLY_WEBHOOK_SECRET;
    if (!expected || !provided) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

// Schema reference: https://developer.instantly.ai/api/v2/webhook
interface InstantlyWebhookPayload {
    timestamp?: string;
    event_type?: string;
    workspace?: string;
    campaign_id?: string;
    campaign_name?: string;
    lead_email?: string;
    email_account?: string;
    unibox_url?: string;
    step?: number;
    variant?: number;
    is_first?: boolean;
    email_id?: string;
    email_subject?: string;
    email_text?: string;
    email_html?: string;
    reply_text_snippet?: string;
    reply_subject?: string;
    reply_text?: string;
    reply_html?: string;
    [key: string]: unknown;
}

function parsePayload(payload: InstantlyWebhookPayload): CanonicalInstantlyEvent | null {
    const eventType = payload.event_type;
    if (!eventType) return null;

    // Reject events with no parsable timestamp — falling back to server time
    // would break idempotency (replays would get fresh keys each time).
    const tsRaw = payload.timestamp;
    const ts = tsRaw ? new Date(tsRaw) : null;
    if (!ts || Number.isNaN(ts.getTime())) return null;

    return {
        eventType,
        email: payload.lead_email ?? null,
        campaignId: payload.campaign_id ?? null,
        campaignName: payload.campaign_name ?? null,
        workspaceId: payload.workspace ?? null,
        emailAccount: payload.email_account ?? null,
        step: typeof payload.step === "number" ? payload.step : null,
        variant: typeof payload.variant === "number" ? payload.variant : null,
        isFirst: typeof payload.is_first === "boolean" ? payload.is_first : null,
        occurredAt: ts,
        rawPayload: payload as Record<string, unknown>,
    };
}

function idempotencyKey(event: CanonicalInstantlyEvent): string {
    // Instantly retries on non-2xx with the same payload, so the timestamp +
    // event-type + identifying fields produce a stable key. Step/variant are
    // included because the same lead can fire (e.g.) email_opened on multiple
    // steps — each is a distinct event.
    const parts = [
        event.eventType,
        event.campaignId ?? "no-campaign",
        event.email ?? "no-email",
        event.step ?? "-",
        event.variant ?? "-",
        event.occurredAt.toISOString(),
    ];
    return parts.join(":");
}

export async function POST(req: NextRequest) {
    const secret = req.nextUrl.searchParams.get("secret");
    if (!verifySecret(secret)) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let payload: InstantlyWebhookPayload;
    try {
        payload = await req.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const event = parsePayload(payload);
    if (!event) {
        // 200 so Instantly stops retrying; logged for triage.
        console.warn("[instantly-webhook] Could not parse event:", payload);
        return NextResponse.json({ ok: true, ignored: true });
    }

    const insertResult = await insertInstantlyEvent(event, idempotencyKey(event));

    // Only apply to the message snapshot if this was a fresh event (not a replay).
    // Skipping on replay avoids double-incrementing open_count/click_count.
    if (insertResult.inserted) {
        await applyEventToMessage(event);
    }

    return NextResponse.json({ ok: true, applied: insertResult.inserted });
}
