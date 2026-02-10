"use server"

import { reprocessFailedWebhooks } from "@/lib/services/everlytic";

export interface ReprocessActionResult {
    success: boolean;
    error?: string;
    errorCode?: string;
    details?: any;
}

function parseError(error: string | undefined): { error: string; errorCode: string } {
    if (!error) return { error: "Unknown error", errorCode: "UNKNOWN" }

    if (error.includes("timeout") || error.includes("ETIMEDOUT")) {
        return { error: "Request timed out. Everlytic may be busy.", errorCode: "TIMEOUT" }
    }
    if (error.includes("ENOTFOUND") || error.includes("getaddrinfo")) {
        return { error: "Unable to connect to Everlytic", errorCode: "CONNECTION_ERROR" }
    }
    if (error.includes("401") || error.includes("Unauthorized")) {
        return { error: "Authentication failed", errorCode: "AUTH_FAILED" }
    }

    return { error, errorCode: "REPROCESS_FAILED" }
}

export async function reprocessWebhooksAction(): Promise<ReprocessActionResult> {
    try {
        const result = await reprocessFailedWebhooks();

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
