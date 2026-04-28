"use server";

import { registerWebhook, InstantlyError } from "@/lib/services/instantly";

export interface RegisterWebhookResult {
    success: boolean;
    webhookId?: string;
    targetUrl?: string;
    error?: string;
}

export async function registerInstantlyWebhookAction(): Promise<RegisterWebhookResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const secret = process.env.INSTANTLY_WEBHOOK_SECRET;

    if (!appUrl) return { success: false, error: "Missing NEXT_PUBLIC_APP_URL" };
    if (!secret) {
        return {
            success: false,
            error:
                "Missing INSTANTLY_WEBHOOK_SECRET. Generate one (e.g. `openssl rand -hex 32`) and add it to env before registering.",
        };
    }

    const targetUrl = `${appUrl.replace(/\/$/, "")}/api/instantly/webhook?secret=${encodeURIComponent(secret)}`;

    try {
        const result = await registerWebhook({
            targetHookUrl: targetUrl,
            eventType: "all_events",
            name: "salesmatter-all-events",
        });
        return { success: true, webhookId: result.id, targetUrl };
    } catch (err) {
        const message =
            err instanceof InstantlyError
                ? err.message
                : err instanceof Error
                    ? err.message
                    : "Unknown error";
        return { success: false, error: message };
    }
}
