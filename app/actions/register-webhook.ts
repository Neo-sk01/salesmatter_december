'use server'

import { registerWebhook } from "@/lib/services/everlytic";

export interface WebhookActionResult {
    success: boolean;
    error?: string;
    errorCode?: string;
    details?: any;
}

function parseError(error: string | undefined): { error: string; errorCode: string } {
    if (!error) return { error: "Unknown error", errorCode: "UNKNOWN" }

    if (error.includes("Missing") || error.includes("credentials")) {
        return { error, errorCode: "MISSING_CREDENTIALS" }
    }
    if (error.includes("401") || error.includes("Unauthorized")) {
        return { error: "Authentication failed with Everlytic", errorCode: "AUTH_FAILED" }
    }
    if (error.includes("timeout") || error.includes("ETIMEDOUT")) {
        return { error: "Request timed out", errorCode: "TIMEOUT" }
    }
    if (error.includes("ENOTFOUND") || error.includes("getaddrinfo")) {
        return { error: "Unable to connect to Everlytic", errorCode: "CONNECTION_ERROR" }
    }

    return { error, errorCode: "REGISTRATION_FAILED" }
}

export async function registerWebhookAction(): Promise<WebhookActionResult> {
    try {
        const result = await registerWebhook();

        if (!result.success) {
            const parsed = parseError(result.error)
            return {
                success: false,
                error: parsed.error,
                errorCode: parsed.errorCode
            }
        }

        return {
            success: true,
            details: result.details
        }
    } catch (err: any) {
        const parsed = parseError(err?.message)
        return {
            success: false,
            error: parsed.error,
            errorCode: parsed.errorCode
        }
    }
}
