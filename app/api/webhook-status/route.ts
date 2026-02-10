/**
 * Webhook Status API
 * Returns the current webhook registration status from Everlytic
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import https from "https"

// Helper function to make HTTPS requests with IPv4 preference
function httpsRequest(
    url: string,
    options: https.RequestOptions,
    timeoutMs: number = 15000
): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url)

        const req = https.request(
            {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: options.method || "GET",
                headers: options.headers,
                family: 4, // Force IPv4
                timeout: timeoutMs,
            },
            (res) => {
                let body = ""
                res.on("data", (chunk) => (body += chunk))
                res.on("end", () => {
                    resolve({ statusCode: res.statusCode || 500, body })
                })
            }
        )

        req.on("error", reject)
        req.on("timeout", () => {
            req.destroy()
            reject(new Error("Request timeout"))
        })

        req.end()
    })
}

function getSupabase() {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        return null
    }

    return createClient(url, key)
}

export async function GET() {
    try {
        const username = process.env.EVERLYTIC_USERNAME
        const password = process.env.EVERLYTIC_PASSWORD

        // Check if credentials are configured
        if (!username || !password) {
            return NextResponse.json({
                registered: false,
                enabled: false,
                url: null,
                lastEventAt: null,
                eventTypes: [],
                error: "Everlytic credentials not configured",
                errorCode: "MISSING_CREDENTIALS"
            })
        }

        const authString = Buffer.from(`${username}:${password}`).toString("base64")

        // Fetch webhooks from Everlytic
        let webhookData = null
        try {
            const response = await httpsRequest(
                "https://api.everlytic.net/transactional/email/v1/webhooks",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Basic ${authString}`,
                    },
                }
            )

            if (response.statusCode === 401) {
                return NextResponse.json({
                    registered: false,
                    enabled: false,
                    url: null,
                    lastEventAt: null,
                    eventTypes: [],
                    error: "Authentication failed with Everlytic",
                    errorCode: "AUTH_FAILED"
                })
            }

            if (response.statusCode >= 400) {
                return NextResponse.json({
                    registered: false,
                    enabled: false,
                    url: null,
                    lastEventAt: null,
                    eventTypes: [],
                    error: `Everlytic API error: ${response.statusCode}`,
                    errorCode: "API_ERROR"
                })
            }

            webhookData = JSON.parse(response.body)
        } catch (err: any) {
            const isTimeout = err?.message?.includes("timeout")
            const isNetwork = err?.message?.includes("ENOTFOUND") || err?.code === "ENOTFOUND"

            return NextResponse.json({
                registered: false,
                enabled: false,
                url: null,
                lastEventAt: null,
                eventTypes: [],
                error: err?.message || "Failed to connect to Everlytic",
                errorCode: isTimeout ? "TIMEOUT" : isNetwork ? "CONNECTION_ERROR" : "UNKNOWN"
            })
        }

        // Find our webhook
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const webhookUrl = `${appUrl}/api/everlytic/webhook`

        const ourWebhook = webhookData?.data?.find((w: any) =>
            w.url?.includes("/api/everlytic/webhook")
        )

        // Get last event timestamp from database
        let lastEventAt: string | null = null
        const supabase = getSupabase()

        if (supabase) {
            try {
                const { data: lastEvent } = await supabase
                    .from("email_events")
                    .select("created_at")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single()

                lastEventAt = lastEvent?.created_at || null
            } catch {
                // Ignore errors - table might not exist yet
            }
        }

        if (ourWebhook) {
            return NextResponse.json({
                registered: true,
                enabled: ourWebhook.status === "enabled",
                url: ourWebhook.url,
                lastEventAt,
                eventTypes: ourWebhook.event_types || [],
            })
        }

        return NextResponse.json({
            registered: false,
            enabled: false,
            url: null,
            lastEventAt,
            eventTypes: [],
        })

    } catch (error: any) {
        console.error("[webhook-status] Error:", error)
        return NextResponse.json({
            registered: false,
            enabled: false,
            url: null,
            lastEventAt: null,
            eventTypes: [],
            error: error?.message || "Internal server error",
            errorCode: "UNKNOWN"
        }, { status: 500 })
    }
}
