/**
 * Instantly v2 API client
 * https://developer.instantly.ai/api/v2
 *
 * Per-batch campaign model:
 *   - One campaign per batch of drafts
 *   - Sequence body uses {{personalization}} which Instantly substitutes per-lead
 *   - Subject is shared across the batch (the "1A" tradeoff we agreed on)
 */

const INSTANTLY_API_BASE = "https://api.instantly.ai/api/v2";

const DEFAULT_SENDER_EMAIL =
    process.env.INSTANTLY_SENDER_EMAIL || "neosekaleli@carbosoftware.com";

const DEFAULT_SCHEDULE = {
    timezone: "Africa/Johannesburg",
    fromTime: "09:00",
    toTime: "17:00",
    // Mon–Fri (Instantly: 0=Sunday … 6=Saturday)
    days: { 0: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: false },
};

const DEFAULT_LIMITS = {
    dailyLimit: 50,
    emailGap: 10, // minutes between sends
};

function authHeaders(): Record<string, string> {
    const apiKey = process.env.INSTANTLY_API_KEY;
    if (!apiKey) throw new Error("Missing INSTANTLY_API_KEY env var");
    return {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
    };
}

async function instantlyFetch<T>(
    path: string,
    init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
    const { timeoutMs = 30000, ...rest } = init;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(`${INSTANTLY_API_BASE}${path}`, {
            ...rest,
            headers: { ...authHeaders(), ...(rest.headers ?? {}) },
            signal: controller.signal,
        });

        const text = await res.text();
        let body: unknown;
        try {
            body = text ? JSON.parse(text) : {};
        } catch {
            body = text;
        }

        if (!res.ok) {
            const detail =
                typeof body === "object" && body && "error" in body
                    ? (body as { error: unknown }).error
                    : body;
            throw new InstantlyError(
                `Instantly ${res.status} on ${path}: ${JSON.stringify(detail)}`,
                res.status,
            );
        }

        return body as T;
    } finally {
        clearTimeout(timer);
    }
}

export class InstantlyError extends Error {
    constructor(
        message: string,
        public status: number,
    ) {
        super(message);
        this.name = "InstantlyError";
    }
}

export interface CreateCampaignOptions {
    name: string;
    sequenceSubject: string;
    sequenceBody: string;
    senderEmail?: string;
}

export interface InstantlyCampaign {
    id: string;
}

/**
 * Create a draft campaign with a single email step. The campaign starts in
 * Draft status (0) — call activateCampaign to flip it to Active.
 */
export async function createCampaign(
    opts: CreateCampaignOptions,
): Promise<InstantlyCampaign> {
    const sender = opts.senderEmail ?? DEFAULT_SENDER_EMAIL;

    const payload = {
        name: opts.name,
        campaign_schedule: {
            schedules: [
                {
                    name: "Default schedule",
                    timing: {
                        from: DEFAULT_SCHEDULE.fromTime,
                        to: DEFAULT_SCHEDULE.toTime,
                    },
                    days: DEFAULT_SCHEDULE.days,
                    timezone: DEFAULT_SCHEDULE.timezone,
                },
            ],
        },
        email_list: [sender],
        daily_limit: DEFAULT_LIMITS.dailyLimit,
        email_gap: DEFAULT_LIMITS.emailGap,
        stop_on_reply: true,
        stop_on_auto_reply: true,
        link_tracking: true,
        open_tracking: true,
        sequences: [
            {
                steps: [
                    {
                        type: "email",
                        delay: 0,
                        variants: [
                            {
                                subject: opts.sequenceSubject,
                                body: opts.sequenceBody,
                            },
                        ],
                    },
                ],
            },
        ],
    };

    const res = await instantlyFetch<{ id?: string; campaign_id?: string }>(
        "/campaigns",
        { method: "POST", body: JSON.stringify(payload) },
    );

    const id = res.id ?? res.campaign_id;
    if (!id) throw new InstantlyError("Campaign create returned no id", 500);
    return { id };
}

export async function activateCampaign(campaignId: string): Promise<void> {
    await instantlyFetch(`/campaigns/${campaignId}/activate`, { method: "POST" });
}

export interface AddLeadOptions {
    campaignId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    /** Per-lead string injected into sequence body via {{personalization}} */
    personalization: string;
}

export interface InstantlyLead {
    id: string;
}

export async function addLeadToCampaign(opts: AddLeadOptions): Promise<InstantlyLead> {
    const payload: Record<string, unknown> = {
        email: opts.email,
        campaign: opts.campaignId,
        personalization: opts.personalization,
    };
    if (opts.firstName) payload.first_name = opts.firstName;
    if (opts.lastName) payload.last_name = opts.lastName;
    if (opts.companyName) payload.company_name = opts.companyName;

    const res = await instantlyFetch<{ id: string }>("/leads", {
        method: "POST",
        body: JSON.stringify(payload),
    });

    if (!res.id) throw new InstantlyError("Lead create returned no id", 500);
    return { id: res.id };
}

export interface RegisterWebhookOptions {
    targetHookUrl: string;
    eventType?: string; // omit or "all_events"
    name?: string;
    campaignId?: string;
}

export interface InstantlyWebhook {
    id: string;
    target_hook_url: string;
    event_type: string | null;
}

export async function registerWebhook(
    opts: RegisterWebhookOptions,
): Promise<InstantlyWebhook> {
    const payload: Record<string, unknown> = {
        target_hook_url: opts.targetHookUrl,
        event_type: opts.eventType ?? "all_events",
    };
    if (opts.name) payload.name = opts.name;
    if (opts.campaignId) payload.campaign = opts.campaignId;

    const res = await instantlyFetch<InstantlyWebhook>("/webhooks", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return res;
}
